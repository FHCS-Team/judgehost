# DELETE /submissions/:submission_id

Cancels a queued or running submission.

**Related Documentation**:

- [`POST_submissions.md`](POST_submissions.md) - Submit solutions
- [`GET_submissions.md`](GET_submissions.md) - Check submission status

---

## Description

This endpoint cancels a submission that is currently:

- In the queue (not yet started)
- Running (currently being evaluated)

Completed, failed, or already cancelled submissions cannot be cancelled.

## Request

**Endpoint:** `DELETE /submissions/:submission_id`

### URL Parameters

| Parameter       | Type   | Description                     |
| --------------- | ------ | ------------------------------- |
| `submission_id` | string | Unique identifier of submission |

## Response

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Submission sub_1234567890abcdef cancelled",
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "status": "cancelled",
    "previous_status": "queued",
    "cancelled_at": "2025-10-13T10:32:30.456Z"
  }
}
```

### Success Response - Running Submission Stopped

When cancelling a running submission, containers are stopped gracefully:

```json
{
  "success": true,
  "message": "Submission sub_1234567890abcdef cancelled",
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "status": "cancelled",
    "previous_status": "running",
    "cancelled_at": "2025-10-13T10:38:45.123Z",
    "containers_stopped": ["submission", "api_tester"],
    "partial_results_available": true
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "submission_not_found",
  "message": "Submission sub_1234567890abcdef not found"
}
```

### Error Response (400 Bad Request)

```json
{
  "success": false,
  "error": "cannot_cancel",
  "message": "Cannot cancel submission in 'completed' status",
  "details": {
    "submission_id": "sub_1234567890abcdef",
    "current_status": "completed"
  }
}
```

---

## Cancellation Behavior

### Queued Submissions

- Removed from queue immediately
- No containers are started
- No resources are consumed

### Running Submissions

- Containers receive SIGTERM signal
- 10-second grace period for cleanup
- SIGKILL sent if containers don't stop
- Partial results may be available if hooks completed before cancellation

### Multi-Container Submissions

All containers are stopped simultaneously:

1. Main submission container
2. Sidecar/tester containers
3. Database/service containers

---

## Partial Results

If a submission is cancelled while running, partial results may be available:

```bash
curl http://localhost:3000/api/results/sub_1234567890abcdef
```

Response:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "status": "cancelled",
    "partial_results": true,
    "rubric_scores": [
      {
        "rubric_id": "functionality",
        "status": "completed",
        "score": 35.0
      },
      {
        "rubric_id": "performance",
        "status": "incomplete",
        "score": 0
      }
    ]
  }
}
```

---

## Notes

1. **Graceful Shutdown**: Running containers are given time to clean up
2. **Queue Position**: Cancelling a submission may affect queue position of other submissions
3. **Resource Cleanup**: All allocated resources (containers, volumes) are freed
4. **Idempotency**: Calling DELETE on an already cancelled submission returns 400
