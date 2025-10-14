# GET /submissions/:submission_id

Retrieves the current status and details of a submission.

**Related Documentation**:

- [`POST_submissions.md`](POST_submissions.md) - Submit solutions
- [`DELETE_submissions.md`](DELETE_submissions.md) - Cancel submissions
- [`../results/GET_results.md`](../results/GET_results.md) - Result retrieval

---

## Description

This endpoint returns the current state of a submission, including:

- Submission status (queued, running, completed, failed, cancelled)
- Timing information (enqueued, started, completed)
- Problem reference
- Basic result summary (if completed)

For detailed evaluation results, use the [Results API](../results/GET_results.md).

## Request

**Endpoint:** `GET /submissions/:submission_id`

### URL Parameters

| Parameter       | Type   | Description                     |
| --------------- | ------ | ------------------------------- |
| `submission_id` | string | Unique identifier of submission |

## Response Examples

### Queued Submission

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "problem_id": "rest-api-users",
    "status": "queued",
    "priority": 7,
    "team_id": "team-42",
    "package_type": "git",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "queue_position": 3,
    "estimated_start_time": "2025-10-13T10:35:00.000Z"
  }
}
```

### Running Submission

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "problem_id": "rest-api-users",
    "status": "running",
    "priority": 7,
    "team_id": "team-42",
    "package_type": "git",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "started_at": "2025-10-13T10:35:00.123Z",
    "evaluation_state": "running",
    "containers_status": {
      "submission": "running",
      "api_tester": "running"
    },
    "elapsed_seconds": 285
  }
}
```

### Completed Submission

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "problem_id": "rest-api-users",
    "status": "completed",
    "team_id": "team-42",
    "package_type": "git",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "started_at": "2025-10-13T10:35:00.123Z",
    "completed_at": "2025-10-13T10:40:15.678Z",
    "execution_time_seconds": 315.555,
    "result": {
      "total_score": 87.5,
      "max_score": 100,
      "percentage": 87.5,
      "execution_status": "success",
      "passed": true
    }
  }
}
```

### Failed Submission

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "problem_id": "rest-api-users",
    "status": "failed",
    "team_id": "team-42",
    "package_type": "git",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "started_at": "2025-10-13T10:35:00.123Z",
    "failed_at": "2025-10-13T10:36:45.890Z",
    "error": {
      "type": "build_error",
      "message": "Failed to build submission container",
      "details": "npm install failed: package.json not found"
    }
  }
}
```

### Cancelled Submission

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "job_id": "12345",
    "problem_id": "rest-api-users",
    "status": "cancelled",
    "team_id": "team-42",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "cancelled_at": "2025-10-13T10:32:30.456Z",
    "cancelled_by": "user"
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

---

## Status Values

| Status      | Description                       |
| ----------- | --------------------------------- |
| `queued`    | Submission is waiting in queue    |
| `running`   | Evaluation is in progress         |
| `completed` | Evaluation completed successfully |
| `failed`    | Evaluation failed due to error    |
| `cancelled` | Submission was cancelled          |
| `timeout`   | Evaluation exceeded time limit    |

---

## Notes

1. **Status Polling**: Poll this endpoint to track submission progress
2. **Result Details**: For complete evaluation results including rubric scores, logs, and metrics, use [`GET /results/:submission_id`](../results/GET_results.md)
3. **Container Status**: The `containers_status` field (when running) shows the state of each container in multi-container problems
4. **Queue Position**: Indicates how many submissions are ahead in the queue
