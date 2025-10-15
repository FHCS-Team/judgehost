# GET /results/:id

Retrieves detailed results for a submission evaluation.

**Related Documentation**:

- [`../submissions/POST_submissions.md`](../submissions/POST_submissions.md) - Submit solutions
- [`GET_results_logs.md`](GET_results_logs.md) - Retrieve execution logs
- [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md) - Rubric-to-container mapping

---

## Description

Returns comprehensive evaluation results including:

- **Rubric scores** - Automated evaluation scores with standardized details
- **Execution status** - Success/failure with details
- **Container-specific results** - Which container evaluated which rubric
- **Logs** - Container execution logs and hook outputs (optional)
- **Metrics** - Performance metrics (CPU, memory, execution time)
- **Detailed feedback** - Per-rubric evaluation details
- **Resource usage** - Container resource consumption
- **Artifacts** - Generated files and reports

**Important**: The judgehost only performs **automated evaluation**. All rubrics are evaluated by hooks without human intervention.

## Request

**Endpoint:** `GET /results/:submission_id`

### URL Parameters

| Parameter       | Type   | Description                     |
| --------------- | ------ | ------------------------------- |
| `submission_id` | string | Unique identifier of submission |

### Query Parameters

| Parameter           | Type    | Description                                    |
| ------------------- | ------- | ---------------------------------------------- |
| `include_logs`      | boolean | Include full execution logs (default: `false`) |
| `include_metrics`   | boolean | Include metrics (default: `true`)              |
| `include_artifacts` | boolean | Include artifact URLs (default: `true`)        |

## Response

### Success Response (200 OK) - Completed Evaluation

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
        "status": "DONE",
        "container": "api_tester",
        "details": {
          "total": 25,
          "passed": 23,
          "failed": 2,
          "skipped": 0,
          "endpoints": [
            {
              "method": "GET",
              "path": "/api/users",
              "tests_passed": 4,
              "tests_failed": 0,
              "passed": true
            },
            {
              "method": "POST",
              "path": "/api/users",
              "tests_passed": 3,
              "tests_failed": 1,
              "passed": false,
              "message": "Missing validation for email format"
            }
          ]
        },
        "feedback": "Most endpoints work correctly. Fix email validation."
      },
      {
        "rubric_id": "security",
        "rubric_name": "Security",
        "rubric_type": "security_scan",
        "score": 18.0,
        "max_score": 20.0,
        "percentage": 90.0,
        "status": "DONE",
        "container": "submission",
        "details": {
          "total": 4,
          "passed": 3,
          "failed": 1,
          "skipped": 0,
          "vulnerabilities": [
            {
              "severity": "medium",
              "type": "weak_cors_policy",
              "description": "CORS allows all origins",
              "file": "server.js",
              "line": 15
            }
          ]
        },
        "feedback": "Tighten CORS policy to specific origins"
      },
      {
        "rubric_id": "performance",
        "rubric_name": "Performance",
        "rubric_type": "performance_benchmark",
        "score": 16.5,
        "max_score": 20.0,
        "percentage": 82.5,
        "status": "DONE",
        "container": "api_tester",
        "details": {
          "total": 5,
          "passed": 4,
          "failed": 1,
          "skipped": 0,
          "benchmarks": [
            {
              "name": "GET /api/users - Response Time",
              "measured_value": 45.3,
              "target_value": 100,
              "unit": "ms",
              "passed": true
            },
            {
              "name": "POST /api/users - Response Time",
              "measured_value": 125.7,
              "target_value": 100,
              "unit": "ms",
              "passed": false,
              "deviation_percent": 25.7
            }
          ],
          "summary": {
            "avg_response_time_ms": 67.8,
            "p95": 125.7,
            "p99": 145.2
          }
        },
        "feedback": "POST endpoint slightly slower than target"
      },
      {
        "rubric_id": "resource_usage",
        "rubric_name": "Resource Efficiency",
        "rubric_type": "custom",
        "score": 15.0,
        "max_score": 20.0,
        "percentage": 75.0,
        "status": "DONE",
        "container": "submission",
        "custom_type_name": "resource_monitoring",
        "details": {
          "total": 3,
          "passed": 2,
          "failed": 1,
          "skipped": 0,
          "metrics": {
            "avg_memory_mb": 145.6,
            "max_memory_mb": 198.3,
            "avg_cpu_percent": 12.5
          }
        },
        "feedback": "Memory usage within limits, CPU efficient"
      }
    ],
    "containers_summary": [
      {
        "container_id": "submission",
        "container_name": "Submission Container",
        "status": "success",
        "execution_time_seconds": 315.2,
        "resource_usage": {
          "memory_peak_mb": 198.3,
          "memory_avg_mb": 145.6,
          "cpu_avg_percent": 12.5
        },
        "rubrics_evaluated": ["security", "resource_usage"]
      },
      {
        "container_id": "api_tester",
        "container_name": "API Test Runner",
        "status": "success",
        "execution_time_seconds": 287.5,
        "resource_usage": {
          "memory_peak_mb": 112.8,
          "memory_avg_mb": 98.4,
          "cpu_avg_percent": 25.3
        },
        "rubrics_evaluated": ["api_correctness", "performance"]
      }
    ],
    "metadata": {
      "execution_time_seconds": 315.6,
      "total_memory_peak_mb": 311.1,
      "total_cpu_avg_percent": 37.8,
      "judgehost_version": "0.1.0",
      "evaluated_by": "judgehost-01"
    },
    "artifacts": [
      {
        "filename": "test-report.html",
        "size_kb": 245,
        "type": "test_report",
        "generated_by_container": "api_tester",
        "url": "/api/results/sub_1234567890abcdef/artifacts/test-report.html"
      },
      {
        "filename": "security-scan.json",
        "size_kb": 34,
        "type": "security_scan",
        "generated_by_container": "submission",
        "url": "/api/results/sub_1234567890abcdef/artifacts/security-scan.json"
      }
    ]
  }
}
```

### Response (202 Accepted) - Evaluation In Progress

```json
{
  "success": true,
  "message": "Evaluation in progress. Check back in a few moments.",
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "status": "running",
    "problem_id": "rest-api-users",
    "enqueued_at": "2025-10-13T10:30:15.789Z",
    "started_at": "2025-10-13T10:35:00.123Z",
    "elapsed_seconds": 145,
    "containers_status": {
      "submission": "running",
      "api_tester": "running"
    }
  }
}
```

### Response (200 OK) - Evaluation Failed

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "problem_id": "rest-api-users",
    "status": "failed",
    "evaluated_at": "2025-10-13T10:36:45.890Z",
    "execution_status": "failed",
    "error": {
      "type": "build_error",
      "message": "Failed to build submission container",
      "details": "npm install failed: package.json not found",
      "container_id": "submission"
    },
    "containers_summary": [
      {
        "container_id": "submission",
        "status": "failed",
        "error": "build_error"
      },
      {
        "container_id": "api_tester",
        "status": "not_started"
      }
    ]
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

## Rubric-to-Container Mapping

The `container` field in each rubric score indicates which container was responsible for evaluating that rubric:

- **Submission container**: Typically evaluates rubrics related to the submission's own code (security scans, code quality, resource usage)
- **Tester/Sidecar containers**: Evaluate external behavior rubrics (API correctness, UI tests, integration tests)

See [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md) for detailed mapping strategies.

---

## Notes

1. **Automated evaluation only**: All rubrics are evaluated by hooks without human intervention
2. **Container-specific results**: Multi-container problems show which container evaluated each rubric
3. **Results caching**: Results are cached after completion
4. **Artifacts**: Generated files are stored temporarily and accessible via the artifacts endpoint
5. **DONE results**: If a submission is cancelled, DONE results may be available for completed rubrics

---

## See Also

- [`GET_results_logs.md`](GET_results_logs.md) - Retrieve execution logs
- [`GET_results_metrics.md`](GET_results_metrics.md) - Retrieve detailed metrics
- [`GET_results_artifacts.md`](GET_results_artifacts.md) - List and download artifacts
- [`GET_results_rubric.md`](GET_results_rubric.md) - Get specific rubric details
