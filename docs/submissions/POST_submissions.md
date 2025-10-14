# POST /submissions

Submits a solution for evaluation against a registered problem.

**Related Documentation**:

- [`../problems/POST_problems.md`](../problems/POST_problems.md) - Problem registration
- [`../results/GET_results.md`](../results/GET_results.md) - Retrieve results
- [`../data-models/samples/submission_package_name.md`](../data-models/samples/submission_package_name.md) - Submission package structure

---

## Description

This endpoint accepts a submission containing solution code to be evaluated. The submission can be provided via:

- **Git repository URL** (public repositories only)
- **Remote archive URL** (ZIP or tarball with optional checksum)
- **File upload** (multipart/form-data)

The judgehost will:

1. Download or receive the submission
2. Queue the submission for evaluation
3. Build an evaluation environment
4. Run the problem's evaluation hooks to assess the solution

## Request

**Endpoint:** `POST /submissions`

**Content-Type:** `multipart/form-data`

### Form Fields

| Field                 | Type        | Required    | Description                                                   |
| --------------------- | ----------- | ----------- | ------------------------------------------------------------- |
| `problem_id`          | string      | Yes         | ID of the problem to evaluate against                         |
| `package_type`        | string      | Yes         | Source type: `"git"`, `"url"`, or `"file"`                    |
| `submission_file`     | file        | Conditional | Submission file (required if `package_type="file"`)           |
| `package_url`         | string      | Conditional | URL to download archive (required if `package_type="url"`)    |
| `archive_checksum`    | string      | No          | SHA256 checksum for verification                              |
| `git_url`             | string      | Conditional | Git repository URL (required if `package_type="git"`)         |
| `git_branch`          | string      | No          | Git branch (default: `"main"`)                                |
| `git_commit`          | string      | No          | Specific commit SHA (optional)                                |
| `team_id`             | string      | No          | Team or user identifier                                       |
| `submission_metadata` | JSON object | No          | Additional metadata                                           |
| `priority`            | integer     | No          | Queue priority: 1-10 (default: 5)                             |
| `notification_url`    | string      | No          | Webhook URL to notify when evaluation completes               |
| `timeout_override`    | integer     | No          | Override problem's timeout (seconds, cannot exceed max limit) |

**Note on Package Sources**:

- **`package_type="file"`**: Upload `submission_file` directly
- **`package_type="url"`**: Provide `package_url` pointing to a downloadable archive
- **`package_type="git"`**: Provide `git_url` (public repositories only)

## Request Examples

### Example 1: File Upload

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=rest-api-users" \
  -F "package_type=file" \
  -F "submission_file=@my-solution.zip" \
  -F "team_id=team-42" \
  -F "priority=7"
```

### Example 2: Git Repository

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=rest-api-users" \
  -F "package_type=git" \
  -F "git_url=https://github.com/team42/solution.git" \
  -F "git_branch=main" \
  -F "team_id=team-42"
```

### Example 3: Remote Archive URL

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=database-design" \
  -F "package_type=url" \
  -F "package_url=https://cdn.example.com/submissions/team42.tar.gz" \
  -F "archive_checksum=e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855" \
  -F "team_id=team-42"
```

### Example 4: With Metadata and Webhook

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=rest-api-users" \
  -F "package_type=file" \
  -F "submission_file=@my-solution.zip" \
  -F "team_id=team-42" \
  -F 'submission_metadata={"submission_id": "s12345", "attempt": 3}' \
  -F "notification_url=https://lms.example.com/api/webhooks/submission-complete"
```

---

## Response

### Success Response (201 Created)

```json
{
  "success": true,
  "message": "Submission enqueued successfully",
  "data": {
    "job_id": "12345",
    "submission_id": "sub_1234567890abcdef",
    "problem_id": "rest-api-users",
    "status": "queued",
    "priority": 7,
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "estimated_start_time": "2025-10-13T10:35:00.000Z"
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
    "required": ["problem_id", "package_type"]
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

**404 Not Found - Problem Does Not Exist**

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem with the specified ID does not exist",
  "details": {
    "problem_id": "unknown-problem"
  }
}
```

**500 Internal Server Error**

```json
{
  "success": false,
  "error": "submission_failed",
  "message": "Error message here"
}
```

---

## Validation Rules

### Submission ID Format

- Format: `sub_` + timestamp + random string
- Example: `sub_1234567890abcdef`

### Package Types

- `file` - File upload (multipart/form-data)
- `git` - Git repository URL (public only)
- `url` - Remote archive URL

### Supported Archive Formats

- `.zip`, `.tar.gz`, `.tgz`, `.tar.bz2`, `.tbz2`, `.tar`

### Priority Levels

- `1-3`: Low priority
- `4-6`: Normal priority (default = 5)
- `7-9`: High priority
- `10`: Critical priority

---

## Webhook Notifications

If a `notification_url` is provided, the judgehost will send a POST request when evaluation completes:

```json
{
  "event": "submission_completed",
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "status": "completed",
  "total_score": 87.5,
  "max_score": 100,
  "completed_at": "2025-10-13T10:40:15.678Z",
  "result_url": "http://judgehost.example.com/api/results/sub_1234567890abcdef"
}
```

---

## Notes

1. **Public repositories only**: Private Git repositories are not supported
2. **Idempotency**: Resubmitting the same content creates a new submission
3. **Rate Limiting**: Configured per judgehost based on resource availability
4. **Multi-Container Distribution**: Submissions are automatically distributed to appropriate containers based on problem configuration. See [`../data-models/containers/resources.md`](../data-models/containers/resources.md)
