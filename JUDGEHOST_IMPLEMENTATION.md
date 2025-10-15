# Judgehost Server Implementation Plan

## Overview

Implement the judgehost server to dynamically handle problem packages with multi-container evaluations, following the tested db-optimization pattern.

## Key Requirements

### 1. Dynamic Problem Package Handling

- Problems stored at different locations
- Each problem has its own directory structure
- Support for multi-container setups (database + submission)

### 2. Dynamic Mount Management

- Hooks directory: `{problemPath}/{containerId}/hooks/` → `/workspace/hooks`
- Data directory: `{problemPath}/{containerId}/data/` → `/workspace/data`
- Submission files: `{submissionPath}/` → `/submission`
- Output directory: `{resultPath}/output/` → `/out`
- Shared directory: `{resultPath}/shared/` → `/shared` (for inter-container communication)

### 3. Container Orchestration

- **Stage 1**: Build images (once per problem)
- **Stage 2**: Run evaluation (fresh containers per submission)
- Support container dependencies (e.g., database must be healthy before submission)
- Network isolation between evaluations

### 4. Hook Execution

- Pre-hooks: Initialize environment
- Post-hooks: Evaluate and generate rubrics
- Periodic hooks: Health checks
- Execute via `docker exec` from judgehost

## Architecture

```
judgehost/
├── src/
│   ├── core/
│   │   ├── processor.js          # Main evaluation orchestrator
│   │   ├── evaluation.js         # NEW: Evaluation workflow manager
│   │   ├── queue.js              # Job queue
│   │   └── docker/
│   │       ├── client.js         # Docker client wrapper
│   │       ├── image.js          # Image building (Stage 1)
│   │       ├── containers.js     # Container lifecycle (Stage 2)
│   │       ├── network.js        # Network management
│   │       ├── stage.js          # Stage config loader
│   │       ├── mounts.js         # NEW: Dynamic mount management
│   │       └── hooks.js          # NEW: Hook execution
│   ├── models/
│   │   ├── Problem.js            # Problem model
│   │   ├── Submission.js         # Submission model
│   │   └── Result.js             # Result model
│   └── utils/
│       ├── resourceMounting.js   # Mount path resolution
│       └── rubrics.js            # Rubric collection
```

## Implementation Steps

### Phase 1: Core Evaluation Module (NEW)

Create `src/core/evaluation.js` to handle:

- Load problem config
- Build images (Stage 1) - cache and reuse
- Create evaluation environment (Stage 2)
- Execute hooks in sequence
- Collect rubric results
- Cleanup

### Phase 2: Dynamic Mount Manager (NEW)

Create `src/core/docker/mounts.js` to:

- Generate mount configurations based on paths
- Support hooks/, data/, submission/, /out, /shared
- Validate mount sources exist

### Phase 3: Hook Executor (NEW)

Create `src/core/docker/hooks.js` to:

- Execute pre-hooks sequentially
- Execute post-hooks (evaluation)
- Execute periodic hooks (health checks)
- Capture output and logs
- Handle timeouts and errors

### Phase 4: Container Orchestrator Updates

Update `src/core/docker/containers.js` to:

- Create containers with dynamic mounts
- Support multi-container evaluations
- Handle container dependencies
- Manage shared volumes between containers

### Phase 5: Network Manager Updates

Update `src/core/docker/network.js` to:

- Create isolated networks per evaluation
- Support container-to-container communication
- Cleanup networks after evaluation

### Phase 6: Processor Integration

Update `src/core/processor.js` to:

- Use new evaluation module
- Handle problem package caching
- Support parallel evaluations
- Implement proper cleanup

## Data Flow

### Problem Registration

```
POST /problems
├─ Download problem package
├─ Extract to /data/problems/{problem_id}/
├─ Load config.json
├─ Validate structure
└─ Store in registry
```

### Submission Evaluation

```
POST /submissions
├─ Download submission package
├─ Extract to /data/submissions/{submission_id}/
├─ Load problem config
├─ Create result directory: /data/results/{result_id}/
│   ├─ output/     # Mount to /out
│   └─ shared/     # Mount to /shared
├─ Build images (Stage 1 - cached)
├─ Create network
├─ Start dependency containers (e.g., database)
│   ├─ Mount: hooks/, data/, shared/
│   ├─ Execute pre-hooks
│   └─ Wait for healthy
├─ Start submission container
│   ├─ Mount: hooks/, data/, submission/, output/, shared/
│   ├─ Execute pre-hooks
│   └─ Execute post-hooks (evaluation)
├─ Collect rubrics from /out
├─ Stop containers
├─ Remove network
└─ Return results
```

## Configuration Example

### Problem Package Structure

```
db-optimization/
├── config.json                    # Problem config
├── database/
│   ├── Dockerfile                 # Stage 1: Image definition
│   ├── stage1.config.json         # Stage 1: Build config
│   ├── stage2.config.json         # Stage 2: Runtime config
│   ├── hooks/
│   │   ├── pre/                   # Initialization hooks
│   │   └── periodic/              # Health check hooks
│   └── data/                      # Baseline data files
└── submission/
    ├── Dockerfile
    ├── stage1.config.json
    ├── stage2.config.json
    ├── hooks/
    │   ├── pre/                   # Setup hooks
    │   └── post/                  # Evaluation hooks
    └── data/                      # Test data
```

### Runtime Mount Structure

```
/data/
├── problems/
│   └── sql-optimization/          # Problem package
│       ├── config.json
│       ├── database/...
│       └── submission/...
├── submissions/
│   └── sub-12345/                 # Student submission
│       ├── migration.sql
│       ├── Q1.sql
│       ├── Q2.sql
│       └── Q3.sql
└── results/
    └── result-67890/              # Evaluation workspace
        ├── output/                # Rubric JSONs
        │   ├── rubric_correctness.json
        │   ├── rubric_latency.json
        │   ├── rubric_concurrency.json
        │   └── rubric_resource_efficiency.json
        └── shared/                # Inter-container data
            ├── initial_size.txt
            └── migration_metrics.json
```

## API Updates

### Problem Registration

- Support problem package upload
- Extract and validate
- Build images asynchronously
- Cache image IDs

### Submission Evaluation

- Download submission
- Resolve problem config
- Create evaluation workspace
- Execute evaluation workflow
- Stream logs (optional)
- Return results

### Result Retrieval

- Return rubric scores
- Provide logs
- Support rubric-specific details

## Testing Strategy

1. **Unit Tests**: Test individual modules (mounts, hooks, etc.)
2. **Integration Tests**: Test full evaluation flow
3. **E2E Tests**: Test with db-optimization package
4. **Performance Tests**: Test parallel evaluations

## Next Steps

1. ✅ Understand current structure
2. ⏳ Create evaluation.js module
3. ⏳ Create mounts.js module
4. ⏳ Create hooks.js module
5. ⏳ Update containers.js
6. ⏳ Update processor.js
7. ⏳ Test with db-optimization package
