# POST /problems

Registers a new problem package and builds the problem Docker image.

**Related Documentation**:

- [`../data-models/containers/resources.md`](../data-models/containers/resources.md) - Problem resources and container mounting
- [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md) - Rubric-to-container mapping
- [`../data-models/samples/problem_package_name.md`](../data-models/samples/problem_package_name.md) - Problem package structure

---

## Description

This endpoint accepts a problem package containing:

- **Configuration** (`config.json`): Problem metadata, execution limits, rubrics
- **Hooks**: Lifecycle scripts (pre-execution, post-execution, periodic monitoring)
- **Data/Resources**: Test data, expected outputs, evaluation utilities
- **Dockerfile**: Base image definition for the problem environment

The judgehost validates the package structure and builds the problem Docker image.

## Request

**Endpoint:** `POST /problems`

**Content-Type:** `multipart/form-data`

### Form Fields

| Field              | Type    | Required    | Description                                                             |
| ------------------ | ------- | ----------- | ----------------------------------------------------------------------- |
| `problem_id`       | string  | Yes         | Unique identifier for the problem (e.g., `"two-sum"`)                   |
| `problem_name`     | string  | Yes         | Human-readable problem name                                             |
| `package_type`     | string  | Yes         | Package source type: `"file"`, `"url"`, or `"git"`                      |
| `problem_package`  | file    | Conditional | Problem package file (required if `package_type="file"`)                |
| `package_url`      | string  | Conditional | URL to download package archive (required if `package_type="url"`)      |
| `archive_checksum` | string  | No          | SHA256 checksum for verification (for `package_type="url"`)             |
| `git_url`          | string  | Conditional | Git repository URL (required if `package_type="git"`)                   |
| `git_branch`       | string  | No          | Git branch (default: `"main"`)                                          |
| `git_commit`       | string  | No          | Specific commit SHA (optional)                                          |
| `project_type`     | string  | No          | Type of project (e.g., `"nodejs-api"`, `"python-script"`, `"database"`) |
| `force_rebuild`    | boolean | No          | Force rebuild if problem exists (default: `false`)                      |
| `timeout`          | integer | No          | Build timeout in seconds (default: `300`)                               |

**Note on Package Sources**:

- **`package_type="file"`**: Upload `problem_package` file directly (.tar.gz or .zip)
- **`package_type="url"`**: Provide `package_url` pointing to a downloadable archive
- **`package_type="git"`**: Provide `git_url` (public repositories only)

### Problem Package Structure

```
problem-package/
├── config.json           # Problem configuration (required)
├── Dockerfile            # Problem image definition (required)
├── hooks/                # Evaluation hooks (optional)
│   ├── pre/              # Pre-execution scripts
│   ├── post/             # Post-execution scripts (testing/evaluation)
│   └── periodic/         # Monitoring scripts
├── data/                 # Test data and resources (optional)
└── README.md             # Problem description (optional)
```

See [`../data-models/containers/resources.md`](../data-models/containers/resources.md) for details on how hooks and data are mounted into containers.

---

## Hooks

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

- Hooks that evaluate rubrics write results to `/out/rubric_<rubric_id>.json`
- Hooks are **executed outside containers** using `docker exec` remote calls
- Tools (not hooks) are **executed inside containers** via entrypoint.sh
- See [`../data-models/containers/resources.md`](../data-models/containers/resources.md) for detailed hook vs tool execution
- See [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md) for rubric-to-container mapping in multi-container setups

---

## config.json Schema

**⚠️ Important**: All problems now use **multi-container architecture**. The `containers` array is **required**.

```json
{
  "problem_id": "string (required)",
  "problem_name": "string (required)",
  "project_type": "string (optional)",
  "version": "string (optional, default: '1.0.0')",
  "description": "string (optional)",

  "containers": [
    {
      "container_id": "string (required) - unique identifier",
      "container_name": "string (optional) - human-readable name",
      "accepts_submission": "boolean (default: false) - true if this container receives submission code",
      "dockerfile_path": "string (required) - path to Dockerfile within package (e.g., 'submission/Dockerfile')",
      "environment": "object (optional) - environment variables",
      "resource_limits": {
        "memory": "string (e.g., '512m')",
        "cpus": "number (e.g., 1.0)",
        "timeout": "integer (seconds)"
      },
      "ports": ["array of strings (optional)"],
      "depends_on": [
        {
          "container_id": "string (required) - container to depend on",
          "condition": "string (optional) - 'started', 'healthy', or 'completed' (default: 'started')",
          "timeout": "integer (optional) - max wait time in seconds",
          "retry": "integer (optional) - number of retries",
          "retry_interval": "integer (optional) - seconds between retries"
        }
      ],
      "terminates": [
        "array of container_ids (optional) - containers to stop when this finishes"
      ],
      "health_check": {
        "command": "string - health check command",
        "interval": "integer (seconds) - time between checks",
        "timeout": "integer (seconds) - max time for check to complete",
        "retries": "integer - consecutive failures before unhealthy",
        "start_period": "integer (seconds) - grace period before checks start"
      }
    }
  ],

  "rubrics": [
    {
      "rubric_id": "string (required)",
      "rubric_name": "string (required)",
      "rubric_type": "string (required)",
      "description": "string (optional)",
      "max_score": "number (required)",
      "weight": "number (default: 1.0)",
      "container": "string (optional) - container_id that evaluates this rubric"
    }
  ],

  "hooks_config": {
    "periodic_interval_seconds": "integer (default: 10)",
    "hook_timeout_seconds": "integer (default: 30)"
  }
}
```

**Key Points**:

- ✅ `containers` array is **required** - must have at least one container
- ✅ `submission_packages` array defines how submissions are distributed to containers
- ✅ `container` in rubrics specifies which container reports each rubric (see [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md))
- ⚠️ Legacy fields removed: `container_type`, `dockerfile`, `evaluation_mode`
- **Note**: All rubrics must be automated - manual rubrics requiring human review are not supported.

---

## Request Examples

### Example 1: File Upload

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=two-sum" \
  -F "problem_name=Two Sum Algorithm" \
  -F "project_type=algorithm" \
  -F "package_type=file" \
  -F "problem_package=@two-sum.tar.gz"
```

### Example 2: Remote Archive URL

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=rest-api-users" \
  -F "problem_name=REST API - User Management" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/problems/rest-api-users.tar.gz" \
  -F "archive_checksum=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

### Example 3: Git Repository

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=full-stack-todo" \
  -F "problem_name=Full Stack Todo App" \
  -F "package_type=git" \
  -F "git_url=https://github.com/instructor/todo-problem.git" \
  -F "git_branch=main"
```

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Problem rest-api-users registered successfully",
  "data": {
    "problem_id": "rest-api-users",
    "problem_name": "REST API - User Management",
    "image_name": "problem-rest-api-users:latest",
    "registered_at": "2025-10-13T10:30:45.123Z"
  }
}
```

### Error Responses

**400 Bad Request - Missing Required Fields**

```json
{
  "success": false,
  "error": "validation_error",
  "message": "Missing required fields",
  "details": {
    "required": ["problem_id", "problem_name", "package_type"]
  }
}
```

**400 Bad Request - Invalid Package Structure**

```json
{
  "success": false,
  "error": "invalid_package_structure",
  "message": "Package must contain config.json"
}
```

**409 Conflict - Problem Already Exists**

```json
{
  "success": false,
  "error": "problem_exists",
  "message": "Problem rest-api-users already exists",
  "details": {
    "problem_id": "rest-api-users",
    "use_force_rebuild": true
  }
}
```

**500 Internal Server Error - Build Failed**

```json
{
  "success": false,
  "error": "build_failed",
  "message": "Docker build failed",
  "details": {
    "problem_id": "rest-api-users",
    "package_type": "file"
  }
}
```

---

## Validation Rules

### Problem ID

- Lowercase alphanumeric with hyphens
- 3-64 characters
- Must start with a letter
- Pattern: `^[a-z][a-z0-9-]{2,63}$`

---

## Notes

1. **Idempotency**: Posting the same problem twice without `force_rebuild=true` returns 409 Conflict
2. **Image Caching**: Docker layer caching speeds up rebuilds
3. **Security**: Problem packages are validated and sandboxed during build
4. **Resource Mounting**: See [`../data-models/containers/resources.md`](../data-models/containers/resources.md) for how hooks and data are made available to containers
