# API: Submission Management

This document describes the API endpoints for managing submissions in the judgehost system.

**Related Documentation**:

- [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) - Queue behavior and prioritization
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Two-stage container architecture
- [`[SPEC] PROJECT_TYPES.md`](%5BSPEC%5D%20PROJECT_TYPES.md) - Project type definitions
- [`[API] RESULT.md`](%5BAPI%5D%20RESULT.md) - Result retrieval

---

## POST /submissions

Submits a new solution for evaluation against a specific problem.

### Description

**Important**: The judgehost is called by DOMserver, not directly by teams. Submissions are provided via URLs or file uploads.

This endpoint accepts a submission containing the solution code/project to be evaluated. The submission can be provided via:

- **Git repository URL** (public repositories only)
- **Remote archive URL** (ZIP or tarball with optional checksum verification)
- **File upload** (multipart/form-data, if supported by DOMserver)

The judgehost will:

1. Download or receive the submission (from Git, URL, or file upload)
2. Queue the submission for evaluation (see [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md))
3. Build an **evaluation image** on top of the problem image (two-stage architecture)
4. Create an isolated container environment
5. Run the problem's evaluation hooks to assess the solution

### Request

**Endpoint:** `POST /submissions`

**Content-Type:** `multipart/form-data`

#### Form Fields

| Field                 | Type        | Required    | Description                                                                                     |
| --------------------- | ----------- | ----------- | ----------------------------------------------------------------------------------------------- |
| `problem_id`          | string      | Yes         | ID of the problem to evaluate against                                                           |
| `package_type`        | string      | Yes         | Source type: `"git"`, `"url"`, or `"file"`                                                      |
| `submission_file`     | file        | Conditional | Submission file (required if `package_type="file"`, .zip or .tar.gz)                            |
| `package_url`         | string      | Conditional | URL to download archive (required if `package_type="url"`)                                      |
| `archive_checksum`    | string      | No          | SHA256 checksum for verification (recommended for `package_type="url"`)                         |
| `git_url`             | string      | Conditional | Git repository URL (required if `package_type="git"`, public only)                              |
| `git_branch`          | string      | No          | Git branch (default: `"main"`, used with `package_type="git"`)                                  |
| `git_commit`          | string      | No          | Specific commit SHA (optional, used with `package_type="git"`)                                  |
| `team_id`             | string      | No          | Team or user identifier                                                                         |
| `submission_metadata` | JSON object | No          | Additional metadata (tags, notes, etc.)                                                         |
| `priority`            | integer     | No          | Queue priority: 1-10 (default: 5, see [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md)) |
| `notification_url`    | string      | No          | Webhook URL to notify when evaluation completes                                                 |
| `timeout_override`    | integer     | No          | Override problem's timeout (seconds, cannot exceed problem's max limit)                         |
| `target_service`      | string      | No          | For multi-container: which service gets the submission code                                     |
| `multi_service`       | boolean     | No          | For multi-container: submission has code for multiple services                                  |
| `service_mappings`    | array       | Conditional | For multi-service: map submission paths to services                                             |

**Note on Package Sources**:

- **`package_type="file"`**: Upload `submission_file` directly
- **`package_type="url"`**: Provide `package_url` (remote archive URL) as a form field
- **`package_type="git"`**: Provide `git_url` (Git repository URL, public only) as a form field

**Note on Overrides**:

- `timeout_override`: Can reduce or increase the problem's default timeout, but **cannot exceed** the problem's configured maximum `timeout_seconds`. Used when a team knows their solution needs less (or more) time than the problem default.
- `priority`: See [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) for priority levels. Higher priority submissions are evaluated first.

---

#### Multi-Container Submissions

For multi-container problems, submissions can target one or more services:

**Single-Service Submission**:

```json
{
  "problem_id": "full-stack-todo",
  "package_type": "git",
  "git_url": "https://github.com/team/backend-solution.git",
  "target_service": "backend"
}
```

**Multi-Service Submission** (archive with multiple directories):

```json
{
  "problem_id": "full-stack-todo",
  "package_type": "url",
  "package_url": "https://cdn.example.com/submissions/team-42.zip",
  "multi_service": true,
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

See [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) for details on multi-container architecture.

### Request Examples

#### Example 1: File Upload (package_type="file")

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=rest-api-users" \
  -F "package_type=file" \
  -F "submission_file=@my-solution.zip" \
  -F "team_id=team-42" \
  -F "priority=7"
```

#### Example 2: Git Repository (package_type="git")

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=rest-api-users" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team42/rest-api-solution.git" \
  -F "git_branch=main" \
  -F "team_id=team-42" \
  -F "priority=7"
```

#### Example 3: Remote Archive URL (package_type="url")

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=database-design" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/submissions/team42-v3.tar.gz" \
  -F "archive_checksum=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" \
  -F "team_id=team-42" \
  -F "priority=8"
```

#### Example 4: Git with Specific Commit

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=full-stack-todo" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team42/todo-app-solution.git" \
  -F "git_branch=submission" \
  -F "git_commit=a1b2c3d4e5f6789012345678901234567890abcd" \
  -F "team_id=team-42" \
  -F "notification_url=https://api.example.com/webhooks/submission-complete"
```

#### Example 5: Multi-Container (Single Service, Git)

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=full-stack-todo" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team/backend-solution.git" \
  -F "target_service=backend" \
  -F "team_id=team-42"
```

#### Example 6: Multi-Container (Multiple Services, URL)

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=full-stack-todo" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/submissions/team-42-full.zip" \
  -F "multi_service=true" \
  -F "team_id=team-42" \
  -F "priority=7"
```

**Note**: For complex data like `service_mappings` array, you may need to pass as JSON string:

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=full-stack-todo" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/submissions/team-42-full.zip" \
  -F "multi_service=true" \
  -F 'service_mappings=[{"service":"frontend","path":"frontend/"},{"service":"backend","path":"backend/"}]' \
  -F "team_id=team-42" \
  -F "priority=7"
```

### Response

#### Success Response (201 Created)

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "queued",
  "queue_position": 3,
  "estimated_start_time": "2025-10-13T10:35:00.000Z",
  "estimated_completion_time": "2025-10-13T10:40:00.000Z",
  "package_type": "git",
  "git_info": {
    "url": "https://github.com/team42/rest-api-solution.git",
    "branch": "main",
    "commit": "a1b2c3d4e5f6789012345678901234567890abcd"
  },
  "team_id": "team-42",
  "priority": 7,
  "resource_allocation": {
    "memory_mb": 1024,
    "cpu_cores": 2.0,
    "network_enabled": true,
    "timeout_seconds": 300
  },
  "created_at": "2025-10-13T10:30:15.789Z",
  "urls": {
    "status": "/api/submissions/sub_1234567890abcdef",
    "result": "/api/results/sub_1234567890abcdef",
    "logs": "/api/submissions/sub_1234567890abcdef/logs"
  }
}
```

#### Success Response (202 Accepted) - Immediate Execution

If the queue is empty and resources are available:

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "running",
  "started_at": "2025-10-13T10:30:15.890Z",
  "container_id": "eval-sub_1234567890abcdef",
  "created_at": "2025-10-13T10:30:15.789Z",
  "urls": {
    "status": "/api/submissions/sub_1234567890abcdef",
    "result": "/api/results/sub_1234567890abcdef",
    "logs": "/api/submissions/sub_1234567890abcdef/logs"
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
    "missing_fields": ["problem_id"],
    "received_fields": ["package_type", "git_url"]
  }
}
```

**400 Bad Request - Invalid Package Type**

```json
{
  "success": false,
  "error": "invalid_package_type",
  "message": "Invalid package type configuration",
  "details": {
    "package_type": "git",
    "error": "git_url is required when package_type is 'git'",
    "received_fields": ["problem_id", "package_type"]
  }
}
```

**400 Bad Request - Invalid Git URL**

```json
{
  "success": false,
  "error": "invalid_git_url",
  "message": "Git URL validation failed",
  "details": {
    "git_url": "not-a-valid-url",
    "error": "URL must start with http://, https://, or git@",
    "examples": [
      "https://github.com/user/repo.git",
      "git@github.com:user/repo.git"
    ]
  }
}
```

**400 Bad Request - Checksum Mismatch**

```json
{
  "success": false,
  "error": "checksum_mismatch",
  "message": "Downloaded file checksum does not match provided checksum",
  "details": {
    "expected_checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    "actual_checksum": "d4a5b6c7e8f9012345678901234567890123456789012345678901234567890a",
    "package_url": "https://cdn.example.com/submissions/team42-v3.tar.gz"
  }
}
```

**404 Not Found - Problem Does Not Exist**

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem with the specified ID does not exist",
  "details": {
    "problem_id": "unknown-problem",
    "suggestion": "Check the problem ID or create the problem first using POST /problems"
  }
}
```

**413 Payload Too Large**

```json
{
  "success": false,
  "error": "submission_too_large",
  "message": "Submission exceeds maximum allowed size",
  "details": {
    "submission_size_mb": 512,
    "max_allowed_size_mb": 256,
    "suggestion": "Remove unnecessary files or use Git LFS for large assets"
  }
}
```

**422 Unprocessable Entity - Git Clone Failed**

```json
{
  "success": false,
  "error": "git_clone_failed",
  "message": "Failed to clone Git repository",
  "details": {
    "git_url": "https://github.com/team42/nonexistent-repo.git",
    "error": "Repository not found or not accessible",
    "suggestion": "Verify the repository URL and ensure it is publicly accessible"
  }
}
```

**503 Service Unavailable - Queue Full**

```json
{
  "success": false,
  "error": "queue_full",
  "message": "Submission queue is at capacity",
  "details": {
    "queue_size": 100,
    "max_queue_size": 100,
    "suggestion": "Try again in a few minutes or contact administrators",
    "retry_after_seconds": 60
  }
}
```

**Note**: See `[SPEC] QUEUE_SYSTEM.md` for details on queue behavior, size limits, and rate limiting.

---

## PUT /submissions/:submission_id

Updates a submission (limited operations while queued).

### Description

Allows updating certain properties of a submission while it's still queued. Once a submission starts running, it cannot be modified (only cancelled).

### Request

**Endpoint:** `PUT /submissions/:submission_id`

**Content-Type:** `application/json`

#### URL Parameters

| Parameter       | Type   | Required | Description                             |
| --------------- | ------ | -------- | --------------------------------------- |
| `submission_id` | string | Yes      | The unique identifier of the submission |

#### JSON Body

| Field                 | Type        | Required | Description                  |
| --------------------- | ----------- | -------- | ---------------------------- |
| `priority`            | integer     | No       | Update queue priority (1-10) |
| `notification_url`    | string      | No       | Update webhook URL           |
| `submission_metadata` | JSON object | No       | Update metadata              |

### Request Example

```bash
curl -X PUT http://localhost:3000/api/submissions/sub_1234567890abcdef \
  -H "Content-Type: application/json" \
  -d '{
    "priority": 9,
    "notification_url": "https://api.example.com/webhooks/urgent",
    "submission_metadata": {
      "urgent": true,
      "reason": "contest deadline approaching"
    }
  }'
```

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "updated": true,
  "changes": {
    "priority": {
      "old": 5,
      "new": 9
    },
    "notification_url": {
      "old": null,
      "new": "https://api.example.com/webhooks/urgent"
    },
    "queue_position": {
      "old": 8,
      "new": 2
    }
  },
  "status": "queued",
  "updated_at": "2025-10-13T10:32:00.000Z"
}
```

#### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "submission_running",
  "message": "Cannot update submission that is already running",
  "details": {
    "submission_id": "sub_1234567890abcdef",
    "status": "running",
    "started_at": "2025-10-13T10:31:00.000Z",
    "suggestion": "Use DELETE to cancel the submission instead"
  }
}
```

---

## DELETE /submissions/:submission_id

Cancels a queued or running submission.

### Request

**Endpoint:** `DELETE /submissions/:submission_id`

#### Query Parameters

| Parameter | Type   | Required | Description             |
| --------- | ------ | -------- | ----------------------- |
| `reason`  | string | No       | Reason for cancellation |

### Request Example

```bash
curl -X DELETE "http://localhost:3000/api/submissions/sub_1234567890abcdef?reason=Wrong+file+uploaded"
```

### Response

#### Success Response (200 OK) - Queued Submission

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "cancelled": true,
  "status": "cancelled",
  "was_status": "queued",
  "reason": "Wrong file uploaded",
  "cancelled_at": "2025-10-13T10:33:00.000Z"
}
```

#### Success Response (200 OK) - Running Submission

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "cancelled": true,
  "status": "cancelled",
  "was_status": "running",
  "container_stopped": true,
  "reason": "Wrong file uploaded",
  "cancelled_at": "2025-10-13T10:33:00.000Z",
  "resources_cleaned": true
}
```

#### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "submission_completed",
  "message": "Cannot cancel a submission that has already completed",
  "details": {
    "submission_id": "sub_1234567890abcdef",
    "status": "completed",
    "completed_at": "2025-10-13T10:32:00.000Z"
  }
}
```

---

## GET /submissions/:submission_id

Retrieves the current status and details of a submission.

### Request

**Endpoint:** `GET /submissions/:submission_id`

#### Query Parameters

| Parameter      | Type    | Required | Description                               |
| -------------- | ------- | -------- | ----------------------------------------- |
| `include_logs` | boolean | No       | Include execution logs (default: `false`) |

### Response

#### Queued Submission

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "queued",
  "queue_position": 3,
  "estimated_start_time": "2025-10-13T10:35:00.000Z",
  "team_id": "team-42",
  "priority": 7,
  "created_at": "2025-10-13T10:30:15.789Z",
  "updated_at": "2025-10-13T10:30:15.789Z"
}
```

#### Running Submission

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "running",
  "container_id": "eval-sub_1234567890abcdef",
  "progress": {
    "phase": "evaluation",
    "current_step": "Running post-execution hooks",
    "steps_completed": 5,
    "total_steps": 7,
    "percent_complete": 71
  },
  "started_at": "2025-10-13T10:35:00.123Z",
  "elapsed_seconds": 45,
  "estimated_remaining_seconds": 18,
  "resource_usage": {
    "memory_mb": 856,
    "memory_limit_mb": 1024,
    "cpu_percent": 65.3
  },
  "created_at": "2025-10-13T10:30:15.789Z",
  "updated_at": "2025-10-13T10:35:45.456Z"
}
```

#### Completed Submission

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "completed",
  "result_available": true,
  "created_at": "2025-10-13T10:30:15.789Z",
  "started_at": "2025-10-13T10:35:00.123Z",
  "completed_at": "2025-10-13T10:40:15.678Z",
  "total_time_seconds": 315.6,
  "urls": {
    "result": "/api/results/sub_1234567890abcdef",
    "logs": "/api/submissions/sub_1234567890abcdef/logs"
  }
}
```

---

## GET /submissions

Lists all submissions with optional filtering.

### Request

**Endpoint:** `GET /submissions`

#### Query Parameters

| Parameter    | Type    | Required | Description                                                                         |
| ------------ | ------- | -------- | ----------------------------------------------------------------------------------- |
| `problem_id` | string  | No       | Filter by problem                                                                   |
| `team_id`    | string  | No       | Filter by team                                                                      |
| `status`     | string  | No       | Filter by status: `"queued"`, `"running"`, `"completed"`, `"failed"`, `"cancelled"` |
| `limit`      | integer | No       | Results per page (default: 20, max: 100)                                            |
| `offset`     | integer | No       | Pagination offset (default: 0)                                                      |
| `sort`       | string  | No       | Sort by: `"created_at"`, `"priority"`, `"status"` (default: `"created_at"`)         |
| `order`      | string  | No       | Sort order: `"asc"` or `"desc"` (default: `"desc"`)                                 |

### Response

```json
{
  "success": true,
  "submissions": [
    {
      "submission_id": "sub_1234567890abcdef",
      "problem_id": "rest-api-users",
      "team_id": "team-42",
      "status": "completed",
      "priority": 7,
      "created_at": "2025-10-13T10:30:15.789Z",
      "completed_at": "2025-10-13T10:40:15.678Z",
      "total_time_seconds": 315.6
    },
    {
      "submission_id": "sub_fedcba0987654321",
      "problem_id": "database-design",
      "team_id": "team-42",
      "status": "running",
      "priority": 5,
      "created_at": "2025-10-13T10:25:00.000Z",
      "started_at": "2025-10-13T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Validation Rules

### Submission ID

- Format: `sub_` + 16 hexadecimal characters
- Example: `sub_1234567890abcdef`

### Package Types

- `file` - File upload (multipart/form-data)
- `git` - Git repository URL (public only)
- `url` - Remote archive URL

**Note**: File upload support depends on DOMserver configuration. Most deployments use `git` or `url` for submissions.

### Supported Archive Formats

- `.zip` - ZIP archive
- `.tar.gz`, `.tgz` - Gzip-compressed tarball
- `.tar.bz2`, `.tbz2` - Bzip2-compressed tarball
- `.tar` - Uncompressed tarball

### Priority Levels

See `[SPEC] QUEUE_SYSTEM.md` for detailed explanation:

- `1-3`: Low priority (background tasks)
- `4-6`: Normal priority (default = 5)
- `7-9`: High priority (contest submissions)
- `10`: Critical priority (admin/emergency, may preempt)

### Size Limits

- Git repository: 1 GB maximum
- Archive from URL: 512 MB maximum
- Individual files: 100 MB maximum

---

## Webhook Notifications

If `notification_url` is provided, the judgehost will send POST requests when the submission status changes:

### Webhook Payload

```json
{
  "event": "submission.completed",
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "team_id": "team-42",
  "status": "completed",
  "timestamp": "2025-10-13T10:40:15.678Z",
  "result": {
    "total_score": 87.5,
    "passed": true,
    "result_url": "https://judgehost.example.com/api/results/sub_1234567890abcdef"
  }
}
```

### Webhook Events

- `submission.queued` - Submission added to queue
- `submission.started` - Evaluation started
- `submission.completed` - Evaluation completed successfully
- `submission.failed` - Evaluation failed with error
- `submission.cancelled` - Submission was cancelled

---

## Notes

1. **Package sources**: Submissions can be provided via Git URL, remote archive URL, or file upload (depending on DOMserver configuration)
2. **Public repositories only**: Private Git repositories are not supported
3. **Idempotency**: Resubmitting the same content creates a new submission
4. **Cleanup**: Submission files and evaluation images are automatically cleaned up after 7 days
5. **Rate Limiting**: Configured per judgehost (see [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md))
6. **Queue behavior**: See [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) for queue size limits and wait time estimation
7. **Two-stage containers**: Evaluation images are built on top of problem images (see [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md))
8. **Retries**: Failed downloads are retried up to 3 times with exponential backoff

---

## See Also

- [`[SPEC] QUEUE_SYSTEM.md`](%5BSPEC%5D%20QUEUE_SYSTEM.md) - Queue management and prioritization
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container lifecycle and resource management
- [`[API] GET_RESULT.md`](%5BAPI%5D%20GET_RESULT.md) - Retrieving evaluation results
- [`[API] ADD_PROBLEM.md`](%5BAPI%5D%20ADD_PROBLEM.md) - Problem registration
