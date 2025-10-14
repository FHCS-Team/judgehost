# API: Result Retrieval

This document describes the API endpoints for retrieving evaluation results.

**Related Documentation**:

- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type specifications
- [`[API] SUBMISSION.md`](%5BAPI%5D%20SUBMISSION.md) - Submission management

**Note**: The judgehost only performs **automated evaluation**. All rubrics are evaluated by hooks without human intervention.

---

## GET /results/:submission_id

Retrieves the complete evaluation result for a submission.

**Endpoint:** `GET /results/:submission_id`

#### Query Parameters

| Parameter           | Type    | Description                                    |
| ------------------- | ------- | ---------------------------------------------- |
| `include_logs`      | boolean | Include full execution logs (default: `false`) |
| `include_metrics`   | boolean | Include metrics (default: `true`)              |
| `include_artifacts` | boolean | Include artifact URLs (default: `true`)        |

### Response

#### Success Response (200 OK) - Completed Evaluation

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "problem_id": "rest-api-users",
    "status": "completed",
    "evaluated_at": "2025-10-13T10:40:15.678Z",
    "execution_status": "success",
    "timed_out": false,
    "total_score": 87.5,
    "max_score": 100,
    "percentage": 87.5,
    "rubric_scores": [
      {
        "rubric_id": "api_correctness",
        "rubric_name": "API Correctness",
        "rubric_type": "api_endpoints",
        "score": 38.0,
        "max_score": 40.0,
        "percentage": 95.0,
        "status": "passed",
        "details": {
          "total": 25,
          "passed": 23,
          "failed": 2,
          "skipped": 0
        },
        "feedback": "Most endpoints work correctly"
      }
    ],
    "metadata": {
      "execution_time_seconds": 315.6,
      "memory_peak_mb": 856,
      "cpu_average_percent": 45.3
    },
    "artifacts": [
      {
        "filename": "test-report.html",
        "url": "/api/results/sub_1234567890abcdef/artifacts/test-report.html"
      }
    ]
  }
}
```

#### Response (202 Accepted) - Evaluation In Progress

```json
{
  "success": true,
  "message": "Evaluation in progress. Check back in a few moments.",
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "status": "running",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "started_at": "2025-10-13T10:35:00.123Z"
  }
}
```

#### Response (200 OK) - Evaluation Failed

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "status": "failed",
    "error": "Application failed to start"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "submission_not_found",
  "message": "Submission sub_1234567890abcdef not found"
}
```

---

## GET /results/:submission_id/logs

Retrieves execution logs for a submission.

**Endpoint:** `GET /results/:submission_id/logs`

#### Query Parameters

| Parameter | Type   | Description                            |
| --------- | ------ | -------------------------------------- |
| `format`  | string | Format: `"text"` (default) or `"json"` |

### Response

#### Text Format (Default)

```text
[2025-10-13T10:35:00.123Z] [INFO] Starting evaluation container
[2025-10-13T10:35:05.890Z] [HOOK:PRE] Executing 01_install_dependencies.sh
[2025-10-13T10:35:06.123Z] [STDOUT] npm install
[2025-10-13T10:35:12.789Z] [HOOK:PRE] 01_install_dependencies.sh completed
...
```

#### JSON Format

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "logs": "[2025-10-13T10:35:00.123Z] [INFO] Starting...\n...",
    "timestamp": "2025-10-13T10:40:15.678Z"
  }
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "results_not_found",
  "message": "Results for submission sub_1234567890abcdef not found"
}
```

---

## GET /results/:submission_id/artifacts

Lists all artifacts generated during evaluation.

**Endpoint:** `GET /results/:submission_id/artifacts`

### Response

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "artifacts": [
      {
        "filename": "test-report.html",
        "size": 250880,
        "modified": "2025-10-13T10:40:15.678Z",
        "url": "/api/results/sub_1234567890abcdef/artifacts/test-report.html"
      }
    ],
    "total": 1
  }
}
```

---

## GET /results/:submission_id/artifacts/:filename

Downloads a specific artifact file.

**Endpoint:** `GET /results/:submission_id/artifacts/:filename`

### Response

- Returns the file for download
- **400 Bad Request** if filename contains `..` or `/`
- **404 Not Found** if artifact doesn't exist

---

## GET /results/:submission_id/rubric/:rubric_id

Retrieves detailed evaluation for a specific rubric.

**Endpoint:** `GET /results/:submission_id/rubric/:rubric_id`

### Response

```json
{
  "success": true,
  "data": {
    "rubric_id": "api_correctness",
    "rubric_name": "API Correctness",
    "rubric_type": "api_endpoints",
    "score": 38.0,
    "max_score": 40.0,
    "details": {
      "total": 25,
      "passed": 23,
      "failed": 2,
      "endpoints": [...]
    },
    "feedback": "Most endpoints work correctly"
  }
}
```

**404 Not Found**

```json
{
  "success": false,
  "error": "rubric_not_found",
  "message": "Rubric api_correctness not found for submission sub_1234567890abcdef"
}
```

---

## Notes

1. **Automated evaluation only**: All rubrics are evaluated by hooks without human intervention
2. **Rubric types**: See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for all supported types and their details structures
3. **Results caching**: Results are cached after completion
4. **Artifacts**: Generated files are stored temporarily and accessible via the artifacts endpoint
