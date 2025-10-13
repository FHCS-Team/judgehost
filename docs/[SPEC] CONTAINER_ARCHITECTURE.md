# Container Architecture Specification

This document describes the two-stage container architecture and multi-container problem support in the judgehost.

---

## Overview

The judgehost uses a **two-stage container architecture**:

1. **Problem Image** - Base image with problem resources (built once per problem)
2. **Evaluation Image** - Built on top of problem image with submission code (built per submission)

This architecture provides:

- **Faster evaluation** - Problem setup done once, reused for all submissions
- **Isolation** - Each submission runs in its own container
- **Flexibility** - Different container configurations for problem vs evaluation
- **Multi-container support** - Complex applications with multiple services

**Current Implementation**: Docker-based containers managed directly by the judgehost process.

**Future Extensibility**: Architecture is designed to support Kubernetes orchestration, including cloud-hosted clusters (GKE, EKS, AKS), enabling distributed workers and auto-scaling.

---

## Two-Stage Container Architecture

### Stage 1: Problem Image

**Built when**: Problem is registered via `POST /problems`

**Purpose**:

- Contains problem resources (hooks, test data, evaluation scripts)
- Installs dependencies needed for evaluation
- Sets up base environment

**Example Dockerfile for Problem Image**:

```dockerfile
# Problem Image: rest-api-users
FROM node:20-alpine

# Install evaluation tools
RUN apk add --no-cache curl jq bash

# Copy problem resources
COPY hooks/ /hooks/
COPY data/ /data/
COPY tools/ /tools/

# Install test dependencies
WORKDIR /problem
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Problem image is ready
# Submission will be added in evaluation stage
```

**Image Tag**: `problem-{problem_id}:latest`

**Config Applied**:

- Problem resource limits (full network access, higher resources)
- All ports exposed
- Full filesystem access

---

### Stage 2: Evaluation Image

**Built when**: Submission is evaluated

**Purpose**:

- Extends problem image with submission code
- Applies stricter security constraints
- Configures submission-specific environment

**Example Dockerfile for Evaluation Image** (generated dynamically):

```dockerfile
# Evaluation Image: extends problem image
FROM problem-rest-api-users:latest

# Copy submission code
COPY submission/ /workspace/

# Set working directory
WORKDIR /workspace

# Install submission dependencies (if needed)
RUN if [ -f package.json ]; then npm ci; fi

# Set entrypoint to universal entrypoint
ENTRYPOINT ["/tools/universal_entrypoint.sh"]
CMD ["npm", "start"]
```

**Image Tag**: `eval-{submission_id}:latest`

**Config Applied**:

- Evaluation resource limits (may be more restrictive)
- Network disabled (unless required by problem)
- Read-only filesystem (except /tmp and /out)
- Security constraints (no privileged mode, dropped capabilities)

---

## Configuration Differences

### Problem Image Configuration

```json
{
  "resource_limits": {
    "memory_mb": 2048,
    "cpu_cores": 2.0,
    "disk_mb": 4096,
    "network_enabled": true,
    "timeout_seconds": 600
  },
  "security": {
    "privileged": false,
    "capabilities": ["NET_ADMIN"],
    "read_only_rootfs": false
  }
}
```

**Rationale**: Need flexibility to download dependencies, set up test environment

---

### Evaluation Image Configuration

```json
{
  "resource_limits": {
    "memory_mb": 1024,
    "cpu_cores": 1.5,
    "disk_mb": 2048,
    "network_enabled": false, // Can be disabled even if problem image had it
    "timeout_seconds": 300
  },
  "security": {
    "privileged": false,
    "capabilities": [], // Drop all capabilities
    "read_only_rootfs": true // Read-only except /tmp and /out
  }
}
```

**Rationale**: Restrict submission to prevent cheating, enforce resource limits

---

## Container Lifecycle

```
┌─────────────────────────────────────────────────────────┐
│ 1. Problem Registration                                 │
│    POST /problems                                       │
│    ├─ Validate problem package                          │
│    ├─ Build problem image (Stage 1)                     │
│    └─ Tag: problem-{problem_id}:latest                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Submission Received                                  │
│    POST /submissions                                    │
│    ├─ Download submission                               │
│    ├─ Generate Dockerfile (extends problem image)       │
│    ├─ Build evaluation image (Stage 2)                  │
│    └─ Tag: eval-{submission_id}:latest                  │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Create & Start Container                             │
│    ├─ Create container from evaluation image            │
│    ├─ Apply evaluation config (network, resources)      │
│    ├─ Mount /out volume for results                     │
│    └─ Start container                                   │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Container Execution                                  │
│    ├─ Pre-execution hooks                               │
│    ├─ Start application                                 │
│    ├─ Evaluation hooks (post + periodic)                │
│    └─ Collect results from /out                         │
└─────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Cleanup                                              │
│    ├─ Stop container                                    │
│    ├─ Collect logs                                      │
│    ├─ Remove container                                  │
│    └─ Remove evaluation image (optional)                │
└─────────────────────────────────────────────────────────┘
```

---

## Multi-Container Problems

For complex applications requiring multiple services (e.g., frontend + backend + database).

### Problem Package Structure (Multi-Container)

```
problem-package/
├── config.json                    # Global problem configuration
├── docker-compose.yml             # Service orchestration
├── services/                      # Service-specific configurations
│   ├── frontend/
│   │   ├── Dockerfile             # Frontend problem image
│   │   └── hooks/
│   │       ├── pre/
│   │       └── post/
│   ├── backend/
│   │   ├── Dockerfile             # Backend problem image
│   │   └── hooks/
│   │       ├── pre/
│   │       └── post/
│   └── database/
│       ├── Dockerfile             # Database problem image
│       └── init.sql               # Database initialization
├── hooks/                         # Global hooks (run on orchestrator)
│   ├── pre/                       # Before any service starts
│   └── post/                      # After all services ready
└── data/                          # Shared test data
```

### Multi-Container config.json

```json
{
  "problem_id": "full-stack-todo",
  "problem_name": "Full-Stack Todo Application",
  "project_type": "full_stack_web",
  "multi_container": true,
  "services": [
    {
      "name": "frontend",
      "type": "web_ui",
      "dockerfile": "services/frontend/Dockerfile",
      "resource_limits": {
        "memory_mb": 512,
        "cpu_cores": 1.0
      },
      "ports": [3000],
      "network_enabled": true,
      "submission_target": true // Submission code goes here
    },
    {
      "name": "backend",
      "type": "api",
      "dockerfile": "services/backend/Dockerfile",
      "resource_limits": {
        "memory_mb": 1024,
        "cpu_cores": 1.5
      },
      "ports": [8080],
      "network_enabled": true,
      "submission_target": true // Submission can also go here
    },
    {
      "name": "database",
      "type": "postgres",
      "dockerfile": "services/database/Dockerfile",
      "resource_limits": {
        "memory_mb": 512,
        "cpu_cores": 0.5
      },
      "ports": [5432],
      "network_enabled": true,
      "submission_target": false // No submission code, just infrastructure
    }
  ],
  "rubrics": [
    {
      "id": "ui_functionality",
      "name": "UI Functionality",
      "rubric_type": "ui_tests",
      "max_score": 30,
      "target_service": "frontend"
    },
    {
      "id": "api_correctness",
      "name": "API Correctness",
      "rubric_type": "api_endpoints",
      "max_score": 40,
      "target_service": "backend"
    },
    {
      "id": "database_integration",
      "name": "Database Integration",
      "rubric_type": "database_validation",
      "max_score": 30,
      "target_service": "backend"
    }
  ]
}
```

### docker-compose.yml (Example)

```yaml
version: "3.8"

services:
  database:
    build:
      context: ./services/database
      dockerfile: Dockerfile
    image: problem-full-stack-todo-database:latest
    environment:
      POSTGRES_USER: testuser
      POSTGRES_PASSWORD: testpass
      POSTGRES_DB: testdb
    networks:
      - eval-network
    volumes:
      - db-data:/var/lib/postgresql/data

  backend:
    build:
      context: ./services/backend
      dockerfile: Dockerfile
    image: problem-full-stack-todo-backend:latest
    depends_on:
      - database
    environment:
      DATABASE_URL: postgres://testuser:testpass@database:5432/testdb
      PORT: 8080
    ports:
      - "8080:8080"
    networks:
      - eval-network

  frontend:
    build:
      context: ./services/frontend
      dockerfile: Dockerfile
    image: problem-full-stack-todo-frontend:latest
    depends_on:
      - backend
    environment:
      REACT_APP_API_URL: http://backend:8080
      PORT: 3000
    ports:
      - "3000:3000"
    networks:
      - eval-network

networks:
  eval-network:
    driver: bridge
    internal: true # No external network access

volumes:
  db-data:
```

---

## Submission Handling for Multi-Container Problems

### Option 1: Single Package to One Service

Submission is loaded into one designated service (e.g., backend only).

**Submission Request**:

```json
{
  "problem_id": "full-stack-todo",
  "submission_source": "git",
  "git_url": "https://github.com/team/backend-solution.git",
  "target_service": "backend"
}
```

**Behavior**:

- Build problem images for all services
- Build evaluation image for backend with submission code
- Use problem images as-is for other services

---

### Option 2: Multiple Packages to Multiple Services

Submission contains code for multiple services.

**Submission Package Structure**:

```
submission.zip
├── frontend/
│   ├── src/
│   ├── public/
│   └── package.json
└── backend/
    ├── src/
    ├── tests/
    └── package.json
```

**Submission Request**:

```json
{
  "problem_id": "full-stack-todo",
  "submission_source": "url",
  "archive_url": "https://cdn.example.com/submissions/team-42.zip",
  "multi_service_submission": true,
  "service_mappings": [
    {
      "service": "frontend",
      "path": "frontend/"
    },
    {
      "service": "backend",
      "path": "backend/"
    }
  ]
}
```

**Behavior**:

- Extract submission archive
- Build evaluation image for each target service with its respective code
- Use problem images for non-target services

---

### Option 3: Multiple Git Repositories

**Submission Request**:

```json
{
  "problem_id": "full-stack-todo",
  "submission_source": "multi_git",
  "repositories": [
    {
      "service": "frontend",
      "git_url": "https://github.com/team/frontend-solution.git"
    },
    {
      "service": "backend",
      "git_url": "https://github.com/team/backend-solution.git"
    }
  ]
}
```

---

## Network Configuration

### Problem Image Network (Stage 1)

**Full network access** for downloading dependencies:

```javascript
{
  "HostConfig": {
    "NetworkMode": "bridge",  // Full network access
    "PublishAllPorts": true
  }
}
```

---

### Evaluation Network (Stage 2)

#### Single Container

**Network disabled** (default for algorithm problems):

```javascript
{
  "HostConfig": {
    "NetworkMode": "none"  // No network access
  }
}
```

**Network enabled** (for web_api, etc.):

```javascript
{
  "HostConfig": {
    "NetworkMode": "bridge",
    "PortBindings": {
      "3000/tcp": [{ "HostPort": "0" }]  // Random host port
    }
  }
}
```

---

#### Multi-Container

**Internal network only** (services can talk to each other, but not external):

```yaml
networks:
  eval-network:
    driver: bridge
    internal: true # Block external access
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

**With external access** (if problem requires):

```yaml
networks:
  eval-network:
    driver: bridge
    internal: false # Allow external access
```

---

## Resource Management

### Single Container

Resources defined in problem config, applied to single container:

```javascript
{
  "HostConfig": {
    "Memory": 1024 * 1024 * 1024,     // 1 GB
    "MemorySwap": 1024 * 1024 * 1024, // No swap
    "CpuQuota": 150000,                 // 1.5 cores
    "CpuPeriod": 100000,
    "DiskQuota": 2048 * 1024 * 1024   // 2 GB
  }
}
```

---

### Multi-Container

Resources divided among services:

```yaml
services:
  frontend:
    deploy:
      resources:
        limits:
          memory: 512M
          cpus: "1.0"
        reservations:
          memory: 256M
          cpus: "0.5"

  backend:
    deploy:
      resources:
        limits:
          memory: 1024M
          cpus: "1.5"
        reservations:
          memory: 512M
          cpus: "0.75"
```

**Total resources must not exceed judgehost limits.**

---

## Security Considerations

### Isolation Between Stages

1. **Problem Image** (Stage 1)

   - Can access network for setup
   - Can write to filesystem
   - Has elevated privileges if needed for setup

2. **Evaluation Image** (Stage 2)
   - Restricted network access
   - Read-only filesystem (except /tmp, /out)
   - Dropped capabilities
   - User namespace isolation

### Multi-Container Security

1. **Network isolation** - Services can't access host or external networks (unless explicitly allowed)
2. **Volume isolation** - Each evaluation gets fresh volumes
3. **Resource limits** - CPU/memory limits per service
4. **No privilege escalation** - All containers run as non-root user

---

## Image Cleanup

### Problem Images

- **Retained** until problem is deleted
- **Can be rebuilt** with `force_rebuild=true`
- **Tagged** for version tracking

### Evaluation Images

- **Removed** after evaluation completes (configurable)
- **Can be retained** for debugging with env var:
  ```bash
  JUDGEHOST_RETAIN_EVAL_IMAGES=true
  JUDGEHOST_RETAIN_EVAL_IMAGES_DAYS=7
  ```

### Multi-Container Cleanup

```bash
# After evaluation
docker-compose -f eval-{submission_id}.yml down --volumes --remove-orphans
docker rmi eval-{submission_id}-frontend:latest
docker rmi eval-{submission_id}-backend:latest
# Keep problem images
```

---

## Environment Variables

### Problem Image Build

```bash
JUDGEHOST_DOCKER_BUILD_TIMEOUT=600          # Build timeout (seconds)
JUDGEHOST_DOCKER_BUILD_NO_CACHE=false       # Disable Docker cache
JUDGEHOST_DOCKER_BUILD_MEMORY_LIMIT=4096    # Build memory limit (MB)
```

### Evaluation Image Build

```bash
JUDGEHOST_EVAL_BUILD_TIMEOUT=300            # Faster timeout for eval builds
JUDGEHOST_EVAL_DOCKER_NO_CACHE=true         # Always fresh build
```

### Resource Limits (Hardware-Dependent)

```bash
# These limits depend on judgehost hardware capabilities
JUDGEHOST_MAX_MEMORY_MB=8192                # Max total memory
JUDGEHOST_MAX_CPU_CORES=8.0                 # Max total CPU
JUDGEHOST_MAX_DISK_MB=102400                # Max total disk (100GB)

# Per-container limits
JUDGEHOST_CONTAINER_MAX_MEMORY_MB=4096      # Max per container
JUDGEHOST_CONTAINER_MAX_CPU_CORES=4.0       # Max per container
JUDGEHOST_CONTAINER_MAX_DISK_MB=10240       # Max per container (10GB)
```

---

## Default Tools and Resources

The judgehost provides default tools and utilities that are available to all problem images. Problems can extend, supplement, or override these defaults.

### Default Tools (`/tools/`)

The judgehost includes a set of default tools in `/tools/` that are copied into every container:

**Default Tools Provided**:

- `universal_entrypoint.sh` - Standard entrypoint that orchestrates hooks and execution
- `downloader.sh` - Utility for downloading submissions from Git or URLs
- `script_runner.sh` - Hook execution wrapper with timeout and logging
- Basic monitoring scripts for resource tracking

**Problem Override Behavior**:

1. **Additive by default** - Problem tools are added alongside judgehost tools:

   ```dockerfile
   # In problem Dockerfile
   COPY tools/ /problem-tools/    # Your custom tools
   # Both /tools/ (judgehost) and /problem-tools/ exist
   ```

2. **Selective override** - Override specific tools by copying to the same path:

   ```dockerfile
   # Replace the default entrypoint with custom version
   COPY my_entrypoint.sh /tools/universal_entrypoint.sh
   ```

3. **Full replacement** - Remove default tools entirely (not recommended):
   ```dockerfile
   RUN rm -rf /tools/*
   COPY my_tools/ /tools/
   ```

**Best Practice**: Extend rather than replace. Keep `universal_entrypoint.sh` and add your tools to `/problem-tools/`.

---

### Default Monitor Script

The judgehost includes a default resource monitoring script that tracks:

- CPU usage
- Memory usage
- Disk I/O
- Network traffic (if enabled)

**Location**: `/tools/monitor.sh`

**Behavior**: Runs automatically as a periodic hook if no problem-specific periodic hooks are provided.

**Override Options**:

1. **Supplement with additional monitors** - Add problem-specific periodic hooks:

   ```
   problem-package/
   ├── hooks/
   │   └── periodic/
   │       └── 01_check_database_state.sh   # Runs alongside default monitor
   ```

   Both the default monitor and your custom hook will execute.

2. **Disable default monitor** - Set in config.json:

   ```json
   {
     "hooks_config": {
       "use_default_monitor": false,
       "periodic_interval_seconds": 10
     }
   }
   ```

3. **Replace default monitor** - Provide your own at the expected path:
   ```dockerfile
   COPY custom_monitor.sh /tools/monitor.sh
   ```

**Default Monitor Output**: Writes metrics to `/out/metrics.json` every monitoring interval.

---

### Submission Loading Mechanism

The default `universal_entrypoint.sh` handles submission code loading:

1. Copies submission from `/submission/` to `/workspace/`
2. Detects project type and runs appropriate setup (npm install, pip install, etc.)
3. Executes pre-execution hooks
4. Starts the application with configured command
5. Executes post-execution and periodic hooks

**Customization**: Problems can override the entrypoint to implement custom loading logic, but must still:

- Write rubric results to `/out/rubric_<rubric_id>.json`
- Respect resource limits and timeouts
- Log to stdout/stderr for captured logs

---

### File System Layout

**Standard directories available to all containers**:

```
/
├── tools/              # Judgehost default tools (can be extended/overridden)
├── hooks/              # Problem hooks (pre/, post/, periodic/)
├── data/               # Problem test data and resources
├── problem/            # Problem-specific resources
├── problem-tools/      # Recommended location for additional problem tools
├── submission/         # Submitted code (read-only)
├── workspace/          # Working directory for execution (read-write in /tmp mode)
├── out/                # Output directory for results (read-write)
│   ├── rubric_*.json   # Rubric evaluation results
│   ├── metrics.json    # Resource metrics
│   └── artifacts/      # Generated artifacts
└── tmp/                # Temporary files (read-write)
```

**Permissions**:

- `/tools/`, `/hooks/`, `/data/`, `/problem/`: Read-only in evaluation stage
- `/workspace/`: Read-only (except when using tmpfs overlay for performance)
- `/out/`, `/tmp/`: Read-write
- Everything else: Read-only

---

### Environment Variables Available to Containers

**Judgehost-provided variables**:

```bash
JUDGEHOST_VERSION=0.1.0                    # Judgehost version
PROBLEM_ID=rest-api-users                  # Problem identifier
SUBMISSION_ID=sub_1234567890abcdef         # Submission identifier
PROJECT_TYPE=web_api                       # Project type
EVALUATION_TIMEOUT=300                     # Timeout in seconds
RESOURCE_MEMORY_MB=1024                    # Allocated memory
RESOURCE_CPU_CORES=1.5                     # Allocated CPU
NETWORK_ENABLED=true                       # Network availability
OUTPUT_DIR=/out                            # Results output directory
WORKSPACE_DIR=/workspace                   # Working directory
```

**Problem-defined variables** (from config.json):

```json
{
  "execution_config": {
    "environment": {
      "NODE_ENV": "test",
      "DATABASE_URL": "postgres://test:test@localhost:5432/testdb"
    }
  }
}
```

These variables are merged, with problem-defined variables taking precedence for duplicate keys.

---

## Future: Kubernetes Integration

**Current Status**: Not yet implemented, but architecture is designed to support it.

### Kubernetes Orchestration Options

The two-stage container architecture is compatible with Kubernetes orchestration:

#### Option 1: Evaluation as Kubernetes Jobs

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: eval-sub-1234567890abcdef
  labels:
    app: judgehost-evaluator
    submission-id: sub-1234567890abcdef
    problem-id: rest-api-users
spec:
  ttlSecondsAfterFinished: 300 # Auto-cleanup
  template:
    metadata:
      labels:
        app: judgehost-evaluator
    spec:
      restartPolicy: Never
      containers:
        - name: evaluator
          image: eval-sub-1234567890abcdef:latest
          resources:
            requests:
              memory: "512Mi"
              cpu: "500m"
            limits:
              memory: "1Gi"
              cpu: "1.5"
          volumeMounts:
            - name: results
              mountPath: /out
      volumes:
        - name: results
          persistentVolumeClaim:
            claimName: eval-results
```

#### Option 2: Multi-Container Pods

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: eval-full-stack-todo-sub-123
spec:
  containers:
    - name: frontend
      image: eval-sub-123-frontend:latest
      resources:
        limits:
          memory: "512Mi"
          cpu: "1.0"
    - name: backend
      image: eval-sub-123-backend:latest
      resources:
        limits:
          memory: "1Gi"
          cpu: "1.5"
    - name: database
      image: problem-full-stack-todo-database:latest
      resources:
        limits:
          memory: "512Mi"
          cpu: "0.5"
```

### Kubernetes Benefits

1. **Scalability**: Auto-scale judgehost workers based on queue depth
2. **Reliability**: Automatic pod restarts and health checks
3. **Resource Management**: Fine-grained resource allocation with requests/limits
4. **Multi-tenancy**: Namespace isolation for different problem sets or contests
5. **Cloud Integration**: Easy deployment to GKE, EKS, AKS with managed services

### Cloud-Hosted Kubernetes Considerations

**Google Kubernetes Engine (GKE)**:

- Use Artifact Registry for container images
- Cloud Storage for problem resources and results
- Preemptible nodes for cost optimization
- Regional clusters for high availability

**Amazon EKS**:

- ECR for container images
- S3 for storage
- Spot instances for non-critical evaluations
- Fargate for serverless workers

**Azure AKS**:

- ACR for container images
- Azure Blob Storage for artifacts
- Spot VMs for cost savings
- ACI integration for burst capacity

### Architecture with Kubernetes

```
┌─────────────────────────────────────────────────────┐
│            Judgehost API Service                    │
│         (Stateless, can scale horizontally)         │
└─────────────────┬───────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────┐
│           Queue Backend (Redis/RabbitMQ)            │
└─────────────────┬───────────────────────────────────┘
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
    ┌───────┐ ┌───────┐ ┌───────┐
    │Worker │ │Worker │ │Worker │
    │ Pod 1 │ │ Pod 2 │ │ Pod 3 │
    └───┬───┘ └───┬───┘ └───┬───┘
        │         │         │
        ▼         ▼         ▼
    Creates   Creates   Creates
    K8s Jobs  K8s Jobs  K8s Jobs
        │         │         │
        ▼         ▼         ▼
    Eval Pods Eval Pods Eval Pods
```

**Workflow**:

1. Judgehost API receives submission
2. Adds to Redis queue
3. Worker pods claim jobs from queue
4. Workers create Kubernetes Jobs for evaluations
5. Evaluation pods run and write results to persistent volume
6. Workers collect results and mark jobs complete

### Migration Path

**Phase 1** (Current): Docker-based, single judgehost process
**Phase 2**: Multi-worker with Docker (separate processes)
**Phase 3**: Kubernetes Jobs for evaluations, workers still manage lifecycle
**Phase 4**: Full Kubernetes native with CRDs (Custom Resource Definitions)

### Design Considerations for K8s

1. **Image Registry**: Problem and evaluation images need to be pushed to registry (not just local Docker)
2. **Storage**: Persistent volumes for problem resources and results
3. **Networking**: Service mesh or network policies for multi-container problems
4. **Security**: Pod security policies, RBAC for job creation
5. **Monitoring**: Prometheus metrics, Grafana dashboards
6. **Cost**: Track resource usage per evaluation for billing/quotas

---

## Best Practices

1. **Minimize problem image size** - Use Alpine base images, multi-stage builds
2. **Cache dependencies** - Install in problem image, not evaluation image
3. **Use .dockerignore** - Exclude unnecessary files from images
4. **Version problem images** - Tag with version numbers for reproducibility
5. **Test multi-container locally** - Use `docker-compose` to test before registering
6. **Set appropriate resource limits** - Based on actual hardware capabilities
7. **Clean up regularly** - Remove old evaluation images to save disk space
8. **Extend default tools** - Add to `/problem-tools/` rather than replacing `/tools/`
9. **Supplement monitoring** - Add problem-specific periodic hooks alongside default monitor
10. **Use standard paths** - Follow the file system layout for consistency
11. **Design for portability** - Keep Docker and K8s compatibility in mind for future migration

---

## See Also

- [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) - Project type specifications
- [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) - Queue and resource management (including future K8s architecture)
- [`[API] ADD_PROBLEM.md`](%5BAPI%5D%20ADD_PROBLEM.md) - Problem registration API
- [`[GUIDE] MULTI_CONTAINER.md`](%5BGUIDE%5D%20MULTI_CONTAINER.md) - Guide for creating multi-container problems
- [`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) - Guide for writing evaluation hooks
