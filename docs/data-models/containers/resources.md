# Problem Resources and Container Mounting

This document explains how problem resources (hooks, data, test files) are included and made available to containers during evaluation.

**Related Documentation**:

- [`../../problems/POST_problems.md`](../../problems/POST_problems.md) - Problem registration
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Rubric-to-container mapping
- [`../samples/problem_package_name.md`](../samples/problem_package_name.md) - Problem package structure
- [`../samples/submission_package_name.md`](../samples/submission_package_name.md) - Submission package structure

---

## Overview

Problem packages contain resources that need to be available during evaluation:

- **Hooks**: Scripts for evaluation logic (pre, post, periodic) - **Executed by judgehost via `docker exec` commands**
- **Tools**: Helper scripts and utilities
- **Data**: Test data, expected outputs, validation files, schemas, configs, utilities

These resources are mounted into containers at specific paths, making them accessible to hooks and evaluation logic.

---

## Container Execution Model

**IMPORTANT: Containers created by judgehost do not execute their work autonomously.**

Instead, the judgehost orchestrator:

1. **Creates containers** with all necessary resources mounted
2. **Starts containers** (which may run as idle services or execute entrypoints)
3. **Executes commands** inside running containers using `docker exec`
4. **Coordinates execution** by passing hook scripts and commands from the build/evaluation functions

**The actual evaluation work is performed by:**

- Hook scripts executed via `docker exec` commands from the judgehost
- Commands passed by the orchestrator during container creation
- Entrypoints defined in Dockerfiles (for long-running services)

**Containers are execution environments, not autonomous workers.** The judgehost controls what runs inside them.

---

## Hook vs Tool Execution

## Hook vs Tool Execution

### Hooks (Orchestrator-Controlled Execution)

**Hooks are executed BY THE JUDGEHOST ORCHESTRATOR using `docker exec` commands:**

- **Not autonomous**: Hooks don't run automatically inside containers
- **Externally triggered**: Invoked by the judgehost orchestrator at specific lifecycle points
- **Executed via `docker exec`**: Run as separate remote commands in running containers
- **Orchestrated**: The judgehost determines when and how hooks execute
- **Controlled workflow**: Execution order is managed by the evaluation pipeline

**Example hook execution flow:**

```javascript
// Judgehost orchestrator code (simplified)
const container = docker.getContainer(containerId);

// 1. Start the container (may just idle or run a service)
await container.start();

// 2. Judgehost executes pre-hooks via docker exec
const preExec = await container.exec({
  Cmd: ["sh", "/hooks/pre/01_setup.sh"],
  AttachStdout: true,
  AttachStderr: true,
});
await preExec.start();

// 3. Judgehost executes post-hooks via docker exec
const postExec = await container.exec({
  Cmd: ["sh", "/hooks/post/01_test_api.sh"],
  AttachStdout: true,
  AttachStderr: true,
});
await postExec.start();
```

**What this means:**

- Containers provide the **execution environment**
- Judgehost provides the **execution logic** (which hooks to run, when, and how)
- Hooks are **commands passed to containers**, not code that runs independently

### Tools (Internal Execution)

**Tools are executed INSIDE containers**:

- Custom scripts specific to the problem
- Copied into image during build (Stage 1)
- Can be called by hooks, entrypoints, or manually
- Part of the container image itself

**Execution context:**

- Run in the container's environment
- No access to orchestration layer
- Can be invoked by entrypoint or called from hooks

**Example tool usage in Dockerfile:**

```dockerfile
# Copy problem-specific tools
COPY tools/ /tools/problem/

# Tools can be used in entrypoint or called from hooks
ENTRYPOINT ["/tools/downloader.sh"]
```

**Comparison:**

| Aspect          | Hooks                                    | Tools                              |
| --------------- | ---------------------------------------- | ---------------------------------- |
| **Executed by** | Judgehost orchestrator via `docker exec` | Container processes or entrypoints |
| **Trigger**     | External (judgehost decides when)        | Internal (container decides when)  |
| **Purpose**     | Evaluation orchestration and testing     | Problem-specific utilities         |
| **Location**    | Mounted at `/hooks/`                     | Copied into image at build time    |
| **Autonomy**    | No - controlled by judgehost             | Yes - part of container logic      |

---

## Problem Package Structure

```
problem-package/
├── config.json              # Global configuration with container dependencies
├── container-1/             # First container (e.g., submission)
│   ├── Dockerfile           # Container image definition
│   ├── config.json          # Container-specific configuration (optional)
│   ├── hooks/               # Hooks for this container (executed via docker exec)
│   │   ├── pre/
│   │   └── post/
│   ├── tools/               # Problem-specific tools (baked into image)
│   │   └── custom_validator.sh
│   └── data/                # Container-specific data
├── container-2/             # Second container (e.g., api-tester)
│   ├── Dockerfile
│   ├── hooks/
│   ├── tools/
│   └── data/
├── data/                    # Shared data (available to all containers)
└── README.md
```

See [`../samples/problem_package_name.md`](../samples/problem_package_name.md) for detailed structure examples.

---

## Resource Mounting

### Default Mount Points

When a container starts, problem resources are automatically mounted:

```
Container Filesystem:
/
├── tools/                   # Tools directory
│   ├── universal_entrypoint.sh
│   ├── script_runner.sh
│   ├── monitor.sh
|   └── custom_validator.sh
├── hooks/                   # Problem hooks (from problem package)
│   ├── pre/
│   ├── post/
│   └── periodic/
├── data/                    # Problem data (from problem package)
│   ├── test-cases/
│   ├── fixtures/
│   ├── schemas/
│   ├── validators/
│   ├── utils/
│   └── configs/
├── submission/              # Submission code (from submission submission)
│   └── [submission files]
├── workspace/               # Working directory (writable copy of submission)
│   └── [submission files]
├── out/                     # Output directory (writable)
│   ├── rubric_*.json        # Rubric evaluation results
│   ├── logs/                # Additional logs
│   ├── metrics.json         # Resource metrics
│   └── artifacts/           # Generated artifacts
└── tmp/                     # Temporary files (writable)
```

### Mount Behavior

| Path           | Source                | Permissions | Description                     |
| -------------- | --------------------- | ----------- | ------------------------------- |
| `/tools/`      | Problem package       | Read-only   | Problem-specific scripts        |
| `/hooks/`      | Problem package       | Read-only   | Evaluation hooks                |
| `/data/`       | Problem package       | Read-only   | Test data, schemas, utilities   |
| `/submission/` | submission submission | Read-only   | Original submission (immutable) |
| `/workspace/`  | Copy of submission    | Read-write  | Working directory for execution |
| `/out/`        | Container-specific    | Read-write  | Output directory for results    |
| `/tmp/`        | Container-specific    | Read-write  | Temporary storage               |

---

## Multi-Container Resource Distribution

### Sharing Resources Across Containers

In multi-container problems, resources can be:

- **Shared** across all containers (common resources)
- **Container-specific** (per-container resources)

### Example: API Problem with Submission + Tester

```
problem-package/
├── config.json              # Global config with dependencies
├── submission/              # Resources for submission container
│   ├── Dockerfile
│   ├── hooks/               # Executed via docker exec
│   │   └── post/
│   │       ├── 01_security_scan.sh
│   │       └── 02_code_quality.sh
│   └── tools/               # Problem-specific tools (baked into image)
│       └── code_analyzer.sh
├── api-tester/              # Resources for tester container
│   ├── Dockerfile
│   ├── hooks/               # Executed via docker exec
│   │   └── post/
│   │       ├── 01_test_endpoints.sh
│   │       └── 02_performance_test.sh
│   ├── tools/               # Problem-specific tools (baked into image)
│   │   └── api_client.sh
│   └── data/
│       └── test_cases/
│           └── api_tests.json
└── data/                    # Shared across all containers
    └── schemas/
        ├── user_schema.json
        └── response_schema.json
```

**Mounting behavior**:

```
Submission Container (accepts_submission: true):
/
├── tools/
│   └── code_analyzer.sh
├── hooks/                            # Problem hooks (executed outside via docker exec)
│   └── post/
│       ├── 01_security_scan.sh       # From submission/hooks/
│       └── 02_code_quality.sh
├── data/
│   └── schemas/                      # Shared from problem data/
│       ├── user_schema.json
│       └── response_schema.json
├── submission/                       # Read-only original
│   └── [submission API code]
└── workspace/                        # Read-write working copy
    └── [submission API code]

API Tester Container (accepts_submission: false):
/
├── tools/
│   └── api_client.sh
├── hooks/                            # Problem hooks (executed outside via docker exec)
│   └── post/
│       ├── 01_test_endpoints.sh      # From api-tester/hooks/
│       └── 02_performance_test.sh
└── data/
    ├── test_cases/                   # Container-specific from api-tester/data/
    │   └── api_tests.json
    └── schemas/                      # Shared from problem data/
        ├── user_schema.json
        └── response_schema.json
```

**Key differences:**

- Submission container gets `/submission/` and `/workspace/` mounts
- Tester container does NOT get submission code
- Both get shared `data/` from problem package
- Both get problem-provided tools at `/tools/`
- Each gets its own container-specific `hooks/` and `data/`

---

## Configuration in config.json

### Global Configuration (Root config.json)

```json
{
  "problem_id": "rest-api-users",
  "problem_name": "REST API - User Management",

  "containers": [
    {
      "container_id": "submission",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": []
    },
    {
      "container_id": "api-tester",
      "accepts_submission": false,
      "dockerfile_path": "api-tester/Dockerfile",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ]
    }
  ],

  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "container": "api-tester"
    },
    {
      "rubric_id": "security",
      "container": "submission"
    }
  ]
}
```

---

## Container Dependencies and Orchestration

### Overview

Multi-container problems require sophisticated orchestration to coordinate container lifecycle:

- **Health-based startup**: Start container B when container A becomes healthy
- **Completion-based termination**: Stop container A when container B finishes
- **Timeouts**: Configure maximum wait times for health checks
- **Retries**: Retry health checks before declaring failure
- **Parallel execution**: Multiple containers can run simultaneously

### Dependency Configuration

Dependencies are defined in the global `config.json`:

```json
{
  "containers": [
    {
      "container_id": "database",
      "accepts_submission": false,
      "dockerfile_path": "database/Dockerfile",
      "depends_on": []
    },
    {
      "container_id": "submission",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": [
        {
          "container_id": "database",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5,
          "retry_interval": 2
        }
      ]
    },
    {
      "container_id": "api-tester",
      "accepts_submission": false,
      "dockerfile_path": "api-tester/Dockerfile",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5,
          "retry_interval": 2
        }
      ],
      "terminates": ["submission", "database"]
    }
  ]
}
```

### Dependency Conditions

| Condition     | Description                            | When to Use                                     |
| ------------- | -------------------------------------- | ----------------------------------------------- |
| `"started"`   | Wait for container to start (default)  | For containers without health checks            |
| `"healthy"`   | Wait for container to become healthy   | For containers with health checks (recommended) |
| `"completed"` | Wait for container to finish execution | For initialization containers                   |

### Health Check Configuration

Health checks are defined in per-container `config.json`:

```json
{
  "container_id": "submission",
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 3,
    "start_period": 10
  }
}
```

**Health check parameters:**

- **command**: Command to check health (exit 0 = healthy)
- **interval**: Time between checks (seconds)
- **timeout**: Maximum time for check to complete (seconds)
- **retries**: Number of consecutive failures before unhealthy
- **start_period**: Grace period before checks start (seconds)

### Container Termination

The `terminates` field specifies which containers to stop when this container finishes:

```json
{
  "container_id": "api-tester",
  "terminates": ["submission", "database"]
}
```

**Use cases:**

- API tester finishes → terminate API server and database
- UI tester finishes → terminate frontend and backend
- Load tester finishes → terminate all service containers

### Execution Flow Example

```
Time  Database       Submission       API Tester
──────────────────────────────────────────────────
0s    START          -                -
2s    starting...    -                -
5s    healthy ✓      START            -
7s    running        starting...      -
12s   running        healthy ✓        START
15s   running        running          testing...
25s   running        running          tests done ✓
26s   TERMINATE ✗    TERMINATE ✗      collect results
27s   -              -                TERMINATE ✗
```

### Timeout and Retry Logic

#### Health Check Timeout

If container doesn't become healthy within timeout:

```json
{
  "depends_on": [
    {
      "container_id": "submission",
      "condition": "healthy",
      "timeout": 30, // Max 30 seconds
      "retry": 5, // Try 5 times
      "retry_interval": 2 // 2 seconds between retries
    }
  ]
}
```

**Behavior:**

1. Start dependency container
2. Wait `retry_interval` seconds
3. Check health
4. If unhealthy, retry up to `retry` times
5. If still unhealthy after `timeout` seconds, fail evaluation

#### Startup Timeout

Maximum time for container to start:

```json
{
  "container_id": "submission",
  "startup_timeout": 60 // Max 60 seconds to start
}
```

### Advanced Dependency Patterns

#### Pattern 1: Sequential Pipeline

```
A → B → C
```

Each container waits for previous:

```json
{
  "containers": [
    { "container_id": "A" },
    { "container_id": "B", "depends_on": [{ "container_id": "A" }] },
    { "container_id": "C", "depends_on": [{ "container_id": "B" }] }
  ]
}
```

#### Pattern 2: Fan-Out

```
    ┌→ B
A ──┼→ C
    └→ D
```

Multiple containers depend on one:

```json
{
  "containers": [
    { "container_id": "A" },
    { "container_id": "B", "depends_on": [{ "container_id": "A" }] },
    { "container_id": "C", "depends_on": [{ "container_id": "A" }] },
    { "container_id": "D", "depends_on": [{ "container_id": "A" }] }
  ]
}
```

#### Pattern 3: Diamond

```
    ┌→ B ┐
A ──┤    ├→ D
    └→ C ┘
```

Final container waits for multiple:

```json
{
  "containers": [
    { "container_id": "A" },
    { "container_id": "B", "depends_on": [{ "container_id": "A" }] },
    { "container_id": "C", "depends_on": [{ "container_id": "A" }] },
    {
      "container_id": "D",
      "depends_on": [{ "container_id": "B" }, { "container_id": "C" }]
    }
  ]
}
```

---

## Two-Stage Build for Submission Containers

### Overview

Containers with `accepts_submission: true` undergo a **two-stage build process**:

1. **Stage 1: Build Problem Image** - Build the evaluation environment (done once per problem)
2. **Stage 2: Load Submission** - Inject submission code (done per submission)

This separation provides:

- **Performance**: Problem setup is cached and reused
- **Isolation**: Clean separation between problem and submission
- **Security**: Submission can't tamper with problem image

### Stage 1: Build Problem Image

**When:** During problem registration (`POST /problems`)

**What happens:**

1. Extract problem package
2. Build Docker image from `<container-id>/Dockerfile`
3. Copy hooks, data, resources into image
4. Install dependencies and tools
5. Set up evaluation environment
6. Tag and cache image as `judgehost/problem-<problem_id>-<container_id>:latest`

**Example Dockerfile:**

```dockerfile
# submission/Dockerfile
FROM node:18-alpine

# Install system dependencies
RUN apk add --no-cache curl jq

# Copy problem resources
COPY hooks /hooks
COPY data /data

# Copy problem-specific tools (optional)
COPY tools /tools

# Set working directory
WORKDIR /workspace

# Install any problem-specific npm packages
RUN npm install -g eslint@8.0.0

# Health check
HEALTHCHECK --interval=5s --timeout=3s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Entry point will be set by judgehost
```

**Result:** Cached image ready to accept submissions

### Stage 2: Load Submission

**When:** During submission evaluation (`POST /submissions`)

**What happens:**

1. Start container from cached problem image
2. Mount submission code to `/submission/` (read-only)
3. Copy submission code to `/workspace/` (read-write)
4. Create `/out/` and `/tmp/` directories
5. Run pre-hooks (if any)
6. Start submission application
7. Run post-hooks for evaluation
8. Collect results

**Container state after Stage 2:**

```
Container Filesystem:
/
├── tools/                  # Problem-specific tools (Stage 1)
├── hooks/                  # From problem image (Stage 1)
├── data/                   # From problem image (Stage 1)
├── submission/             # Mounted at runtime (Stage 2) - READ-ONLY
│   └── [submission code]
├── workspace/              # Created at runtime (Stage 2) - READ-WRITE
│   └── [copy of submission code]
├── out/                    # Created at runtime (Stage 2) - READ-WRITE
└── tmp/                    # Created at runtime (Stage 2) - READ-WRITE
```

### Why Two Stages?

#### Without Two-Stage Build (Slow)

Every submission:

```
1. Extract problem package (10s)
2. Build Docker image (60s)
3. Install dependencies (30s)
4. Copy resources (5s)
5. Load submission (2s)
6. Evaluate (30s)
Total: 137s per submission
```

#### With Two-Stage Build (Fast)

Problem registration (once):

```
1. Extract problem package (10s)
2. Build Docker image (60s)
3. Install dependencies (30s)
4. Copy resources (5s)
5. Cache image (0s)
Total: 105s (one time)
```

Each submission:

```
1. Load cached image (2s)
2. Mount submission (1s)
3. Evaluate (30s)
Total: 33s per submission (4x faster!)
```

### Configuration: No Special Syntax Required

The two-stage build is **automatic** for containers with `accepts_submission: true`:

```json
{
  "containers": [
    {
      "container_id": "submission",
      "accepts_submission": true, // ← Two-stage build enabled automatically
      "dockerfile_path": "submission/Dockerfile"
    },
    {
      "container_id": "tester",
      "accepts_submission": false, // ← Single-stage build
      "dockerfile_path": "tester/Dockerfile"
    }
  ]
}
```

**No additional configuration needed!**

### Caching and Updates

#### Problem Image Cache

- Problem images are cached indefinitely
- Tagged as `judgehost/problem-<problem_id>-<container_id>:latest`
- Updated only when problem is re-registered with `force_rebuild=true`

#### Force Rebuild

To update a problem image:

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=my-problem" \
  -F "force_rebuild=true" \
  -F "problem_package=@updated-problem.tar.gz"
```

### Best Practices

1. **Keep problem image minimal**: Only install what's needed for all submissions
2. **Don't assume submission structure in Stage 1**: Stage 1 doesn't have access to submission code
3. **Use multi-stage Docker builds**: Minimize final image size

   ```dockerfile
   # Build stage
   FROM node:18-alpine AS builder
   RUN npm install -g some-tool

   # Final stage
   FROM node:18-alpine
   COPY --from=builder /usr/local/bin/some-tool /usr/local/bin/
   COPY hooks /hooks
   ```

4. **Leverage Docker layer caching**: Put frequently changing files last

   ```dockerfile
   # Good order (stable → volatile)
   FROM node:18-alpine
   RUN apk add curl                  # Rarely changes
   COPY resources /resources         # Rarely changes
   COPY data /data                   # Changes sometimes
   COPY hooks /hooks                 # Changes frequently
   ```

---

## Per-Container Configuration (Optional)

Each container directory can have its own `config.json`:

```json
{
  "container_id": "submission",
  "accepts_submission": true,
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M"
  },
  "environment": {
    "NODE_ENV": "production",
    "PORT": "3000"
  },
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 3
  }
}
  ]
}
```

### Default Behavior

Default mounting behavior:

- Container-specific `hooks/` and `data/` are mounted from `<container-id>/hooks/` and `<container-id>/data/`
- Shared `data/` is merged/overlaid from problem root `data/`
- All mounts are read-only except `/workspace/`, `/out/`, and `/tmp/`

---

## Accessing Resources in Hooks

### Reading Test Data

```bash
#!/bin/bash
# hooks/post/01_test_api_endpoints.sh

# Test data is at /data/
TEST_CASES_DIR="/data/test-cases"

# Read test inputs
INPUT=$(cat "$TEST_CASES_DIR/input1.json")
EXPECTED=$(cat "$TEST_CASES_DIR/expected1.json")

# Make API call to submission
ACTUAL=$(curl -s http://localhost:3000/api/users)

# Compare results
# ... validation logic ...
```

### Using Shared Resources

```bash
#!/bin/bash
# hooks/post/02_validate_response.sh

# Validator utility in shared data
VALIDATOR="/data/validators/response-validator.js"

# Run validator
node "$VALIDATOR" --input /tmp/api-response.json --schema /data/schemas/user-schema.json
```

### Writing Results

```bash
#!/bin/bash
# hooks/post/01_test_api_endpoints.sh

OUTPUT_DIR="/out"

# Write rubric result
cat > "$OUTPUT_DIR/rubric_api_correctness.json" << EOF
{
  "rubric_id": "api_correctness",
  "rubric_type": "api_endpoints",
  "score": 38.0,
  "max_score": 40.0,
  "status": "DONE",
  "details": {
    "total": 25,
    "passed": 23,
    "failed": 2
  }
}
EOF

# Write detailed report as artifact
cp test-report.html "$OUTPUT_DIR/artifacts/"
```

---

## Build-Time vs Runtime Resources

### Build-Time Resources

Resources needed during Docker image build are copied into the image:

```dockerfile
# Dockerfile for submission container
FROM node:18-alpine

# Copy evaluation hooks into image
COPY containers/submission/hooks /hooks

# Copy shared data into image
COPY data /data

# Submission image does not provide problem-specific tools

WORKDIR /workspace
```

### Runtime Resources

Some resources are mounted at runtime:

- **Submission code**: Mounted when container starts
- **Output directory**: Created for each evaluation
- **Temporary storage**: Ephemeral per-container

---

## Resource Isolation and Security

### Read-Only Mounts

Problem resources are mounted read-only to prevent tampering:

```bash
# This will fail - hooks are read-only
echo "malicious code" >> /hooks/post/01_test.sh  # Permission denied

# This will fail - data is read-only
rm /data/test-cases/input1.json  # Permission denied
```

### Writable Directories

Only specific directories are writable:

```bash
# OK - workspace is writable
echo "temp file" > /workspace/temp.txt

# OK - output directory is writable
echo '{"score": 10}' > /out/rubric_test.json

# OK - tmp is writable
echo "cache" > /tmp/cache.txt
```

### Container Isolation

Containers cannot access each other's filesystems directly:

- Submission container cannot read tester's hooks
- Tester container cannot access submission's `/workspace/` directly
- Communication happens through network or shared volumes (if configured)

---

## Best Practices

### Organizing Resources

1. **Hooks**: Keep hooks focused and single-purpose

   - One hook per rubric when possible
   - Use numeric prefixes for execution order: `01_`, `02_`, etc.

2. **Tools**: Organize problem-specific tools

   - Place in `tools/` directory within container folder
   - System built-in tools are automatically available
   - Can be called from hooks or used in entrypoint

3. **Data**: Structure test data logically

   ```
   data/
   ├── test-cases/
   │   ├── basic/
   │   ├── edge-cases/
   │   └── stress-tests/
   ├── fixtures/
   │   ├── seed-data.sql
   │   └── sample-users.json
   ├── schemas/
   ├── validators/
   └── configs/
   ```

### Performance Optimization

1. **Minimize resource size**: Only include necessary files
2. **Use build-time copying**: Copy resources into image during build (faster than runtime mounting)
3. **Share common resources**: Don't duplicate data across containers

### Security

1. **Never include secrets in problem packages**

   - Use environment variables for secrets
   - Generate secrets at runtime if needed

2. **Validate file paths in hooks**

   ```bash
   # Bad - vulnerable to path traversal
   cat "$USER_INPUT"

   # Good - validate path
   SAFE_PATH=$(realpath "$USER_INPUT")
   if [[ "$SAFE_PATH" == /data/* ]]; then
     cat "$SAFE_PATH"
   fi
   ```

3. **Set appropriate file permissions**
   ```dockerfile
   # In Dockerfile
   COPY --chmod=755 hooks /hooks
   COPY --chmod=644 data /data
   ```

---

## Examples

### Example 1: Simple Algorithm Problem

```
problem-package/
├── config.json
├── submission/
│   ├── Dockerfile
│   ├── hooks/
│   │   └── post/
│   │       └── 01_run_tests.sh
│   └── data/
│       └── test-cases/
│           ├── input1.txt
│           ├── output1.txt
│           ├── input2.txt
│           └── output2.txt
```

Hook accessing test data:

```bash
#!/bin/bash
# hooks/post/01_run_tests.sh

passed=0
total=0

for i in 1 2; do
  total=$((total + 1))

  # Run submission with test input
  ACTUAL=$(/workspace/solution < /data/test-cases/input${i}.txt)
  EXPECTED=$(cat /data/test-cases/output${i}.txt)

  if [ "$ACTUAL" == "$EXPECTED" ]; then
    passed=$((passed + 1))
  fi
done

# Write result
cat > /out/rubric_correctness.json << EOF
{
  "rubric_id": "correctness",
  "score": $((passed * 50 / total)),
  "details": {"total": $total, "passed": $passed}
}
EOF
```

### Example 2: Database Problem with Validator

```
problem-package/
├── config.json
├── submission/
│   ├── Dockerfile
│   └── hooks/
│       └── post/
│           └── 01_validate_schema.sh
├── validator/
│   ├── Dockerfile
│   └── hooks/
│       └── post/
│           └── 01_test_queries.sh
└── data/
    ├── schemas/
    │   └── expected-schema.json
    ├── test-queries/
    │   ├── query1.sql
    │   └── expected1.json
    └── validators/
        └── schema-validator.py
```

Validator hook:

```bash
#!/bin/bash
# validator/hooks/post/01_test_queries.sh

# Connect to submission database
DB_HOST="submission"  # Container name
DB_PORT="5432"

passed=0
total=0

for query_file in /data/test-queries/*.sql; do
  total=$((total + 1))

  # Run query against submission database
  ACTUAL=$(psql -h $DB_HOST -p $DB_PORT -U postgres -t -c "$(cat $query_file)")

  # Compare with expected
  expected_file="${query_file%.sql}.expected.json"
  EXPECTED=$(cat "$expected_file")

  if [ "$ACTUAL" == "$EXPECTED" ]; then
    passed=$((passed + 1))
  fi
done

# Write result
cat > /out/rubric_query_correctness.json << EOF
{
  "rubric_id": "query_correctness",
  "score": $((passed * 40 / total)),
  "details": {"total": $total, "passed": $passed}
}
EOF
```

---

## See Also

- [`../../[SPEC] CONTAINER_ARCHITECTURE.md`](../../[SPEC]%20CONTAINER_ARCHITECTURE.md) - Container architecture details
- [`../../[GUIDE] WRITING_HOOKS.md`](../../[GUIDE]%20WRITING_HOOKS.md) - Hook authoring guide
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Rubric-to-container mapping
- [`../../problems/POST_problems.md`](../../problems/POST_problems.md) - Problem configuration
