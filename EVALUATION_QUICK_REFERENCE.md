# Judgehost Evaluation System - Quick Reference

## Core Modules

### 1. Evaluation Orchestrator

**File:** `src/core/evaluation.js`

**Main Function:**

```javascript
const { runEvaluation } = require("./core/evaluation");

await runEvaluation({
  problemId: "db-optimization",
  submissionId: "sub-123",
  resultId: "result-456",
  problemPath: "/path/to/problem",
  submissionPath: "/path/to/submission",
  resultPath: "/path/to/results",
});
```

**Returns:**

```javascript
{
  submission_id: 'sub-123',
  problem_id: 'db-optimization',
  result_id: 'result-456',
  status: 'completed' | 'failed',
  rubrics: [
    {
      rubric_id: 'correctness',
      name: 'Correctness',
      type: 'automated',
      max_score: 50,
      score: 45,
      status: 'success',
      details: {},
      message: ''
    }
  ],
  containers: [],
  error: null,
  start_time: '2024-01-01T00:00:00Z',
  end_time: '2024-01-01T00:05:00Z'
}
```

### 2. Mount Manager

**File:** `src/core/docker/mounts.js`

**Generate Mounts:**

```javascript
const { generateMounts } = require("./core/docker/mounts");

const mounts = await generateMounts({
  problemPath: "/problems/db-optimization",
  containerId: "database",
  submissionPath: "/submissions/sub-123", // null if not accepting
  outputPath: "/results/out",
  sharedPath: "/results/shared",
  acceptsSubmission: false,
});
```

**Create Workspace:**

```javascript
const { createEvaluationWorkspace } = require("./core/docker/mounts");

const workspace = await createEvaluationWorkspace("/results/result-456");
// Returns: { outputPath, sharedPath, logsPath }
```

**List Hooks:**

```javascript
const { listHooks } = require("./core/docker/mounts");

const preHooks = await listHooks(
  "/problems/db-optimization/database/hooks",
  "pre"
);
const postHooks = await listHooks(
  "/problems/db-optimization/database/hooks",
  "post"
);
```

### 3. Hook Executor

**File:** `src/core/docker/hooks.js`

**Execute Single Hook:**

```javascript
const { executeHook } = require("./core/docker/hooks");

const result = await executeHook(
  "container-name",
  "/workspace/hooks/pre/01-init.sh",
  {
    timeout: 300,
    env: { DB_NAME: "testdb" },
  }
);

// result = { exitCode: 0, stdout: '...', stderr: '...' }
```

**Execute Pre-hooks:**

```javascript
const { executePreHooks } = require("./core/docker/hooks");

await executePreHooks(
  "container-name",
  ["/workspace/hooks/pre/01-init.sh", "/workspace/hooks/pre/02-seed.sh"],
  {
    timeout: 300,
    continueOnError: false,
  }
);
```

**Execute Post-hooks:**

```javascript
const { executePostHooks } = require("./core/docker/hooks");

await executePostHooks(
  "container-name",
  [
    "/workspace/hooks/post/01-correctness.sh",
    "/workspace/hooks/post/02-latency.sh",
  ],
  {
    timeout: 300,
    continueOnError: true, // Continue even if hook fails
  }
);
```

**Wait for Health:**

```javascript
const { waitForHealthy } = require("./core/docker/hooks");

const healthy = await waitForHealthy("database-container", {
  timeout: 60,
  interval: 2,
});
```

## Problem Package Structure

### Directory Layout

```
problem-package/
├── config.json                    # Main configuration
├── container1/
│   ├── Dockerfile                 # Container image
│   ├── stage1.config.json         # Build-time config
│   ├── stage2.config.json         # Runtime config
│   ├── hooks/
│   │   ├── pre/                   # Initialization hooks
│   │   │   ├── 01-first.sh
│   │   │   └── 02-second.sh
│   │   ├── post/                  # Evaluation hooks
│   │   │   ├── 01-correctness.sh
│   │   │   └── 02-performance.sh
│   │   └── periodic/              # Background hooks (future)
│   └── data/                      # Container-specific data
│       └── init.sql
└── container2/
    └── (same structure)
```

### config.json

```json
{
  "problem_id": "unique-id",
  "problem_name": "Display Name",
  "version": "1.0.0",
  "description": "Problem description",
  "containers": [
    {
      "container_id": "database",
      "dockerfile_path": "database/Dockerfile",
      "accepts_submission": false,
      "depends_on": []
    },
    {
      "container_id": "submission",
      "dockerfile_path": "submission/Dockerfile",
      "accepts_submission": true,
      "depends_on": [
        {
          "container_id": "database",
          "timeout": 60,
          "retry_interval": 2
        }
      ]
    }
  ],
  "rubrics": [
    {
      "rubric_id": "correctness",
      "name": "Correctness",
      "type": "automated",
      "max_score": 50
    },
    {
      "rubric_id": "performance",
      "name": "Performance",
      "type": "performance",
      "max_score": 50
    }
  ]
}
```

### stage1.config.json (Build-time)

```json
{
  "stage": 1,
  "description": "Build stage configuration",
  "build_args": {
    "VERSION": "14"
  },
  "environment": {
    "DEBIAN_FRONTEND": "noninteractive"
  }
}
```

### stage2.config.json (Runtime)

```json
{
  "stage": 2,
  "description": "Runtime stage configuration",
  "environment": {
    "POSTGRES_DB": "testdb",
    "POSTGRES_USER": "testuser",
    "POSTGRES_PASSWORD": "testpass"
  },
  "resource_limits": {
    "memory": "1g",
    "cpu": "1.0",
    "timeout": 300
  }
}
```

## Container Mounts

### Mount Structure

Each container receives these mounts:

1. **`/workspace`** (read-only)

   - Source: `{problemPath}/{containerId}`
   - Contains: Dockerfile, hooks/, data/, configs

2. **`/submission`** (read-only, if `accepts_submission: true`)

   - Source: `{submissionPath}`
   - Contains: Student submission files

3. **`/out`** (read-write)

   - Source: `{resultPath}/output`
   - Purpose: Write rubric JSON files
   - Format: `rubric_{rubric_id}.json`

4. **`/shared`** (read-write)
   - Source: `{resultPath}/shared`
   - Purpose: Share data between containers
   - Example: Container 1 exports data, Container 2 imports it

## Hook Scripts

### Pre-hook Example (`01-init-db.sh`)

```bash
#!/bin/bash
# Pre-hooks run during container initialization
# Exit code 0 = success, non-zero = failure

set -e

echo "Initializing database..."

# Run SQL from mounted data
psql -U testuser -d testdb -f /workspace/data/schema.sql

echo "Database initialized"
```

### Post-hook Example (`01-correctness.sh`)

```bash
#!/bin/bash
# Post-hooks run for evaluation
# Must write results to /out/rubric_{id}.json

set -e

SCORE=0
MAX_SCORE=50
STATUS="success"
MESSAGE=""

# Test correctness
if psql -U testuser -d testdb -c "SELECT * FROM test_query" > /dev/null 2>&1; then
  SCORE=50
  MESSAGE="All queries correct"
else
  STATUS="failed"
  MESSAGE="Query failed"
fi

# Write rubric JSON
cat > /out/rubric_correctness.json <<EOF
{
  "score": $SCORE,
  "status": "$STATUS",
  "message": "$MESSAGE",
  "details": {
    "test_count": 10,
    "passed": 10
  }
}
EOF
```

## Evaluation Workflow

### Step-by-Step Process

1. **Load Configuration**

   ```javascript
   const config = await loadProblemConfig(problemPath);
   ```

2. **Build Images (Stage 1 - Cached)**

   ```javascript
   await buildContainerImages(problemId, problemPath, config.containers);
   ```

3. **Create Network**

   ```javascript
   await createNetwork(`eval-${resultId}`, { internal: false });
   ```

4. **Start Containers (Stage 2)**

   - Containers started in dependency order
   - Each container gets:
     - Dynamic mounts
     - Resource limits
     - Network connection
     - Environment variables

5. **Execute Pre-hooks**

   - Run in each container sequentially
   - Must complete before moving on
   - Failure stops evaluation

6. **Wait for Dependencies**

   - Check health of dependent containers
   - Retry with interval until healthy or timeout

7. **Execute Post-hooks**

   - Run evaluation scripts
   - Generate rubric JSON files
   - Continue on error (collect partial results)

8. **Collect Rubrics**

   - Read JSON files from `/out`
   - Parse scores and details
   - Handle missing/invalid rubrics gracefully

9. **Cleanup**
   - Stop all containers
   - Remove containers
   - Remove network
   - Preserve results directory

## Testing

### Run Full Test

```bash
./scripts/test-evaluation-module.sh
```

### Manual Test

```bash
cd judgehost
node -e "
const { runEvaluation } = require('./src/core/evaluation');

runEvaluation({
  problemId: 'db-optimization',
  submissionId: 'test-001',
  resultId: 'result-001',
  problemPath: './mock/packages/db-optimization',
  submissionPath: './mock/packages/db-optimization-submission-sample',
  resultPath: './test-output'
}).then(result => {
  console.log('Status:', result.status);
  console.log('Rubrics:', result.rubrics);
}).catch(console.error);
"
```

### Debug Mode

```javascript
// Enable verbose logging
process.env.LOG_LEVEL = "debug";

const { runEvaluation } = require("./src/core/evaluation");
// ...
```

## Error Handling

### Common Errors

**1. Mount validation failed**

```
Error: Source path does not exist: /path/to/problem
```

Solution: Verify problem path exists and is accessible

**2. Container health check failed**

```
Error: Dependency not healthy: database
```

Solution: Check database pre-hooks and health check configuration

**3. Hook execution timeout**

```
Error: Hook execution timeout after 300s
```

Solution: Increase timeout in stage2.config.json or optimize hook

**4. Rubric file missing**

```
Warning: Failed to collect rubric: correctness
```

Solution: Check post-hook output, ensure it writes to `/out/rubric_correctness.json`

## Performance Tips

### 1. Image Caching

- Images are cached automatically
- Rebuilds only happen when:
  - Dockerfile changes
  - `force_rebuild: true` specified
  - Cache manually cleared

### 2. Resource Limits

- Set appropriate limits in `stage2.config.json`
- Too low: Container OOM or CPU throttled
- Too high: Wasted resources

### 3. Hook Optimization

- Keep hooks fast and focused
- Use indexes in database queries
- Avoid unnecessary computations
- Write incremental results

### 4. Parallel Hooks

- Currently sequential
- Future: Support parallel post-hooks
- Use `depends_on` in hook config

## API Integration

### Problem Upload

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=db-optimization" \
  -F "package=@problem.zip"
```

### Submit Solution

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=db-optimization" \
  -F "package=@solution.zip"
```

### Get Results

```bash
curl http://localhost:3000/api/results/{submissionId}
```

## Troubleshooting

### Check Container Logs

```bash
docker logs <container-name>
```

### Check Hook Output

```bash
# Result directory
ls -la /path/to/results/output/

# Read rubric
cat /path/to/results/output/rubric_correctness.json
```

### Debug Hook Execution

```bash
# Enter running container
docker exec -it <container-name> bash

# Manually run hook
/workspace/hooks/post/01-correctness.sh
```

### Verify Mounts

```bash
# List mounts inside container
docker exec <container-name> mount | grep workspace
```

## Additional Resources

- [Full Implementation Summary](./JUDGEHOST_SERVER_IMPLEMENTATION.md)
- [Implementation Plan](./JUDGEHOST_IMPLEMENTATION.md)
- [Testing Guide](./TESTING_GUIDE.md)
- [Database Testing Plan](./mock/packages/db-optimization/DATABASE_TESTING_PLAN.md)
- [Submission Testing](./mock/packages/db-optimization/SUBMISSION_TESTING_SUMMARY.md)
