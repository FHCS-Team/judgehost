# Queue System Specification

This document describes the submission queue system and job scheduling logic in the judgehost.

---

## Overview

The judgehost uses a priority-based job queue to manage submission evaluation. The queue system ensures fair resource allocation, prioritizes urgent submissions, and provides visibility into evaluation status.

**Current Implementation**: Single-worker architecture where the judgehost process directly manages Docker containers.

**Future Extensibility**: The architecture is designed to support multi-worker distribution and Kubernetes integration, where workers would be separate processes/pods managing containers independently.

---

## Queue Architecture

**Current (Single-Worker)**:

```
┌────────────────────────────────────────────────────┐
│                  Submission Queue                  │
│                                                    │
│  ┌──────────────────────────────────────────────┐  │
│  │  Priority 10 (Critical)                      │  │
│  │  [sub_001] [sub_002]                         │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Priority 7-9 (High)                         │  │
│  │  [sub_003] [sub_004] [sub_005]               │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Priority 4-6 (Normal) - Default             │  │
│  │  [sub_006] [sub_007] [sub_008] [sub_009]     │  │
│  └──────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────┐  │
│  │  Priority 1-3 (Low)                          │  │
│  │  [sub_010] [sub_011]                         │  │
│  └──────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────┘
                         │
                         ▼
              ┌────────────────────┐
              │  Judgehost Process │
              │  (Single Worker)   │
              │                    │
              │  ┌──────────────┐  │
              │  │ Manages up to│  │
              │  │ N concurrent │  │
              │  │  containers  │  │
              │  └──────────────┘  │
              │                    │
              │  Running: sub_001  │
              │  Running: sub_003  │
              │  Running: sub_006  │
              └────────────────────┘
                       │
                       ▼
          Docker Containers (Evaluations)
```

**Note**: Currently, `JUDGEHOST_MAX_WORKERS` controls the maximum number of concurrent container evaluations within a single judgehost process, not separate worker processes.

---

## Queue Behavior

### Submission Lifecycle States

```
queued → running → completed
          ↓
       cancelled
          ↓
        failed
```

1. **`queued`** - Submission accepted, waiting for worker
2. **`running`** - Evaluation in progress
3. **`completed`** - Evaluation finished successfully
4. **`failed`** - Evaluation failed with error
5. **`cancelled`** - User cancelled submission

---

## Priority System

### Priority Levels (1-10)

| Priority | Level    | Description                            | Use Cases                         |
| -------- | -------- | -------------------------------------- | --------------------------------- |
| 10       | Critical | Immediate execution, preempt if needed | Admin tasks, system health checks |
| 7-9      | High     | Expedited processing                   | Contest submissions, VIP teams    |
| 4-6      | Normal   | Standard processing (default = 5)      | Regular submissions               |
| 1-3      | Low      | Background tasks                       | Batch evaluations, re-evaluations |

### Priority Calculation

**Default Priority**: 5 (Normal)

**Priority can be influenced by**:

- Explicit `priority` field in submission request (set by DOMserver)
- Problem complexity
- Queue saturation
- Team priority (if configured)

### Priority Queue Rules

1. **Higher priority submissions are dequeued first**
2. **Within same priority, FIFO order is used**
3. **Priority 10 submissions can preempt running jobs** (optional, configurable)
4. **Priority adjustments** - System can dynamically adjust priority based on wait time

---

## Concurrency Control

### Current Implementation (Single-Worker)

The judgehost process directly manages Docker containers with a concurrency limit:

**Environment Variables**:

```bash
# Maximum concurrent container evaluations
JUDGEHOST_MAX_WORKERS=3

# Maximum memory allocation across all containers (MB)
JUDGEHOST_MAX_MEMORY_MB=8192

# Maximum CPU allocation across all containers (cores)
JUDGEHOST_MAX_CPU_CORES=8.0
```

**How it works**:

- The judgehost maintains a pool of concurrent container evaluations
- `MAX_WORKERS` limits how many containers can run simultaneously
- Resource limits apply to the total across all running containers
- The main process orchestrates container lifecycle (create, start, monitor, cleanup)

### Future: Multi-Worker Architecture

The system is designed to evolve towards distributed workers:

**Potential Architecture**:

```
        Queue Service
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
Worker 1  Worker 2  Worker 3
  │         │         │
  └─────────┴─────────┘
         Docker / K8s
```

**Design Considerations for Future**:

- Workers as separate processes or Kubernetes pods
- Workers claim jobs from shared queue (Redis, database, or message broker)
- Each worker manages its own container lifecycle
- Resource allocation tracked centrally or per-worker
- Queue system would need distributed locking and job claiming mechanism

### Resource-Based Scheduling

**Current Implementation**: The queue scheduler tracks resource usage across concurrent container evaluations:

```javascript
// Pseudo-code (current single-worker implementation)
function canScheduleSubmission(submission) {
  const availableMemory = MAX_MEMORY - currentUsedMemory;
  const availableCpu = MAX_CPU - currentUsedCpu;
  const runningContainers = getCurrentlyRunningContainers();

  return (
    runningContainers.length < MAX_WORKERS &&
    submission.memory_required <= availableMemory &&
    submission.cpu_required <= availableCpu
  );
}
```

**Example Scenario** (Current):

- MAX_WORKERS = 3
- MAX_MEMORY = 8192 MB
- MAX_CPU = 8.0 cores

```
Current State:
- Container 1: Running (2048 MB, 2.0 cores) - sub_001
- Container 2: Running (1024 MB, 1.0 cores) - sub_003
- Slot 3: Available

Available: 5120 MB, 5.0 cores, 1 container slot

Next in queue:
- sub_001: needs 4096 MB, 4.0 cores ✓ Can schedule
- sub_002: needs 6144 MB, 2.0 cores ✗ Not enough memory (wait)
```

---

## Queue Operations

### Enqueue Submission

When a submission is received:

1. **Validate** - Check problem exists, submission is valid
2. **Calculate Priority** - Determine queue priority
3. **Estimate Resources** - Get required memory/CPU from problem config
4. **Insert to Queue** - Place in priority-sorted queue
5. **Return Position** - Inform caller of queue position

**Response includes**:

- `submission_id`
- `status`: "queued"
- `queue_position`: Position in queue
- `estimated_start_time`: When evaluation likely to start
- `estimated_completion_time`: When evaluation likely to complete

### Dequeue Submission

The judgehost picks next submission when:

1. **Container slot becomes available** (previous evaluation completed)
2. **Resources are available** (memory/CPU within limits)
3. **Queue is not empty**

**Selection Algorithm** (current):

```javascript
// Simplified selection logic
function selectNextSubmission(queue, availableResources) {
  // Sort by priority (desc), then by queued_at (asc)
  const sorted = queue.sort((a, b) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // Higher priority first
    }
    return a.queued_at - b.queued_at; // Earlier submission first
  });

  // Find first submission that fits available resources
  for (const submission of sorted) {
    if (fitsResources(submission, availableResources)) {
      return submission;
    }
  }

  return null; // No suitable submission found
}
```

---

## Time Estimation

### Estimated Start Time

Based on:

- Current queue position
- Average evaluation time for similar problems
- Current worker availability

```javascript
estimatedStartTime =
  currentTime +
  (queuePositionAhead * averageEvaluationTime) / maxConcurrentContainers;
```

### Estimated Completion Time

```javascript
estimatedCompletionTime = estimatedStartTime + problemTimeoutSeconds * 1.2; // Add 20% buffer
```

---

## Queue Limits

### Maximum Queue Size

Configured via environment variable:

```bash
JUDGEHOST_MAX_QUEUE_SIZE=100
```

When queue is full:

- New submissions return `503 Service Unavailable`
- Response includes `retry_after_seconds`

### Per-Team Rate Limiting

Optional rate limiting per team:

```bash
JUDGEHOST_RATE_LIMIT_ENABLED=true
JUDGEHOST_RATE_LIMIT_PER_TEAM=10  # submissions per minute
```

When rate limit exceeded:

- Return `429 Too Many Requests`
- Response includes `retry_after_seconds`

---

## Queue Monitoring

### Queue Status Endpoint

**GET /queue/status**

Returns current queue state:

```json
{
  "queue_size": 15,
  "max_queue_size": 100,
  "utilization_percent": 15.0,
  "by_priority": {
    "10": 0,
    "7-9": 3,
    "4-6": 10,
    "1-3": 2
  },
  "workers": {
    "total": 3,
    "busy": 2,
    "idle": 1
  },
  "resources": {
    "memory": {
      "used_mb": 3072,
      "available_mb": 5120,
      "total_mb": 8192,
      "utilization_percent": 37.5
    },
    "cpu": {
      "used_cores": 3.0,
      "available_cores": 5.0,
      "total_cores": 8.0,
      "utilization_percent": 37.5
    }
  },
  "average_wait_time_seconds": 45,
  "average_evaluation_time_seconds": 285
}
```

### Queue Metrics

Tracked metrics:

- Queue size over time
- Average wait time
- Average evaluation time
- Worker utilization
- Resource utilization
- Submissions per hour
- Failure rate

---

## Queue Persistence

### In-Memory Queue (Default)

- Fast, no disk I/O
- Lost on judgehost restart
- Suitable for most use cases

### Persistent Queue (Optional)

Configure with:

```bash
JUDGEHOST_QUEUE_PERSISTENCE=true
JUDGEHOST_QUEUE_DB_PATH=/var/lib/judgehost/queue.db
```

Benefits:

- Survives judgehost restarts
- Recovery from crashes
- Audit trail

**On restart**:

1. Load queued submissions from database
2. Mark any "running" submissions as "failed" with reason "judgehost_restart"
3. Resume processing queue

---

## Queue Events

The queue emits events for monitoring and logging:

### Event Types

```javascript
queueEvents.on("submission:queued", (submission) => {
  // Submission added to queue
});

queueEvents.on("submission:dequeued", (submission) => {
  // Submission selected for evaluation
});

queueEvents.on("submission:started", (submission) => {
  // Evaluation started
});

queueEvents.on("submission:completed", (submission, result) => {
  // Evaluation completed successfully
});

queueEvents.on("submission:failed", (submission, error) => {
  // Evaluation failed
});

queueEvents.on("submission:cancelled", (submission) => {
  // Submission cancelled by user
});

queueEvents.on("queue:full", (queueSize) => {
  // Queue reached max size
});

queueEvents.on("worker:idle", (workerId) => {
  // Worker became available
});
```

---

## Error Handling

### Evaluation Failures

When evaluation fails:

1. **Mark submission as failed**
2. **Log error details**
3. **Free worker and resources**
4. **Notify via webhook** (if configured)
5. **Do NOT retry automatically** (DOMserver decides on retry)

### System Errors

When judgehost encounters system errors:

1. **Docker unavailable** - Pause queue, wait for Docker
2. **Out of memory** - Reject submissions until resources free
3. **Worker crash** - Mark running submission as failed, restart worker

---

## Queue API Summary

| Endpoint           | Method | Description                                   |
| ------------------ | ------ | --------------------------------------------- |
| `/submissions`     | POST   | Add submission to queue                       |
| `/submissions/:id` | GET    | Get submission status                         |
| `/submissions/:id` | PUT    | Update queued submission (priority, metadata) |
| `/submissions/:id` | DELETE | Cancel submission                             |
| `/queue/status`    | GET    | Get queue status                              |
| `/queue/stats`     | GET    | Get queue statistics                          |

---

## Configuration Reference

### Environment Variables

```bash
# Concurrency Configuration (Current: Single-Worker)
JUDGEHOST_MAX_WORKERS=3                    # Max concurrent container evaluations
JUDGEHOST_MAX_MEMORY_MB=8192               # Total memory limit across containers
JUDGEHOST_MAX_CPU_CORES=8.0                # Total CPU limit across containers

# Queue Configuration
JUDGEHOST_MAX_QUEUE_SIZE=100               # Max queued submissions
JUDGEHOST_QUEUE_PERSISTENCE=false          # Enable persistence
JUDGEHOST_QUEUE_DB_PATH=/var/lib/judgehost/queue.db

# Rate Limiting
JUDGEHOST_RATE_LIMIT_ENABLED=false         # Enable rate limiting
JUDGEHOST_RATE_LIMIT_PER_TEAM=10           # Submissions per minute per team

# Priority Configuration
JUDGEHOST_ALLOW_PREEMPTION=false           # Allow priority 10 to preempt
JUDGEHOST_DEFAULT_PRIORITY=5               # Default submission priority

# Time Estimation
JUDGEHOST_ESTIMATION_BUFFER=1.2            # 20% time buffer for estimates
```

**Note on Terminology**:

- Current: `MAX_WORKERS` = maximum concurrent containers within single judgehost process
- Future: May represent actual separate worker processes/pods in distributed architecture

---

## Future Architecture Considerations

### Multi-Worker Distribution

**Planned Features** (not yet implemented):

1. **Separate Worker Processes**

   - Workers as independent processes or Kubernetes pods
   - Each worker manages its own Docker daemon or K8s namespace
   - Workers communicate via shared queue backend (Redis, RabbitMQ, or database)

2. **Job Claiming Mechanism**

   ```javascript
   // Future worker loop
   while (true) {
     const job = await queue.claimNext(workerId);
     if (job) {
       await evaluateSubmission(job);
       await queue.markComplete(job.id);
     }
   }
   ```

3. **Resource Allocation Strategies**
   - **Per-worker limits**: Each worker has fixed resource allocation
   - **Centralized scheduling**: Coordinator assigns jobs based on worker capacity
   - **Dynamic scaling**: Auto-scale workers based on queue depth (K8s HPA)

### Kubernetes Integration

**Future Possibilities** (design-ready, not implemented):

1. **Container Orchestration**

   - Evaluation containers as Kubernetes Jobs
   - Problem images as base container images
   - Persistent volumes for problem resources and results

2. **Architecture Options**:

   **Option A: Judgehost as K8s Controller**

   ```
   Judgehost Pod → Creates K8s Jobs → Evaluation Pods
   ```

   **Option B: Distributed Workers**

   ```
   Multiple Judgehost Pods → Shared Queue (Redis) → Each creates Jobs
   ```

3. **Resource Management**

   - Use K8s resource requests/limits instead of Docker constraints
   - Node affinity for GPU/specialized hardware
   - Pod priority classes for critical evaluations

4. **Configuration Example** (future):
   ```yaml
   apiVersion: batch/v1
   kind: Job
   metadata:
     name: eval-sub-123
   spec:
     template:
       spec:
         containers:
           - name: evaluator
             image: eval-sub-123:latest
             resources:
               limits:
                 memory: "1Gi"
                 cpu: "1.5"
   ```

### Cloud-Hosted Kubernetes

**Considerations for GKE/EKS/AKS**:

1. **Storage**: Use persistent volumes for problem images and results
2. **Networking**: Private cluster for security, external ingress for API
3. **Scaling**: Horizontal pod autoscaling based on queue length
4. **Costs**: Preemptible/spot instances for non-critical evaluations
5. **Multi-region**: Distribute workers geographically for contests

**Environment Variables** (future):

```bash
# Kubernetes Mode (not yet implemented)
JUDGEHOST_ORCHESTRATOR=kubernetes         # docker | kubernetes
JUDGEHOST_K8S_NAMESPACE=judgehost-eval    # K8s namespace for jobs
JUDGEHOST_K8S_NODE_SELECTOR=type=compute  # Node selector for eval pods
JUDGEHOST_K8S_SERVICE_ACCOUNT=judgehost   # Service account for job creation
```

---

## Best Practices

### Current (Single-Worker)

1. **Set appropriate concurrency limits** based on hardware capabilities
2. **Enable persistence** for production environments
3. **Monitor queue metrics** to identify bottlenecks
4. **Use priorities wisely** - too many high-priority submissions defeat the purpose
5. **Configure rate limiting** to prevent abuse
6. **Set reasonable queue size** to avoid memory issues
7. **Test with load** to determine optimal concurrency limit

### Future (Multi-Worker / Kubernetes)

1. **Design for distributed state** - Queue backend must support multiple workers
2. **Implement job claiming** - Prevent multiple workers from processing same submission
3. **Handle worker failures** - Dead workers should release claimed jobs
4. **Monitor per-worker metrics** - Track individual worker health and performance
5. **Plan for auto-scaling** - Define scaling policies based on queue depth
6. **Consider costs** - Cloud resources can get expensive with many workers

---

## See Also

- [`[API] ADD_SUBMISSION.md`](%5BAPI%5D%20ADD_SUBMISSION.md) - Submission API documentation
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container resource management
- [`[GUIDE] MONITORING.md`](%5BGUIDE%5D%20MONITORING.md) - Queue monitoring and alerting
