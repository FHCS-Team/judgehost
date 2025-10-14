# DELETE /problems/:problem_id

Deletes a problem and its associated Docker image.

**Related Documentation**:

- [`POST_problems.md`](POST_problems.md) - Register new problems
- [`GET_problems.md`](GET_problems.md) - List and retrieve problems

---

## Description

This endpoint removes a problem from the judgehost, including:

- Problem configuration and metadata
- Associated Docker images
- Problem package files (hooks, data, Dockerfile)

**Warning**: This operation cannot be undone. Submissions that reference this problem will fail if re-evaluated.

## Request

**Endpoint:** `DELETE /problems/:problem_id`

### URL Parameters

| Parameter    | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| `problem_id` | string | Unique identifier of problem |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Problem rest-api-users deleted successfully",
  "data": {
    "problem_id": "rest-api-users",
    "images_removed": ["problem-rest-api-users:latest"],
    "deleted_at": "2025-10-13T15:45:30.123Z"
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem rest-api-users not found"
}
```

### Error Response (409 Conflict)

```json
{
  "success": false,
  "error": "problem_in_use",
  "message": "Cannot delete problem while submissions are being evaluated",
  "details": {
    "problem_id": "rest-api-users",
    "active_submissions": 3
  }
}
```

---

## Notes

1. **Active Submissions**: The endpoint will fail if there are currently running submissions for this problem
2. **Docker Images**: All associated Docker images are removed, freeing up disk space
3. **Submission History**: Past submission results remain accessible but cannot be re-evaluated
4. **Force Delete**: Use query parameter `?force=true` to delete even with active submissions (this will cancel them)

### Force Delete Example

```bash
curl -X DELETE http://localhost:3000/api/problems/rest-api-users?force=true
```

Response:

```json
{
  "success": true,
  "message": "Problem rest-api-users forcefully deleted",
  "data": {
    "problem_id": "rest-api-users",
    "images_removed": ["problem-rest-api-users:latest"],
    "submissions_cancelled": 3,
    "deleted_at": "2025-10-13T15:45:30.123Z"
  }
}
```
