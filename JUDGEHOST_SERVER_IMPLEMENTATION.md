# Judgehost Server Implementation Summary

## Overview

The judgehost server has been refactored to support **dynamic mount handling** for problem packages and submissions stored at different locations. The new architecture uses a modular approach with three core components working together to orchestrate evaluations.

## Architecture

### Core Modules

#### 1. **Mount Manager** (`src/core/docker/mounts.js`)

Handles dynamic mount generation for Docker containers.

**Key Functions:**

- `generateMounts(options)` - Creates Docker mount configurations

  - `problemPath` - Problem package location (can be anywhere)
  - `containerId` - Container identifier
  - `submissionPath` - Submission location (optional, dynamic)
  - `outputPath` - Results output location
  - `sharedPath` - Shared volume for inter-container communication
  - `acceptsSubmission` - Whether container receives submission files

- `validateMounts(mounts)` - Validates that source paths exist
- `createEvaluationWorkspace(resultPath)` - Creates result directory structure
- `listHooks(hooksPath, type)` - Lists hook files (pre/post/periodic)

**Mount Structure:**

```javascript
{
  Type: 'bind',
  Source: '/host/path',       // Absolute path on host
  Target: '/container/path',   // Path inside container
  ReadOnly: true/false
}
```

**Container Mounts:**

- `/workspace` - Problem package files (hooks, data, configs)
- `/submission` - Submission files (if `acceptsSubmission: true`)
- `/out` - Output directory for rubric results (read-write)
- `/shared` - Shared volume for inter-container data exchange

#### 2. **Hook Executor** (`src/core/docker/hooks.js`)

Executes evaluation hooks inside running containers.

**Key Functions:**

- `executeHook(containerName, hookPath, options)` - Execute single hook

  - Uses `docker exec` to run hook scripts
  - Demultiplexes Docker streams (stdout/stderr)
  - Handles timeouts and error codes
  - Returns { exitCode, stdout, stderr }

- `executePreHooks(containerName, hookPaths, options)` - Sequential pre-hook execution
- `executePostHooks(containerName, hookPaths, options)` - Sequential post-hook execution
- `waitForHealthy(containerName, options)` - Wait for container health check

**Features:**

- Stream demultiplexing for proper stdout/stderr separation
- Timeout handling per hook
- Continue-on-error support for post-hooks
- Exit code validation

#### 3. **Evaluation Orchestrator** (`src/core/evaluation.js`)

Main module that coordinates the complete evaluation workflow.

**Main Function:**

```javascript
runEvaluation({
  problemId, // Problem identifier
  submissionId, // Submission identifier
  resultId, // Result identifier
  problemPath, // Path to problem package (dynamic)
  submissionPath, // Path to submission (dynamic)
  resultPath, // Path for results (dynamic)
});
```

**Workflow:**

1. **Load Configuration** - Parse `config.json` from problem package
2. **Build Images** (Stage 1) - Build Docker images with caching
3. **Create Network** - Isolated network per evaluation
4. **Start Containers** (Stage 2) - Start containers in dependency order
5. **Execute Pre-hooks** - Run initialization hooks
6. **Wait for Dependencies** - Ensure dependent containers are healthy
7. **Execute Post-hooks** - Run evaluation hooks
8. **Collect Rubrics** - Parse rubric JSON files from `/out`
9. **Cleanup** - Stop containers and remove network

**Features:**

- Image caching to avoid rebuilding
- Topological sort for container dependencies
- Resource limit parsing (memory, CPU)
- Comprehensive error handling
- Automatic cleanup on success/failure

### Integration with Processor

The `processor.js` module has been updated to use the new evaluation orchestrator:

```javascript
async function runEvaluation(job, problem, submissionDir, resultsDir) {
  const { runEvaluation: runEval } = require("./evaluation");

  const evalResult = await runEval({
    problemId: problem.problemId,
    submissionId: submissionId,
    resultId: `result-${submissionId}-${Date.now()}`,
    problemPath: problem.packagePath, // Dynamic path
    submissionPath: submissionDir, // Dynamic path
    resultPath: resultsDir, // Dynamic path
  });

  // Transform result to API format
  // ...
}
```

## Key Improvements

### 1. **Dynamic Mount Support**

- **Before**: Fixed paths hardcoded in container creation
- **After**: Generate mounts dynamically based on arbitrary paths

### 2. **Multi-Container Architecture**

- **Before**: Single container per evaluation
- **After**: Multiple containers with dependencies (e.g., database + submission)

### 3. **Stage-Based Execution**

- **Stage 1**: Build images once (cached)
- **Stage 2**: Create fresh containers per evaluation

### 4. **Hook System**

- **Pre-hooks**: Container initialization (run once)
- **Post-hooks**: Evaluation logic (generate rubrics)
- **Periodic-hooks**: Background tasks (future support)

### 5. **Isolation**

- Each evaluation gets:
  - Dedicated network
  - Fresh containers
  - Isolated filesystem
  - Clean environment

## Configuration Example

### Problem Package Structure

```
db-optimization/
├── config.json              # Main configuration
├── database/
│   ├── Dockerfile
│   ├── stage1.config.json   # Build-time config
│   ├── stage2.config.json   # Runtime config
│   ├── hooks/
│   │   ├── pre/
│   │   │   └── 01-init-db.sh
│   │   └── post/
│   └── data/
│       └── schema.sql
└── submission/
    ├── Dockerfile
    ├── stage1.config.json
    ├── stage2.config.json
    └── hooks/
        └── post/
            ├── 01-correctness.sh
            ├── 02-latency.sh
            ├── 03-concurrency.sh
            └── 04-storage.sh
```

### config.json

```json
{
  "problem_id": "db-optimization",
  "problem_name": "Database Query Optimization",
  "version": "1.0.0",
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
      "rubric_id": "latency",
      "name": "Query Latency",
      "type": "performance",
      "max_score": 30
    },
    {
      "rubric_id": "concurrency",
      "name": "Concurrency Handling",
      "type": "performance",
      "max_score": 10
    },
    {
      "rubric_id": "storage",
      "name": "Storage Efficiency",
      "type": "performance",
      "max_score": 10
    }
  ]
}
```

## Testing

### Test Script

A comprehensive test script has been created: `scripts/test-evaluation-module.sh`

**Features:**

- Verifies all module files exist
- Creates isolated test environment
- Runs evaluation with real problem package
- Validates rubric output
- Comprehensive error reporting

**Usage:**

```bash
./scripts/test-evaluation-module.sh
```

### Expected Output

```
=== Evaluation Result ===

Status: completed
Rubrics:
  - Correctness: 50/50 (success)
  - Query Latency: 0/30 (timeout)
  - Concurrency Handling: 10/10 (success)
  - Storage Efficiency: 6.18/10 (partial)

Total Score: 66.18/100 (66.18%)
Duration: 45000ms

✓ Evaluation completed successfully
```

## API Integration

The evaluation module integrates seamlessly with existing API endpoints:

### POST /api/problems

- Upload problem package to any location
- `processProblemPackage()` extracts and registers it
- Images built on first use (Stage 1)

### POST /api/submissions

- Upload submission to any location
- Queue evaluation job
- `processSubmission()` triggers evaluation

### GET /api/results/:submissionId

- Retrieve evaluation results
- Includes rubric scores and details

## Resource Management

### Memory Limits

Parsed from `stage2.config.json`:

```json
{
  "resource_limits": {
    "memory": "1g", // Converted to bytes
    "cpu": "1.0", // Number of CPUs
    "timeout": 300 // Seconds
  }
}
```

### Cleanup

Automatic cleanup includes:

- Stop all containers
- Remove containers
- Remove network
- Preserve results in output directory

## Error Handling

### Evaluation Errors

```javascript
{
  status: "failed",
  error: {
    message: "Container health check failed",
    stack: "..."
  },
  rubrics: [] // Empty on fatal errors
}
```

### Rubric Errors

Individual rubric failures don't stop evaluation:

```javascript
{
  rubric_id: "latency",
  score: 0,
  status: "error",
  message: "Hook execution timeout"
}
```

## Performance Optimizations

### Image Caching

- Images built once per problem
- Cached in memory: `Map<problemId:containerId:stage, imageId>`
- Rebuilds only on `force_rebuild: true`

### Parallel Operations

- Mount validation in parallel
- Hook listing concurrent per container
- Container startup respects dependencies only

### Stream Processing

- Docker exec streams demultiplexed in real-time
- No buffering of large outputs
- Immediate error detection

## Future Enhancements

### Planned Features

1. **Periodic Hooks** - Background monitoring during evaluation
2. **Container Stats** - Real-time memory/CPU usage tracking
3. **Artifact Collection** - Save container logs and intermediate files
4. **Distributed Evaluation** - Multiple judgehost workers
5. **Priority Queues** - Fast-track urgent submissions

### API Extensions

- `GET /api/evaluations/:id/status` - Real-time evaluation progress
- `POST /api/evaluations/:id/cancel` - Cancel running evaluation
- `GET /api/evaluations/:id/logs` - Stream container logs

## Migration Guide

### From Old Architecture

The old container group system has been completely replaced. No migration needed for:

- Problem packages (config.json format unchanged)
- Submission packages (structure unchanged)
- API endpoints (same interface)

### New Features to Adopt

1. **Multi-container problems**: Add multiple containers to `config.json`
2. **Stage configs**: Add `stage1.config.json` and `stage2.config.json` per container
3. **Hook organization**: Use `hooks/pre/`, `hooks/post/`, `hooks/periodic/` subdirectories

## Summary

The new judgehost implementation provides:

- ✅ Dynamic mount handling for flexible storage
- ✅ Multi-container evaluation support
- ✅ Comprehensive hook system
- ✅ Robust error handling and cleanup
- ✅ Image caching for performance
- ✅ Container dependency management
- ✅ Isolated evaluation environments
- ✅ Detailed rubric collection
- ✅ Full backward compatibility

The system is production-ready and tested with the `db-optimization` problem package.
