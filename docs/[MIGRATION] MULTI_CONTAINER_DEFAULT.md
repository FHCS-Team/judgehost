# Multi-Container Architecture Migration Guide

> **⚠️ STATUS**: This document describes a **planned migration** that has not yet been implemented. The current codebase (v0.1.0) still supports both single-container and multi-container modes. This guide is for future reference when the migration is ready to proceed.

## Overview

This document outlines the planned modernization of the judgehost system to use multi-container architecture as the default and only supported evaluation mode. This migration would remove legacy single-container and sidecar evaluation modes in favor of a more flexible, maintainable architecture.

**Current Status**: Not implemented - codebase still contains:

- `container_type` field in problem configurations
- Separate handling for single-container vs multi-container
- Legacy sidecar evaluation references

## What Would Change

### 1. Problem Configuration

**Before:**

```json
{
  "container_type": "single-container",  // or "multi-container"
  "evaluation_mode": "sidecar",          // legacy
  "dockerfile": "FROM node:18...",       // monolithic
  ...
}
```

**After:**

```json
{
  "containers": [                        // REQUIRED field
    {
      "container_id": "submission",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "submission_package_mapping": {...}
    },
    {
      "container_id": "tests",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "dependencies": ["submission"]
    }
  ],
  "submission_packages": [...],
  ...
}
```

**Key Changes:**

- `container_type` field removed - multi-container is now the only architecture
- `containers` array is now **required**
- `evaluation_mode` field removed - no more sidecar mode
- `dockerfile` field removed - use `build_steps` instead

### 2. Build Step Modularization

Build steps have been extracted into separate modules for better maintainability.

**Location:** `src/core/steps/build/`

**Available Build Steps:**

1. **run** - Execute shell commands
2. **copy** - Copy files with --from and --chown support
3. **env** - Set environment variables
4. **workdir** - Set working directory
5. **expose** - Expose ports
6. **volume** - Define volume mounts
7. **user** - Set user/group
8. **label** - Add metadata labels
9. **arg** - Define build arguments
10. **healthcheck** - Configure health checks
11. **shell** - Override default shell
12. **onbuild** - Add trigger instructions
13. **stopsignal** - Set stop signal
14. **add** - Add files/URLs with tar extraction
15. **cmd** - Set default command
16. **entrypoint** - Set container entrypoint

**Example:**

```json
{
  "build_steps": [
    {
      "type": "workdir",
      "path": "/app"
    },
    {
      "type": "copy",
      "source": "package*.json",
      "destination": "./",
      "chown": "node:node"
    },
    {
      "type": "run",
      "command": ["npm ci --only=production", "npm cache clean --force"]
    },
    {
      "type": "env",
      "env": {
        "NODE_ENV": "production",
        "PORT": "3000"
      }
    },
    {
      "type": "user",
      "user": "node"
    },
    {
      "type": "cmd",
      "command": ["node", "server.js"],
      "form": "exec"
    }
  ]
}
```

### 3. Runtime Steps

New runtime/execution steps have been added for container orchestration:

**Location:** `src/core/steps/runtime/`

**Available Runtime Steps:**

1. **pre_hook** - Execute scripts before main execution
2. **post_hook** - Execute scripts after main execution
3. **validation** - Validate container state (HTTP, TCP, command, file)
4. **data_collection** - Collect logs, files, metrics, artifacts

**Example:**

```json
{
  "runtime_steps": [
    {
      "type": "pre_hook",
      "script": "/hooks/setup.sh",
      "timeout": 30
    },
    {
      "type": "validation",
      "validation_type": "http",
      "config": {
        "url": "http://localhost:3000/health",
        "expected_status": 200,
        "timeout": 10
      }
    },
    {
      "type": "data_collection",
      "collection_type": "logs",
      "config": {
        "stdout": true,
        "stderr": true,
        "timestamps": true
      }
    },
    {
      "type": "post_hook",
      "script": "/hooks/cleanup.sh",
      "timeout": 60
    }
  ]
}
```

### 4. Code Removals

The following legacy code has been completely removed:

**From `src/core/processor.js`:**

- ✅ `processSidecarEvaluation()` method (~200 lines)
- ✅ `downloadSubmission()` method (replaced by `downloadMultiPackageSubmission()`)
- ✅ Single-container evaluation workflow (~110 lines)
- ✅ Legacy routing logic based on `container_type` and `evaluation_mode`

**From `src/models/Problem.js`:**

- ✅ `ContainerType` typedef (`'single-container' | 'multi-container'`)
- ✅ Optional `containers` field (now required)

**To be removed from `src/core/docker.js` (if present):**

- ❌ `buildEvaluationImage()`
- ❌ `createEvaluationContainer()`
- ❌ `buildSubmissionImage()`
- ❌ `createSubmissionContainer()`
- ❌ `createSidecarContainer()`

### 5. Simplified Processor Workflow

**Old Workflow:**

```
processSubmission()
  ├─> Check container_type
  │   ├─> "single-container" -> processSingleContainer()
  │   ├─> "multi-container" -> processMultiContainerEvaluation()
  │   └─> Check evaluation_mode
  │       └─> "sidecar" -> processSidecarEvaluation()
  └─> ...
```

**New Workflow:**

```
processSubmission()
  ├─> Validate containers field exists
  └─> processMultiContainerEvaluation()
      ├─> Download multiple packages
      ├─> Build container group
      ├─> Start container group
      ├─> Execute runtime steps
      ├─> Collect results
      └─> Cleanup
```

## Migration Steps

### For Existing Problems

1. **Update config.json structure:**

   ```bash
   # Old structure
   {
     "container_type": "single-container",
     "dockerfile": "...",
     ...
   }

   # New structure
   {
     "containers": [
       {
         "container_id": "main",
         "base_image": "...",
         "build_steps": [...]
       }
     ],
     "submission_packages": [...]
   }
   ```

2. **Convert Dockerfile to build_steps:**

   - Parse existing Dockerfile instructions
   - Map each instruction to corresponding build step type
   - Add to `build_steps` array

3. **Define submission packages:**

   ```json
   {
     "submission_packages": [
       {
         "package_id": "solution",
         "description": "Student solution code",
         "required": true
       }
     ]
   }
   ```

4. **Map packages to containers:**
   ```json
   {
     "container_id": "main",
     "submission_package_mapping": {
       "solution": {
         "mount_path": "/app/src",
         "build_step_insert_index": 3
       }
     }
   }
   ```

### For Sidecar Problems

Sidecar problems need to be converted to multi-container architecture:

**Before (Sidecar):**

```json
{
  "evaluation_mode": "sidecar",
  "projectType": "api",
  "sidecar_container": {
    "image": "test-runner:latest",
    "wait_for_ready": true
  }
}
```

**After (Multi-Container):**

```json
{
  "containers": [
    {
      "container_id": "api",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "submission_package_mapping": {
        "api_code": {
          "mount_path": "/app",
          "build_step_insert_index": 2
        }
      },
      "ports": ["3000:3000"],
      "healthcheck": {
        "test": ["CMD", "wget", "--spider", "http://localhost:3000/health"],
        "interval": 5,
        "timeout": 3,
        "retries": 3
      }
    },
    {
      "container_id": "tests",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "dependencies": ["api"],
      "environment": {
        "API_URL": "http://api:3000"
      }
    }
  ],
  "submission_packages": [
    {
      "package_id": "api_code",
      "description": "API implementation",
      "required": true
    }
  ],
  "execution_order": ["tests"]
}
```

## API Changes

### Submission Endpoint

The multi-container submission endpoint remains the same:

**Endpoint:** `POST /api/submissions/multi`

**Request:**

```json
{
  "problemId": "problem-123",
  "packages": [
    {
      "package_id": "solution",
      "package_source": "file",
      "file_field": "solution"
    }
  ]
}
```

**Files:** Multipart form data with file uploads

### Validation

The API now validates that problems have the required `containers` field:

```javascript
if (!problem.containers || !Array.isArray(problem.containers)) {
  throw new Error(
    `Problem ${problemId} missing required 'containers' field. Multi-container architecture is required.`
  );
}
```

## Benefits of Migration

1. **Consistency:** Single architecture to learn and maintain
2. **Flexibility:** Support any language/framework with build steps
3. **Modularity:** Reusable build step modules
4. **Scalability:** Multiple containers for complex evaluations
5. **Maintainability:** Cleaner codebase without legacy paths
6. **Extensibility:** Easy to add new build/runtime step types

## Example Conversions

### Node.js Single-Container → Multi-Container

**Before:**

```json
{
  "container_type": "single-container",
  "dockerfile": "FROM node:18\nWORKDIR /app\nCOPY package*.json ./\nRUN npm install\nCOPY . .\nCMD [\"npm\", \"test\"]"
}
```

**After:**

```json
{
  "containers": [
    {
      "container_id": "tests",
      "base_image": "node:18-alpine",
      "build_steps": [
        { "type": "workdir", "path": "/app" },
        { "type": "copy", "source": "package*.json", "destination": "./" },
        { "type": "run", "command": "npm install" },
        { "type": "copy", "source": ".", "destination": "." },
        { "type": "cmd", "command": ["npm", "test"], "form": "exec" }
      ],
      "submission_package_mapping": {
        "solution": { "mount_path": "/app", "build_step_insert_index": 1 }
      }
    }
  ],
  "submission_packages": [
    {
      "package_id": "solution",
      "description": "Student code",
      "required": true
    }
  ]
}
```

### Python Project

```json
{
  "containers": [
    {
      "container_id": "grader",
      "base_image": "python:3.11-slim",
      "build_steps": [
        { "type": "workdir", "path": "/app" },
        {
          "type": "run",
          "command": "apt-get update && apt-get install -y gcc"
        },
        { "type": "copy", "source": "requirements.txt", "destination": "./" },
        {
          "type": "run",
          "command": "pip install --no-cache-dir -r requirements.txt"
        },
        { "type": "env", "env": { "PYTHONUNBUFFERED": "1" } },
        {
          "type": "cmd",
          "command": ["python", "-m", "pytest", "-v"],
          "form": "exec"
        }
      ],
      "submission_package_mapping": {
        "solution": {
          "mount_path": "/app/solution",
          "build_step_insert_index": 4
        }
      }
    }
  ],
  "submission_packages": [{ "package_id": "solution", "required": true }]
}
```

### Multi-Container Microservices

```json
{
  "containers": [
    {
      "container_id": "database",
      "base_image": "postgres:15-alpine",
      "environment": {
        "POSTGRES_DB": "testdb",
        "POSTGRES_PASSWORD": "testpass"
      },
      "healthcheck": {
        "test": ["CMD-SHELL", "pg_isready -U postgres"],
        "interval": 5,
        "timeout": 3,
        "retries": 5
      }
    },
    {
      "container_id": "api",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "dependencies": ["database"],
      "environment": {
        "DATABASE_URL": "postgresql://postgres:testpass@database:5432/testdb"
      },
      "submission_package_mapping": {
        "api": {"mount_path": "/app"}
      }
    },
    {
      "container_id": "integration_tests",
      "base_image": "node:18-alpine",
      "build_steps": [...],
      "dependencies": ["api", "database"],
      "environment": {
        "API_URL": "http://api:3000"
      }
    }
  ],
  "submission_packages": [
    {"package_id": "api", "required": true}
  ],
  "execution_order": ["integration_tests"]
}
```

## Troubleshooting

### Problem: "Missing required 'containers' field" error

**Solution:** Update problem config.json to include `containers` array.

### Problem: Build step not recognized

**Solution:** Check that step type matches one of the 16 supported types in `BuildStepType` enum.

### Problem: Container dependencies not starting in order

**Solution:** Ensure `dependencies` array lists container_ids in correct order and add health checks.

### Problem: Submission package not being copied

**Solution:** Verify `submission_package_mapping` has correct `mount_path` and `build_step_insert_index`.

## Further Reading

- [Container Architecture Spec](./[SPEC]%20CONTAINER_ARCHITECTURE.md)
- [Multi-Container Examples](./examples/)
- [Build Steps Reference](../src/core/steps/build/index.js)
- [Runtime Steps Reference](../src/core/steps/runtime/index.js)
