# API: Problem Management

This document describes the API endpoints for managing problem packages in the judgehost system.

**Implementation Status**:

- ✅ **Single-container problems**: Fully supported and production-ready
- ⏳ **Multi-container problems**: Planned feature (not yet implemented)

**Related Documentation**:

- [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) - Project type definitions
- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type specifications
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Two-stage container architecture
- [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) - Queue and resource management

---

## POST /problems

Registers a new problem package and builds the **problem image** (Stage 1 of two-stage architecture).

### Description

This endpoint accepts a problem package containing all resources needed to evaluate submissions:

- **Configuration** (`config.json`): Problem metadata, execution limits, rubrics
- **Hooks**: Lifecycle scripts (pre-execution, post-execution, periodic monitoring)
- **Data/Resources**: Test data, expected outputs, evaluation utilities
- **Dockerfile(s)**: Base image definition(s) for the problem environment

The judgehost validates the package structure and builds the **problem Docker image** that will be extended with submission code during evaluation (see two-stage container architecture in [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md)).

### Request

**Endpoint:** `POST /problems`

**Content-Type:** `multipart/form-data`

#### Form Fields

| Field              | Type    | Required    | Description                                                                                    |
| ------------------ | ------- | ----------- | ---------------------------------------------------------------------------------------------- |
| `problem_id`       | string  | Yes         | Unique identifier for the problem (e.g., `"two-sum"`, `"rest-api-users"`)                      |
| `problem_name`     | string  | Yes         | Human-readable problem name                                                                    |
| `package_type`     | string  | Yes         | Package source type: `"file"`, `"url"`, or `"git"`                                             |
| `problem_package`  | file    | Conditional | Problem package file (required if `package_type="file"`, .tar.gz or .zip)                      |
| `package_url`      | string  | Conditional | URL to download package archive (required if `package_type="url"`)                             |
| `archive_checksum` | string  | No          | SHA256 checksum for verification (recommended for `package_type="url"`)                        |
| `git_url`          | string  | Conditional | Git repository URL (required if `package_type="git"`, public only)                             |
| `git_branch`       | string  | No          | Git branch (default: `"main"`, used with `package_type="git"`)                                 |
| `git_commit`       | string  | No          | Specific commit SHA (optional, used with `package_type="git"`)                                 |
| `project_type`     | string  | Yes         | Type of project - see [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) for full list |
| `force_rebuild`    | boolean | No          | Force rebuild even if image exists (default: `false`)                                          |
| `timeout`          | integer | No          | Build timeout in seconds (default: `300`)                                                      |

**Note on Package Sources**:

- **`package_type="file"`**: Upload `problem_package` file directly
- **`package_type="url"`**: Provide `package_url` (remote archive URL) as a form field
- **`package_type="git"`**: Provide `git_url` (Git repository URL, public only) as a form field

#### Problem Package Structure (Single-Container)

**Example structure** for a single-container problem:

```
problem-package/
├── config.json           # Problem configuration (required)
├── Dockerfile            # Problem image definition (required)
├── hooks/                # Evaluation hooks (optional)
│   ├── pre/              # Pre-execution scripts
│   │   ├── 01_setup.sh
│   │   └── 02_install_deps.sh
│   ├── post/             # Post-execution scripts
│   │   ├── test_api.sh
│   │   └── validate_output.sh
│   └── periodic/         # Monitoring scripts
│       └── monitor_resources.sh
├── data/                 # Test data and resources (optional)
│   ├── test_cases/
│   ├── expected_outputs/
│   └── validation_scripts/
└── README.md             # Problem description (optional)
```

#### Problem Package Structure (Multi-Container)

> **⚠️ Note**: Multi-container problem support is a **planned feature** and not yet implemented in the current version (v0.1.0). The following documentation describes the intended architecture for future releases.

**Example structure** for a multi-container problem (e.g., full-stack web app):

```
problem-package/
├── config.json                    # Global problem configuration (required)
├── docker-compose.yml             # Service orchestration (required)
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
│       └── init.sql
├── hooks/                         # Global hooks (optional)
│   ├── pre/                       # Before any service starts
│   └── post/                      # After all services ready
└── data/                          # Shared test data
```

See [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) for detailed multi-container configuration.

---

## Default Resources and Override Behavior

### Default Tools

The judgehost provides default tools in `/tools/` that are available to all problem containers:

- **`universal_entrypoint.sh`** - Standard entrypoint for orchestrating evaluation
- **`downloader.sh`** - Downloads submissions from Git or archive URLs
- **`script_runner.sh`** - Executes hooks with timeout and logging
- **`monitor.sh`** - Default resource monitoring script

**How to Add Problem-Specific Tools**:

Problems can supplement these default tools by adding their own:

```dockerfile
# In problem Dockerfile
COPY tools/ /problem-tools/
# Both /tools/ (judgehost defaults) and /problem-tools/ (your tools) will exist
```

Or add to PATH:

```dockerfile
COPY custom-tools/ /usr/local/bin/
```

**Override Individual Tools** (use with caution):

```dockerfile
# Replace specific default tool
COPY my_monitor.sh /tools/monitor.sh
```

**Best Practice**: Extend rather than replace. Keep judgehost defaults and add your tools to a separate directory like `/problem-tools/`.

---

### Default Monitor Script

The judgehost includes a default periodic monitoring script (`/tools/monitor.sh`) that automatically tracks:

- CPU and memory usage
- Disk I/O
- Network traffic (if enabled)

**Behavior**:

- Runs automatically during evaluation if no problem-specific periodic hooks are provided
- Writes metrics to `/out/metrics.json`
- Interval controlled by `hooks_config.periodic_interval_seconds` (default: 10 seconds)

**Options for Customization**:

1. **Supplement with additional monitors** - Add your own periodic hooks:

   ```
   problem-package/
   ├── hooks/
   │   └── periodic/
   │       └── 01_check_app_health.sh    # Runs alongside default monitor
   ```

   Both the default monitor and your custom hooks will execute.

2. **Disable default monitor** - Set in `config.json`:

   ```json
   {
     "hooks_config": {
       "use_default_monitor": false,
       "periodic_interval_seconds": 10
     }
   }
   ```

3. **Replace default monitor entirely** - Override the file:
   ```dockerfile
   COPY custom_monitor.sh /tools/monitor.sh
   ```

---

### Hooks

Problems define evaluation logic through hooks in three categories:

- **Pre-execution hooks** (`hooks/pre/`) - Run before submission starts (e.g., install dependencies, setup database)
- **Post-execution hooks** (`hooks/post/`) - Run after submission starts (e.g., run tests, evaluate output)
- **Periodic hooks** (`hooks/periodic/`) - Run continuously during evaluation (e.g., monitor custom metrics)

**Hook Execution Order**:

1. Pre-execution hooks run sequentially in lexicographic order (01*, 02*, etc.)
2. Submission application starts
3. Post-execution hooks run (may run concurrently if independent)
4. Periodic hooks run at specified intervals until evaluation completes

**Hook Output**:

- Hooks that evaluate rubrics must write results to `/out/rubric_<rubric_id>.json`
  -- See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for output format
- See [`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) for detailed hook authoring guide

---

## config.json Schema (Single-Container)

**Example** for a single-container problem:

```json
{
  "problem_id": "string (required)",
  "problem_name": "string (required)",
  "project_type": "string (required) - see [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md)",
  "version": "string (optional, default: '1.0.0')",
  "description": "string (optional)",
  "resource_limits": {
    "memory_mb": "integer (default: 512, max: from env JUDGEHOST_CONTAINER_MAX_MEMORY_MB)",
    "cpu_cores": "number (default: 1.0, max: from env JUDGEHOST_CONTAINER_MAX_CPU_CORES)",
    "disk_mb": "integer (default: 1024, max: from env JUDGEHOST_CONTAINER_MAX_DISK_MB)",
    "network_enabled": "boolean (default: false)",
    "timeout_seconds": "integer (default: 300)"
  },
  "execution_config": {
    "working_directory": "string (default: '/workspace')",
    "command": "array of strings (optional)",
    "environment": "object (optional)",
    "ports": "array of integers (optional)"
  },
  "rubrics": [
    {
      "id": "string (required)",
      "name": "string (required)",
  "rubric_type": "string (required) - see [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md),
      "description": "string (optional)",
      "max_score": "number (required)",
      "weight": "number (default: 1.0)"
    }
  ],
  "hooks_config": {
    "periodic_interval_seconds": "integer (default: 10)",
    "hook_timeout_seconds": "integer (default: 30)",
    "use_default_monitor": "boolean (default: true)"
  }
}
```

**Note on Resource Limits**: Maximum values are hardware-dependent and configured via environment variables:

- `JUDGEHOST_CONTAINER_MAX_MEMORY_MB` (e.g., 4096)
- `JUDGEHOST_CONTAINER_MAX_CPU_CORES` (e.g., 4.0)
- `JUDGEHOST_CONTAINER_MAX_DISK_MB` (e.g., 10240)

**Default vs Override Behavior**:

- **Resource limits**: Each field has a default value (e.g., `memory_mb: 512`). Problems can override these values up to the judgehost hardware maximum. If omitted, the default is used.
- **Network**: Default is `false` for security. Problems requiring network access must explicitly set `network_enabled: true`.
- **Timeout**: Default is `300` seconds (5 minutes). Problems can specify longer timeouts if needed.
- **Working directory**: Default is `/workspace`. Can be overridden if the problem requires a different location.
- **Environment variables**: Problems provide additional variables that supplement judgehost defaults (problem variables take precedence for duplicate keys).

See [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) for details on resource management and [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) for recommended defaults per project type.

#### config.json Schema (Multi-Container)

**Example** for a multi-container problem:

```json
{
  "problem_id": "string (required)",
  "problem_name": "string (required)",
  "project_type": "string (required)",
  "multi_container": true,
  "version": "string (optional)",
  "description": "string (optional)",
  "services": [
    {
      "name": "string (required)",
      "type": "string (optional) - service type hint",
      "dockerfile": "string (required) - path to Dockerfile",
      "resource_limits": {
        "memory_mb": "integer",
        "cpu_cores": "number"
      },
      "ports": "array of integers (optional)",
      "network_enabled": "boolean",
      "submission_target": "boolean - can submission code be loaded here?"
    }
  ],
  "rubrics": [
    {
      "id": "string",
      "name": "string",
      "rubric_type": "string - see [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md)",
      "max_score": "number",
      "weight": "number",
      "target_service": "string (optional) - which service to evaluate"
    }
  ],
  "hooks_config": {
    "periodic_interval_seconds": "integer (default: 10)",
    "hook_timeout_seconds": "integer (default: 30)",
    "use_default_monitor": "boolean (default: true)"
  }
}
```

**Important**:

- Only **automated rubrics** are supported - all rubrics must be evaluated by hooks
- Manual rubrics (human review) are not supported in judgehost
- Total resources across all services must not exceed judgehost limits
- See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for standard `rubric_type` values
- Resource limits for multi-container: If omitted for a service, defaults from [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) are used based on the problem's `project_type`

---

### Request Examples

#### Example 1: File Upload (package_type="file")

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=two-sum" \
  -F "problem_name=Two Sum Algorithm" \
  -F "project_type=algorithm" \
  -F "package_type=file" \
  -F "problem_package=@two-sum.tar.gz"
```

#### Example 2: Remote Archive URL (package_type="url")

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=rest-api-users" \
  -F "problem_name=REST API - User Management" \
  -F "project_type=web_api" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/problems/rest-api-users-v2.tar.gz" \
  -F "archive_checksum=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

#### Example 3: Git Repository (package_type="git")

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=full-stack-todo" \
  -F "problem_name=Full Stack Todo App" \
  -F "project_type=full_stack_web" \
  -F "package_type=git" \
  -F "git_url=https://github.com/instructor/todo-problem.git" \
  -F "git_branch=main" \
  -F "git_commit=a1b2c3d4e5f6789012345678901234567890abcd"
```

#### Example 4: Git Repository with Force Rebuild

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=database-design" \
  -F "problem_name=Database Schema Design" \
  -F "project_type=database" \
  -F "package_type=git" \
  -F "git_url=https://github.com/instructor/db-problem.git" \
  -F "force_rebuild=true" \
  -F "timeout=600"
```

### Response

#### Success Response (201 Created)

```json
{
  "success": true,
  "problem_id": "rest-api-users",
  "problem_name": "REST API - User Management",
  "project_type": "web_api",
  "image_id": "problem-rest-api-users:latest",
  "image_size_mb": 342.5,
  "build_time_seconds": 45.3,
  "validation": {
    "config_valid": true,
    "hooks_found": {
      "pre": 2,
      "post": 3,
      "periodic": 1
    },
    "data_files_count": 15,
    "dockerfile_valid": true
  },
  "rubrics": [
    {
      "id": "api_correctness",
      "name": "API Correctness",
      "rubric_type": "api_endpoints",
      "max_score": 40,
      "weight": 1.0
    },
    {
      "id": "security",
      "name": "Security Implementation",
      "rubric_type": "security_scan",
      "max_score": 20,
      "weight": 1.0
    },
    {
      "id": "code_quality",
      "name": "Code Quality",
      "rubric_type": "code_quality",
      "max_score": 20,
      "weight": 0.5
    }
  ],
  "resource_limits": {
    "memory_mb": 1024,
    "cpu_cores": 2.0,
    "disk_mb": 2048,
    "network_enabled": true,
    "timeout_seconds": 300
  },
  "created_at": "2025-10-13T10:30:45.123Z"
}
```

#### Error Responses

**400 Bad Request - Missing Required Fields**

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Missing required fields",
  "details": {
    "missing_fields": ["problem_id", "package_type"],
    "received_fields": ["problem_name", "project_type"]
  }
}
```

**400 Bad Request - Invalid Problem Package**

```json
{
  "success": false,
  "error": "invalid_package",
  "message": "Problem package validation failed",
  "details": {
    "errors": [
      {
        "type": "missing_file",
        "file": "config.json",
        "message": "Required file config.json not found in package"
      },
      {
        "type": "invalid_json",
        "file": "config.json",
        "message": "Invalid JSON syntax at line 15, column 3"
      },
      {
        "type": "missing_dockerfile",
        "message": "Dockerfile not found in package root"
      }
    ]
  }
}
```

**400 Bad Request - Invalid Configuration**

```json
{
  "success": false,
  "error": "invalid_config",
  "message": "Problem configuration validation failed",
  "details": {
    "config_errors": [
      {
        "field": "rubrics[0].max_score",
        "message": "Must be a positive number",
        "received": -10
      },
      {
        "field": "resource_limits.memory_mb",
        "message": "Must be between 128 and 8192",
        "received": 16384
      },
      {
        "field": "project_type",
        "message": "Invalid project type",
        "received": "unknown_type",
        "allowed": [
          "algorithm",
          "web_api",
          "full_stack_web",
          "database_design",
          "cli_tool",
          "data_processing"
        ]
      }
    ]
  }
}
```

**409 Conflict - Problem Already Exists**

```json
{
  "success": false,
  "error": "problem_exists",
  "message": "Problem with this ID already exists",
  "details": {
    "problem_id": "rest-api-users",
    "existing_version": "1.0.0",
    "created_at": "2025-10-12T14:20:30.000Z",
    "suggestion": "Use force_rebuild=true to rebuild, or choose a different problem_id"
  }
}
```

**500 Internal Server Error - Build Failed**

```json
{
  "success": false,
  "error": "build_failed",
  "message": "Docker image build failed",
  "details": {
    "problem_id": "rest-api-users",
    "build_logs": "Step 3/8 : RUN npm install\nERROR: npm ERR! Cannot find module 'express'\n...",
    "exit_code": 1,
    "build_time_seconds": 12.5
  }
}
```

**503 Service Unavailable - Docker Not Available**

```json
{
  "success": false,
  "error": "docker_unavailable",
  "message": "Docker service is not available",
  "details": {
    "docker_status": "unreachable",
    "error": "connect ECONNREFUSED /var/run/docker.sock"
  }
}
```

---

## PUT /problems/:problem_id

Updates an existing problem package and optionally rebuilds the Docker image.

### Description

Updates problem configuration, hooks, or resources. Can be used to:

- Update rubrics or resource limits
- Add/modify hooks
- Update test data
- Rebuild the image with new dependencies

### Request

**Endpoint:** `PUT /problems/:problem_id`

**Content-Type:** `multipart/form-data`

#### URL Parameters

| Parameter    | Type   | Required | Description                                    |
| ------------ | ------ | -------- | ---------------------------------------------- |
| `problem_id` | string | Yes      | The unique identifier of the problem to update |

#### Form Fields

| Field             | Type        | Required | Description                                                  |
| ----------------- | ----------- | -------- | ------------------------------------------------------------ |
| `problem_package` | file        | No       | Updated problem package archive                              |
| `config`          | JSON string | No       | Updated configuration (can be partial)                       |
| `force_rebuild`   | boolean     | No       | Force rebuild even if no changes detected (default: `false`) |
| `update_mode`     | string      | No       | `"replace"` (default) or `"merge"` for config updates        |

### Request Examples

#### Example 1: Update Configuration Only

```bash
curl -X PUT http://localhost:3000/api/problems/rest-api-users \
  -F 'config={
    "resource_limits": {
      "memory_mb": 2048,
      "timeout_seconds": 600
    }
  };type=application/json' \
  -F "update_mode=merge"
```

#### Example 2: Upload New Package and Rebuild

```bash
curl -X PUT http://localhost:3000/api/problems/rest-api-users \
  -F "problem_package=@rest-api-users-v2.tar.gz" \
  -F "force_rebuild=true"
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "problem_id": "rest-api-users",
  "updated": true,
  "rebuilt": true,
  "changes": {
    "config_updated": true,
    "hooks_modified": ["post/test_api.sh"],
    "data_files_added": 3,
    "data_files_removed": 1
  },
  "image_id": "problem-rest-api-users:latest",
  "previous_image_id": "sha256:abc123...",
  "build_time_seconds": 38.7,
  "updated_at": "2025-10-13T11:15:30.456Z"
}
```

#### Error Responses

**404 Not Found**

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem with the specified ID does not exist",
  "details": {
    "problem_id": "unknown-problem",
    "suggestion": "Use POST /problems to create a new problem"
  }
}
```

**400 Bad Request - No Updates Provided**

```json
{
  "success": false,
  "error": "no_updates",
  "message": "No update data provided",
  "details": {
    "message": "Provide either 'problem_package' or 'config' to update"
  }
}
```

---

## DELETE /problems/:problem_id

Deletes a problem and its associated Docker image.

### Request

**Endpoint:** `DELETE /problems/:problem_id`

#### Query Parameters

| Parameter | Type    | Required | Description                                                      |
| --------- | ------- | -------- | ---------------------------------------------------------------- |
| `force`   | boolean | No       | Force delete even if active submissions exist (default: `false`) |

### Request Example

```bash
curl -X DELETE "http://localhost:3000/api/problems/rest-api-users?force=true"
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "problem_id": "rest-api-users",
  "deleted": true,
  "image_removed": true,
  "deleted_at": "2025-10-13T11:20:00.000Z"
}
```

#### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "active_submissions",
  "message": "Cannot delete problem with active submissions",
  "details": {
    "problem_id": "rest-api-users",
    "active_submission_count": 5,
    "suggestion": "Use force=true to delete anyway, or wait for submissions to complete"
  }
}
```

---

## GET /problems

Lists all registered problems.

### Request

**Endpoint:** `GET /problems`

#### Query Parameters

| Parameter       | Type    | Required | Description                                      |
| --------------- | ------- | -------- | ------------------------------------------------ |
| `project_type`  | string  | No       | Filter by project type                           |
| `include_stats` | boolean | No       | Include submission statistics (default: `false`) |

### Response

```json
{
  "success": true,
  "problems": [
    {
      "problem_id": "rest-api-users",
      "problem_name": "REST API - User Management",
      "project_type": "web_api",
      "version": "1.0.0",
      "image_id": "problem-rest-api-users:latest",
      "image_size_mb": 342.5,
      "created_at": "2025-10-13T10:30:45.123Z",
      "updated_at": "2025-10-13T11:15:30.456Z",
      "stats": {
        "total_submissions": 45,
        "active_submissions": 2,
        "completed_submissions": 43
      }
    }
  ],
  "count": 1
}
```

---

## Validation Rules

### Problem ID

- Lowercase alphanumeric with hyphens
- 3-64 characters
- Must start with a letter
- Pattern: `^[a-z][a-z0-9-]{2,63}$`

### Project Types

- `algorithm` - Traditional algorithmic problems
- `web_api` - REST/GraphQL API implementations
- `full_stack_web` - Complete web applications
- `database_design` - Database schema and queries
- `cli_tool` - Command-line applications
- `data_processing` - ETL, data analysis, ML pipelines

### Resource Limits

- `memory_mb`: 128 - 8192 MB
- `cpu_cores`: 0.5 - 8.0 cores
- `disk_mb`: 512 - 10240 MB
- `timeout_seconds`: 10 - 3600 seconds

### Rubric Scores

- `max_score`: Must be positive number
- `weight`: 0.0 - 10.0
- Total weighted score typically sums to 100

---

## Notes

1. **Idempotency**: Posting the same problem twice without `force_rebuild` will return 409 Conflict
2. **Image Caching**: Docker layer caching is used to speed up rebuilds
3. **Async Building**: Large images may be built asynchronously; check status with GET endpoint
4. **Cleanup**: Old images are automatically cleaned up after 7 days if no active submissions exist
5. **Security**: Problem packages are validated and sandboxed during build
