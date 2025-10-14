# API: Problem Management

This document describes the API endpoints for managing problem packages in the judgehost system.

**Related Documentation**:

- [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) - Project type definitions
- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type specifications
- [`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) - Hook authoring guide

---

## POST /problems

Registers a new problem package and builds the problem Docker image.

### Description

This endpoint accepts a problem package containing:

- **Configuration** (`config.json`): Problem metadata, execution limits, rubrics
- **Hooks**: Lifecycle scripts (pre-execution, post-execution, periodic monitoring)
- **Data/Resources**: Test data, expected outputs, evaluation utilities
- **Dockerfile**: Base image definition for the problem environment

The judgehost validates the package structure and builds the problem Docker image.

### Request

**Endpoint:** `POST /problems`

**Content-Type:** `multipart/form-data`

#### Form Fields

| Field              | Type    | Required    | Description                                                                      |
| ------------------ | ------- | ----------- | -------------------------------------------------------------------------------- |
| `problem_id`       | string  | Yes         | Unique identifier for the problem (e.g., `"two-sum"`)                            |
| `problem_name`     | string  | Yes         | Human-readable problem name                                                      |
| `package_type`     | string  | Yes         | Package source type: `"file"`, `"url"`, or `"git"`                               |
| `problem_package`  | file    | Conditional | Problem package file (required if `package_type="file"`)                         |
| `package_url`      | string  | Conditional | URL to download package archive (required if `package_type="url"`)               |
| `archive_checksum` | string  | No          | SHA256 checksum for verification (for `package_type="url"`)                      |
| `git_url`          | string  | Conditional | Git repository URL (required if `package_type="git"`)                            |
| `git_branch`       | string  | No          | Git branch (default: `"main"`)                                                   |
| `git_commit`       | string  | No          | Specific commit SHA (optional)                                                   |
| `project_type`     | string  | No          | Type of project (see [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md)) |
| `force_rebuild`    | boolean | No          | Force rebuild if problem exists (default: `false`)                               |
| `timeout`          | integer | No          | Build timeout in seconds (default: `300`)                                        |

**Note on Package Sources**:

- **`package_type="file"`**: Upload `problem_package` file directly (.tar.gz or .zip)
- **`package_type="url"`**: Provide `package_url` pointing to a downloadable archive
- **`package_type="git"`**: Provide `git_url` (public repositories only)

#### Problem Package Structure

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

- Hooks that evaluate rubrics write results to `/out/rubric_<rubric_id>.json`
- See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for output format
- See [`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) for detailed hook authoring guide

---

## config.json Schema

```json
{
  "problem_id": "string (required)",
  "problem_name": "string (required)",
  "project_type": "string (optional) - see [SPEC] PROJECT_TYPES.md",
  "version": "string (optional, default: '1.0.0')",
  "description": "string (optional)",
  "resource_limits": {
    "memory_mb": "integer (default: 512)",
    "cpu_cores": "number (default: 1.0)",
    "disk_mb": "integer (default: 1024)",
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
      "rubric_type": "string (required) - see [SPEC] RUBRIC_TYPES.md",
      "description": "string (optional)",
      "max_score": "number (required)",
      "weight": "number (default: 1.0)"
    }
  ],
  "hooks_config": {
    "periodic_interval_seconds": "integer (default: 10)",
    "hook_timeout_seconds": "integer (default: 30)"
  }
}
```

**Note**: All rubrics must be automated - manual rubrics requiring human review are not supported.

---

### Request Examples

#### Example 1: File Upload

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=two-sum" \
  -F "problem_name=Two Sum Algorithm" \
  -F "project_type=algorithm" \
  -F "package_type=file" \
  -F "problem_package=@two-sum.tar.gz"
```

#### Example 2: Remote Archive URL

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=rest-api-users" \
  -F "problem_name=REST API - User Management" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/problems/rest-api-users.tar.gz" \
  -F "archive_checksum=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"
```

#### Example 3: Git Repository

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=full-stack-todo" \
  -F "problem_name=Full Stack Todo App" \
  -F "package_type=git" \
  -F "git_url=https://github.com/instructor/todo-problem.git" \
  -F "git_branch=main"
```

---

### Response

#### Success Response (201 Created)

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

#### Error Responses

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

## GET /problems

Lists all registered problems.

**Endpoint:** `GET /problems`

### Response

```json
{
  "success": true,
  "data": {
    "problems": [
      {
        "problem_id": "rest-api-users",
        "problem_name": "REST API - User Management",
        "project_type": "web_api",
        "rubrics": [...]
      }
    ],
    "total": 1
  }
}
```

---

## GET /problems/:problem_id

Get detailed information about a specific problem.

**Endpoint:** `GET /problems/:problem_id`

### Response

```json
{
  "success": true,
  "data": {
    "problem_id": "rest-api-users",
    "problem_name": "REST API - User Management",
    "project_type": "web_api",
    "rubrics": [...]
  }
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem rest-api-users not found"
}
```

---

## DELETE /problems/:problem_id

Deletes a problem and its associated Docker image.

**Endpoint:** `DELETE /problems/:problem_id`

### Response

```json
{
  "success": true,
  "message": "Problem rest-api-users deleted successfully"
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem rest-api-users not found"
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
