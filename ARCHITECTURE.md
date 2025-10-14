# Judgehost API Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Applications                      │
│              (LMS, Web UI, CI/CD, Command Line)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Judgehost API Server                        │
│                     (Express.js on Node.js)                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Problems   │  │ Submissions  │  │   Results    │          │
│  │   Router     │  │   Router     │  │   Router     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│         └──────────────────┼──────────────────┘                  │
│                            ▼                                     │
│                   ┌────────────────┐                            │
│                   │ Core Processor │                            │
│                   └────────┬───────┘                            │
│                            │                                     │
│         ┌──────────────────┼──────────────────┐                 │
│         │                  │                  │                 │
│         ▼                  ▼                  ▼                 │
│  ┌────────────┐    ┌────────────┐    ┌────────────┐            │
│  │  Problem   │    │   Queue    │    │  Docker    │            │
│  │  Registry  │    │  Manager   │    │  Manager   │            │
│  └────────────┘    └────────────┘    └────────────┘            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Docker Engine                             │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Problem    │  │  Submission  │  │    Tester    │          │
│  │  Containers  │  │  Containers  │  │  Containers  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

## API Endpoint Structure

```
/api
├── /problems
│   ├── POST    /              → Register problem
│   ├── GET     /              → List all problems
│   ├── GET     /:problem_id   → Get problem details
│   └── DELETE  /:problem_id   → Delete problem
│
├── /submissions
│   ├── POST    /                    → Submit solution
│   ├── POST    /multi               → Multi-package submission
│   ├── GET     /:submission_id      → Get submission status
│   └── DELETE  /:submission_id      → Cancel submission
│
├── /results
│   ├── GET     /:submission_id                      → Get results
│   ├── GET     /:submission_id/logs                 → Get logs
│   ├── GET     /:submission_id/artifacts            → List artifacts
│   ├── GET     /:submission_id/artifacts/:filename  → Download artifact
│   └── GET     /:submission_id/rubric/:rubric_id   → Get rubric details
│
├── /queue
│   └── GET     /              → Queue status
│
└── /health
    └── GET     /              → Health check
```

## Request Flow

### Problem Registration Flow

```
1. Client Upload/URL/Git
   │
   ▼
2. API Validation
   │ ├─ Validate required fields
   │ ├─ Check package type
   │ └─ Verify problem ID
   │
   ▼
3. Download/Extract Package
   │ ├─ File: Direct upload
   │ ├─ URL: Download and verify checksum
   │ └─ Git: Clone repository
   │
   ▼
4. Validate Package Structure
   │ ├─ Check config.json exists
   │ ├─ Check Dockerfile exists
   │ └─ Validate config schema
   │
   ▼
5. Build Docker Image
   │ └─ docker build -t problem-<id>:latest
   │
   ▼
6. Register in Problem Registry
   │ └─ Store metadata in memory + disk
   │
   ▼
7. Return Success Response
```

### Submission Flow

```
1. Client Submit
   │
   ▼
2. API Validation
   │ ├─ Validate required fields
   │ ├─ Check problem exists
   │ └─ Verify package type
   │
   ▼
3. Prepare Submission
   │ ├─ File: Extract to submissions dir
   │ ├─ URL: Download and extract
   │ └─ Git: Clone repository
   │
   ▼
4. Create Job & Enqueue
   │ ├─ Generate submission ID
   │ ├─ Set priority
   │ └─ Add to queue
   │
   ▼
5. Return Job ID (202 Accepted)
   │
   ▼
6. Background Processing
   │ ├─ Build containers
   │ ├─ Mount volumes
   │ ├─ Execute hooks (pre/post/periodic)
   │ ├─ Collect results
   │ └─ Calculate scores
   │
   ▼
7. Save Results
   │ └─ Write to results/<submission_id>/
   │
   ▼
8. Send Webhook (if configured)
```

### Result Retrieval Flow

```
1. Client Request Results
   │
   ▼
2. Find Submission by ID
   │
   ▼
3. Check Status
   │
   ├─ Queued/Running → Return 202 (Processing)
   │
   ├─ Completed → Load results.json
   │   │
   │   ▼
   │   4. Format Response
   │      ├─ Include logs (optional)
   │      ├─ Include metrics (optional)
   │      └─ Include artifacts (optional)
   │
   └─ Failed/Cancelled → Return error info
```

## Data Flow

### Problem Package Structure

```
problem-package/
├── config.json              → Problem configuration
├── Dockerfile              → Base image definition
├── hooks/                  → Evaluation scripts
│   ├── pre/               → Setup scripts
│   │   ├── 01_install_deps.sh
│   │   └── 02_setup_db.sh
│   ├── post/              → Testing scripts
│   │   ├── 01_test_api.sh
│   │   └── 02_test_security.sh
│   └── periodic/          → Monitoring scripts
│       └── 01_monitor_metrics.sh
├── data/                  → Test data & resources
│   ├── test_cases.json
│   └── expected_output.txt
└── README.md              → Problem description
```

### Submission Package Structure

```
submission-package/
├── index.js               → Main code
├── package.json           → Dependencies
├── test.js               → Optional tests
└── main/                 → Additional files
    └── utils.js
```

### Results Structure

```
results/<submission_id>/
├── results.json           → Main results file
├── rubric_<id>.json      → Per-rubric details
├── artifacts/            → Generated files
│   ├── coverage.html
│   ├── test-report.json
│   └── screenshots/
└── logs/                 → Execution logs
    ├── container_<id>.log
    └── hooks/
        ├── pre_*.log
        └── post_*.log
```

## Component Interactions

### Problem Registry

```
┌─────────────────────────┐
│   Problem Registry      │
│   (In-Memory + Disk)    │
├─────────────────────────┤
│ Key: problem_id         │
│ Value: {                │
│   problemId,            │
│   problemName,          │
│   projectType,          │
│   config,               │
│   packagePath,          │
│   imageName,            │
│   registeredAt          │
│ }                       │
└─────────────────────────┘
```

### Queue Manager

```
┌─────────────────────────┐
│      Job Queue          │
│   (Priority-based)      │
├─────────────────────────┤
│ States:                 │
│ • queued                │
│ • running               │
│ • completed             │
│ • failed                │
│ • cancelled             │
├─────────────────────────┤
│ Operations:             │
│ • enqueue(job)          │
│ • dequeue()             │
│ • cancel(jobId)         │
│ • getStatus()           │
└─────────────────────────┘
```

### Docker Manager

```
┌─────────────────────────┐
│   Docker Manager        │
├─────────────────────────┤
│ Functions:              │
│ • buildImage()          │
│ • createContainer()     │
│ • startContainer()      │
│ • stopContainer()       │
│ • removeContainer()     │
│ • exec()                │
│ • getLogs()             │
│ • getStats()            │
└─────────────────────────┘
```

## Multi-Container Architecture

```
Problem: Full-Stack Web App
├── submission (Node.js API)
│   ├── Accepts: backend submission
│   ├── Evaluates: Code quality, security
│   └── Exposes: Port 3000
│
├── frontend (React SPA)
│   ├── Accepts: frontend submission
│   ├── Evaluates: UI tests, accessibility
│   └── Exposes: Port 8080
│
├── api-tester (Newman/Jest)
│   ├── Depends on: submission
│   ├── Evaluates: API correctness
│   └── Runs: Integration tests
│
└── database (PostgreSQL)
    ├── Role: Service
    ├── Provides: Data storage
    └── Exposes: Port 5432 (internal only)
```

## Resource Management

```
┌─────────────────────────────────────────┐
│         Resource Limits                  │
├─────────────────────────────────────────┤
│ Container Level:                         │
│ • memory: 512m - 4g                     │
│ • cpus: 0.5 - 4.0                       │
│ • timeout: 60s - 900s                   │
│                                          │
│ Global Level:                            │
│ • maxWorkers: 1 - 10                    │
│ • queueMaxSize: 100                     │
│ • maxUploadSize: 100MB                  │
└─────────────────────────────────────────┘
```

## Security Layers

```
1. Input Validation
   └─ Type checking, required fields, format validation

2. Authentication (Future)
   └─ API keys, JWT tokens

3. Authorization (Future)
   └─ Role-based access control

4. Container Isolation
   └─ Network isolation, resource limits, no privileged access

5. File System Security
   └─ Directory traversal prevention, read-only mounts

6. Docker Security
   └─ Non-root users, minimal base images, no host access
```

## Error Handling Strategy

```
API Layer
├─ Validation Errors (400)
│  └─ Missing fields, invalid types, format errors
│
├─ Not Found Errors (404)
│  └─ Problem/submission doesn't exist
│
├─ Conflict Errors (409)
│  └─ Problem already exists, can't delete in use
│
├─ Processing Errors (500)
│  └─ Build failures, Docker errors, system errors
│
└─ Rate Limiting (429) - Future
   └─ Too many requests
```

## Logging Strategy

```
Levels:
├─ DEBUG: Docker build output, detailed execution
├─ INFO: Requests, job state changes, successes
├─ WARN: Non-critical issues, fallbacks
└─ ERROR: Failures, exceptions, critical issues

Destinations:
├─ Console (stdout/stderr)
├─ Log files (logs/judgehost.log)
└─ External services (future)
```

## Performance Considerations

```
Optimization Areas:
├─ Queue Processing
│  └─ Parallel job execution with worker pool
│
├─ Docker Images
│  └─ Layer caching, multi-stage builds
│
├─ File Operations
│  └─ Streaming, async I/O, cleanup
│
└─ Memory Management
   └─ Result streaming, container cleanup
```

## Scalability Path

```
Current: Single Server
├─ Multiple workers
├─ In-memory queue
└─ Local file storage

Future: Distributed
├─ Multiple judgehost instances
├─ Redis-based queue
├─ Shared file storage (NFS/S3)
└─ Load balancer
```

## Monitoring & Observability

```
Metrics to Track:
├─ Queue depth and wait times
├─ Job completion rates
├─ Container resource usage
├─ API response times
├─ Error rates by endpoint
└─ Docker image sizes

Health Checks:
├─ API responsiveness
├─ Docker connectivity
├─ Disk space
└─ Queue status
```
