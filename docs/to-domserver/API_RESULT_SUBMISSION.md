# Judgehost Result Submission API

## Overview

This document defines the modernized API endpoint for judgehosts to submit evaluation results to the DOMserver. This replaces the legacy competitive programming-focused endpoint with a project-based evaluation endpoint.

---

## POST /api/v4/judgehosts/add-judging-run/{hostname}/{submission_id}

Submit complete evaluation results for a judging task.

### URL Parameters

| Parameter       | Type   | Required | Description                                              |
| --------------- | ------ | -------- | -------------------------------------------------------- |
| `hostname`      | string | Yes      | The hostname of the judgehost submitting results         |
| `submission_id` | string | Yes      | The unique identifier for the submission being evaluated |

### Request Headers

| Header                | Value              | Required | Description                                   |
| --------------------- | ------------------ | -------- | --------------------------------------------- |
| `Content-Type`        | `application/json` | Yes      | Request body format                           |
| `Authorization`       | `Basic <base64>`   | Yes      | HTTP Basic Authentication (username:password) |
| `X-Judgehost-Version` | `string`           | No       | Judgehost version for tracking                |

**Note:** The `Authorization` header uses HTTP Basic Authentication. Encode `username:password` in base64 format. The user account must have the `judgehost` role in DOMserver.

### Request Body

```json
{
  "submission_id": "sub_20241015_abc123",
  "problem_id": "sql-optimization",
  "status": "completed",
  "started_at": "2024-10-15T10:30:00.000Z",
  "completed_at": "2024-10-15T10:35:45.123Z",
  "execution_time_seconds": 345.123,
  "rubrics": [
    {
      "rubric_id": "correctness",
      "name": "Query Correctness",
      "rubric_type": "test_cases",
      "score": 50.0,
      "max_score": 50.0,
      "status": "DONE",
      "message": "Query correctness: 3/3 queries passed",
      "details": {
        "total_queries": 3,
        "passed_queries": 3,
        "failed_queries": 0
      }
    },
    {
      "rubric_id": "latency",
      "name": "Query Performance - Latency",
      "rubric_type": "performance_benchmark",
      "score": 18.5,
      "max_score": 20.0,
      "status": "DONE",
      "message": "Average query latency: 45.2ms (target: <50ms)",
      "details": {
        "average_latency_ms": 45.2,
        "target_latency_ms": 50,
        "queries_measured": 3
      }
    }
  ],
  "metrics": {
    "migration_time_seconds": 0,
    "initial_size_bytes": 10732323,
    "final_size_bytes": 11969315,
    "extra_storage_bytes": 1236992,
    "extra_storage_percentage": 11.53,
    "total_containers": 2,
    "containers_succeeded": 2,
    "containers_failed": 0
  },
  "logs_url": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/logs",
  "artifacts_urls": {
    "migration_metrics": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/artifacts/migration_metrics.json",
    "initial_size": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/artifacts/initial_size.txt"
  },
  "metadata": {
    "judgehost_version": "1.0.0",
    "judgehost_hostname": "judgehost1.example.com",
    "docker_version": "24.0.0",
    "node_version": "v20.11.0",
    "platform": "linux",
    "arch": "x64",
    "problem_version": "1.2.0",
    "problem_name": "SQL Query Optimization",
    "project_type": "database-optimization",
    "evaluation_method": "containerized_hooks",
    "timestamp": "2024-10-15T10:35:45.123Z"
  }
}
```

### Request Body Schema

| Field                    | Type   | Required | Description                                                  |
| ------------------------ | ------ | -------- | ------------------------------------------------------------ |
| `submission_id`          | string | Yes      | Submission identifier                                        |
| `problem_id`             | string | Yes      | Problem identifier                                           |
| `status`                 | string | Yes      | Evaluation status: `completed`, `failed`, `timeout`, `error` |
| `started_at`             | string | Yes      | ISO 8601 timestamp when evaluation started                   |
| `completed_at`           | string | Yes      | ISO 8601 timestamp when evaluation completed                 |
| `execution_time_seconds` | number | Yes      | Total execution time in seconds                              |
| `rubrics`                | array  | Yes      | Array of rubric evaluation results                           |
| `metrics`                | object | No       | Evaluation metrics specific to the problem                   |
| `logs_url`               | string | No       | URL to fetch execution logs                                  |
| `artifacts_urls`         | object | No       | Map of artifact names to their download URLs                 |
| `metadata`               | object | No       | Additional metadata about the evaluation environment         |
| `error`                  | object | No       | Error details if status is `failed` or `error`               |

#### Rubric Object Schema

| Field         | Type   | Required | Description                                                           |
| ------------- | ------ | -------- | --------------------------------------------------------------------- |
| `rubric_id`   | string | Yes      | Rubric identifier                                                     |
| `name`        | string | Yes      | Human-readable rubric name                                            |
| `rubric_type` | string | Yes      | Type from rubric_types.md: `test_cases`, `performance_benchmark`, etc |
| `score`       | number | Yes      | Score achieved                                                        |
| `max_score`   | number | Yes      | Maximum possible score                                                |
| `status`      | string | Yes      | Status: `DONE`, `ERROR`, `SKIPPED`                                    |
| `message`     | string | No       | Human-readable evaluation message                                     |
| `details`     | object | No       | Rubric-specific evaluation details                                    |

#### Error Object Schema (when status is `failed` or `error`)

| Field     | Type   | Required | Description                   |
| --------- | ------ | -------- | ----------------------------- |
| `message` | string | Yes      | Error message                 |
| `code`    | string | No       | Error code for categorization |
| `details` | object | No       | Additional error context      |

---

## Response Formats

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Evaluation result accepted",
  "data": {
    "result_id": "res_20241015_xyz789",
    "submission_id": "sub_20241015_abc123",
    "judge_task_id": 12345,
    "total_score": 68.5,
    "max_score": 70.0,
    "percentage": 97.86,
    "status": "completed",
    "received_at": "2024-10-15T10:35:46.000Z"
  }
}
```

### Error Response (400 Bad Request) - Invalid Data

```json
{
  "success": false,
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Invalid evaluation result format",
    "details": {
      "validation_errors": [
        {
          "field": "rubrics[0].score",
          "message": "Score cannot exceed max_score",
          "value": 55.0,
          "max_value": 50.0
        },
        {
          "field": "status",
          "message": "Invalid status value",
          "value": "invalid_status",
          "allowed_values": ["completed", "failed", "timeout", "error"]
        }
      ]
    }
  }
}
```

### Error Response (404 Not Found) - Task Not Found

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Judge task 12345 not found or already completed",
    "details": {
      "judge_task_id": 12345,
      "possible_reasons": [
        "Task ID does not exist",
        "Task was already completed",
        "Task was cancelled"
      ]
    }
  }
}
```

### Error Response (401 Unauthorized) - Authentication Failed

```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Authentication required",
    "details": {
      "reason": "Invalid or missing authentication token"
    }
  }
}
```

### Error Response (403 Forbidden) - Wrong Judgehost

```json
{
  "success": false,
  "error": {
    "code": "FORBIDDEN",
    "message": "This judgehost is not authorized to submit results for this task",
    "details": {
      "hostname": "judgehost2.example.com",
      "assigned_hostname": "judgehost1.example.com",
      "judge_task_id": 12345
    }
  }
}
```

### Error Response (409 Conflict) - Duplicate Submission

```json
{
  "success": false,
  "error": {
    "code": "DUPLICATE_RESULT",
    "message": "Result for this judge task has already been submitted",
    "details": {
      "judge_task_id": 12345,
      "existing_result_id": "res_20241015_xyz789",
      "submitted_at": "2024-10-15T10:35:46.000Z"
    }
  }
}
```

### Error Response (500 Internal Server Error)

```json
{
  "success": false,
  "error": {
    "code": "INTERNAL_ERROR",
    "message": "An internal error occurred while processing the result",
    "details": {
      "request_id": "req_abc123xyz",
      "timestamp": "2024-10-15T10:35:46.000Z"
    }
  }
}
```

### Error Response (503 Service Unavailable) - Server Overloaded

```json
{
  "success": false,
  "error": {
    "code": "SERVICE_UNAVAILABLE",
    "message": "Server is temporarily unavailable",
    "details": {
      "retry_after_seconds": 60,
      "reason": "Database connection pool exhausted"
    }
  }
}
```

---

## Judgehost Endpoints for Resource Access

The judgehost must provide these endpoints for the DOMserver to fetch logs and artifacts:

### GET /api/results/{submission_id}/logs

Returns aggregated execution logs.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_20241015_abc123",
    "logs": {
      "database-container": "PostgreSQL 15.4 starting...\nDatabase initialized successfully...",
      "submission-container": "Executing migration...\nMigration completed in 0.123s..."
    },
    "combined_log": "=== database-container ===\nPostgreSQL 15.4 starting...\n=== submission-container ===\nExecuting migration...",
    "log_size_bytes": 45678,
    "generated_at": "2024-10-15T10:35:45.000Z"
  }
}
```

### GET /api/results/{submission_id}/logs/{container_id}

Returns logs for a specific container.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_20241015_abc123",
    "container_id": "database-container",
    "log": "PostgreSQL 15.4 starting...\nDatabase initialized successfully...",
    "log_size_bytes": 23456,
    "generated_at": "2024-10-15T10:35:45.000Z"
  }
}
```

### GET /api/results/{submission_id}/artifacts

List all artifacts generated during evaluation.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_20241015_abc123",
    "artifacts": [
      {
        "name": "migration_metrics.json",
        "size_bytes": 234,
        "mime_type": "application/json",
        "url": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/artifacts/migration_metrics.json"
      },
      {
        "name": "initial_size.txt",
        "size_bytes": 12,
        "mime_type": "text/plain",
        "url": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/artifacts/initial_size.txt"
      }
    ],
    "total_artifacts": 2,
    "total_size_bytes": 246
  }
}
```

### GET /api/results/{submission_id}/artifacts/{artifact_name}

Download a specific artifact.

**Response (200 OK):**

- Content-Type: Based on artifact MIME type
- Body: Raw artifact file content

### GET /api/results/{submission_id}/metrics

Get evaluation metrics.

**Response (200 OK):**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_20241015_abc123",
    "metrics": {
      "migration_time_seconds": 0.123,
      "initial_size_bytes": 10732323,
      "final_size_bytes": 11969315,
      "extra_storage_bytes": 1236992,
      "extra_storage_percentage": 11.53,
      "total_containers": 2,
      "containers_succeeded": 2,
      "containers_failed": 0
    }
  }
}
```

---

## Key Differences from Legacy API

1. **No competitive programming fields**: Removed `output_diff`, `team_message` in the old sense
2. **Rubric-based evaluation**: Results are organized by rubrics, not just pass/fail
3. **URL-based resources**: Logs and artifacts are accessed via URLs instead of base64 encoding
4. **Rich metadata**: Includes evaluation environment info, timing, and problem-specific metrics
5. **Structured error handling**: Clear error codes and detailed error information
6. **Async resource access**: DOMserver fetches logs/artifacts when needed, not in initial submission
7. **Problem-specific metrics**: Support for custom metrics relevant to each problem type
8. **Status-based workflow**: Clear status progression (completed, failed, timeout, error)

---

## Implementation Checklist

### Judgehost Changes

- [ ] Add DOMserver configuration (URL, authentication token)
- [ ] Implement result submission client
- [ ] Add retry logic with exponential backoff
- [ ] Create endpoints for logs access
- [ ] Create endpoints for artifacts access
- [ ] Create endpoints for metrics access
- [ ] Add request/response logging
- [ ] Implement authentication middleware
- [ ] Add rate limiting for resource endpoints
- [ ] Handle CORS if needed for web access

### DOMserver Changes (for reference)

- [ ] Create new endpoint POST /api/v4/judgehosts/submit-result/{hostname}
- [ ] Implement request validation
- [ ] Store evaluation results in database
- [ ] Fetch and cache logs/artifacts from judgehost
- [ ] Add webhook notifications for result updates
- [ ] Implement result aggregation and scoring
- [ ] Add access control for result viewing
