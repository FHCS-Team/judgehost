# API: Result Retrieval

This document describes the API endpoints for retrieving evaluation results and metrics.

**Related Documentation**:

- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type specifications and details field structure
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container execution details
- [`[API] SUBMISSION.md`](%5BAPI%5D%20SUBMISSION.md) - Submission management

**Important**: The judgehost only performs **automated evaluation**. All rubrics are evaluated by hooks and scripts without human intervention. Manual rubrics requiring human review are not supported.

---

## GET /results/:submission_id

Retrieves the complete evaluation result for a submission.

### Description

Returns comprehensive evaluation results including:

- **Rubric scores** - Automated evaluation scores with standardized details
- **Execution status** - Success/failure with details
- **Logs** - Container execution logs and hook outputs
- **Metrics** - Performance metrics (CPU, memory, execution time)
- **Detailed feedback** - Per-rubric evaluation details
- **Resource usage** - Container resource consumption

### Request

**Endpoint:** `GET /results/:submission_id`

#### URL Parameters

| Parameter       | Type   | Required | Description                             |
| --------------- | ------ | -------- | --------------------------------------- |
| `submission_id` | string | Yes      | The unique identifier of the submission |

#### Query Parameters

| Parameter           | Type    | Required | Description                                           |
| ------------------- | ------- | -------- | ----------------------------------------------------- |
| `include_logs`      | boolean | No       | Include full execution logs (default: `false`)        |
| `include_metrics`   | boolean | No       | Include detailed metrics (default: `true`)            |
| `include_artifacts` | boolean | No       | Include URLs to generated artifacts (default: `true`) |
| `format`            | string  | No       | Response format: `"json"` (default) or `"detailed"`   |

### Response

#### Success Response (200 OK) - Completed Evaluation

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "team_id": "team-42",
  "status": "completed",
  "evaluation_status": "success",
  "overall_result": {
    "passed": true,
    "total_score": 87.5,
    "max_score": 100,
    "percentage": 87.5,
    "grade": "B+",
    "verdict": "Acceptable"
  },
  "rubric_scores": [
    {
      "rubric_id": "api_correctness",
      "rubric_name": "API Correctness",
      "rubric_type": "api_endpoints",
      "score": 38.0,
      "max_score": 40.0,
      "percentage": 95.0,
      "weight": 1.0,
      "weighted_score": 38.0,
      "status": "passed",
      "details": {
        "total": 25,
        "passed": 23,
        "failed": 2,
        "skipped": 0,
        "endpoints": [
          {
            "method": "GET",
            "path": "/api/users",
            "status": "passed",
            "status_code_expected": 200,
            "status_code_actual": 200,
            "response_time_ms": 42
          },
          {
            "method": "DELETE",
            "path": "/api/users/invalid-id",
            "status": "failed",
            "status_code_expected": 404,
            "status_code_actual": 500,
            "response_time_ms": 15,
            "issues": ["Should return 404 for invalid ID"]
          }
        ]
      },
      "feedback": "Excellent API implementation! Most endpoints work correctly. Minor issue with error handling for invalid user IDs."
    },
    {
      "rubric_id": "performance",
      "rubric_name": "Performance & Efficiency",
      "rubric_type": "performance_benchmark",
      "score": 17.5,
      "max_score": 20.0,
      "percentage": 87.5,
      "weight": 1.0,
      "weighted_score": 17.5,
      "status": "passed",
      "details": {
        "total": 10,
        "passed": 8,
        "failed": 2,
        "skipped": 0,
        "benchmarks": [
          {
            "name": "GET /users response time",
            "measured_value": 42,
            "target_value": 100,
            "unit": "ms",
            "passed": true
          },
          {
            "name": "POST /users throughput",
            "measured_value": 245,
            "target_value": 200,
            "unit": "req/s",
            "passed": true
          }
        ],
        "summary": {
          "avg_response_time_ms": 145,
          "p50": 45,
          "p95": 120,
          "p99": 180
        }
      },
      "feedback": "Good performance overall. Response times are within acceptable ranges."
    },
    {
      "rubric_id": "security",
      "rubric_name": "Security Implementation",
      "rubric_type": "security_scan",
      "score": 12.0,
      "max_score": 20.0,
      "percentage": 60.0,
      "weight": 1.0,
      "weighted_score": 12.0,
      "status": "partial",
      "details": {
        "total": 15,
        "passed": 11,
        "failed": 4,
        "skipped": 0,
        "vulnerabilities": [
          {
            "severity": "medium",
            "type": "SQL Injection",
            "location": "GET /users/search endpoint",
            "description": "User input not properly sanitized",
            "recommendation": "Use parameterized queries or an ORM"
          },
          {
            "severity": "low",
            "type": "CORS Misconfiguration",
            "location": "Express middleware",
            "description": "CORS allows all origins",
            "recommendation": "Restrict CORS to specific domains"
          }
        ],
        "summary": {
          "critical": 0,
          "high": 0,
          "medium": 2,
          "low": 2
        }
      },
      "feedback": "Several security concerns need attention. Authentication is good, but input validation needs improvement."
    },
    {
      "rubric_id": "code_quality",
      "rubric_name": "Code Quality & Style",
      "rubric_type": "code_quality",
      "score": 20.0,
      "max_score": 20.0,
      "percentage": 100.0,
      "weight": 0.5,
      "weighted_score": 10.0,
      "status": "passed",
      "details": {
        "total": 8,
        "passed": 7,
        "failed": 1,
        "skipped": 0,
        "metrics": {
          "linting_errors": 0,
          "linting_warnings": 3,
          "code_coverage_percent": 85.5,
          "maintainability_index": 78,
          "cyclomatic_complexity_avg": 4.2,
          "cyclomatic_complexity_max": 12
        }
      },
      "feedback": "Clean, well-structured code with good test coverage."
    }
  ],
  "execution_summary": {
    "container_id": "eval-sub_1234567890abcdef",
    "started_at": "2025-10-13T10:35:00.123Z",
    "completed_at": "2025-10-13T10:40:15.678Z",
    "total_time_seconds": 315.6,
    "phases": {
      "download": {
        "duration_seconds": 5.2,
        "status": "success"
      },
      "pre_execution": {
        "duration_seconds": 45.8,
        "status": "success",
        "hooks_executed": ["01_install_dependencies.sh", "02_setup_database.sh"]
      },
      "deployment": {
        "duration_seconds": 3.5,
        "status": "success"
      },
      "evaluation": {
        "duration_seconds": 248.3,
        "status": "success",
        "hooks_executed": [
          "test_api_endpoints.sh",
          "security_scan.sh",
          "performance_benchmark.sh"
        ]
      },
      "post_execution": {
        "duration_seconds": 12.8,
        "status": "success",
        "hooks_executed": ["cleanup_database.sh", "generate_report.sh"]
      }
    }
  },
  "resource_metrics": {
    "memory": {
      "peak_mb": 856,
      "average_mb": 642,
      "limit_mb": 1024,
      "peak_percent": 83.6
    },
    "cpu": {
      "average_percent": 45.3,
      "peak_percent": 92.1,
      "cores_allocated": 2.0
    },
    "disk": {
      "used_mb": 342,
      "limit_mb": 2048,
      "io_read_mb": 128,
      "io_write_mb": 45
    },
    "network": {
      "bytes_sent": 2457600,
      "bytes_received": 1536000,
      "requests_made": 450
    }
  },
  "logs_summary": {
    "total_lines": 1247,
    "error_count": 2,
    "warning_count": 5,
    "log_file_size_kb": 156,
    "preview": [
      "[2025-10-13T10:35:00.500Z] [INFO] Starting evaluation container",
      "[2025-10-13T10:35:05.200Z] [INFO] Installing dependencies...",
      "[2025-10-13T10:35:50.800Z] [INFO] Dependencies installed successfully",
      "[2025-10-13T10:36:00.100Z] [INFO] Starting API server on port 3000",
      "[2025-10-13T10:36:03.600Z] [INFO] Server ready, beginning tests"
    ]
  },
  "artifacts": [
    {
      "type": "test_report",
      "name": "API Test Report",
      "format": "html",
      "size_kb": 245,
      "url": "/api/artifacts/sub_1234567890abcdef/test-report.html",
      "expires_at": "2025-10-20T10:40:15.678Z"
    },
    {
      "type": "coverage_report",
      "name": "Code Coverage Report",
      "format": "html",
      "size_kb": 512,
      "url": "/api/artifacts/sub_1234567890abcdef/coverage/index.html",
      "expires_at": "2025-10-20T10:40:15.678Z"
    },
    {
      "type": "security_scan",
      "name": "Security Scan Results",
      "format": "json",
      "size_kb": 34,
      "url": "/api/artifacts/sub_1234567890abcdef/security-scan.json",
      "expires_at": "2025-10-20T10:40:15.678Z"
    },
    {
      "type": "performance_metrics",
      "name": "Performance Benchmark Data",
      "format": "json",
      "size_kb": 89,
      "url": "/api/artifacts/sub_1234567890abcdef/performance.json",
      "expires_at": "2025-10-20T10:40:15.678Z"
    }
  ],
  "metadata": {
    "judgehost_version": "0.1.0",
    "problem_version": "1.0.0",
    "evaluation_environment": {
      "base_image": "problem-rest-api-users:latest",
      "docker_version": "24.0.6",
      "os": "Ubuntu 22.04 LTS"
    }
  },
  "created_at": "2025-10-13T10:30:15.789Z",
  "evaluated_at": "2025-10-13T10:40:15.678Z"
}
```

#### Response (202 Accepted) - Evaluation In Progress

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "team_id": "team-42",
  "status": "running",
  "evaluation_status": "in_progress",
  "progress": {
    "phase": "evaluation",
    "current_step": "Running post-execution hooks",
    "steps_completed": 5,
    "total_steps": 7,
    "percent_complete": 71,
    "current_activity": "Executing security_scan.sh"
  },
  "partial_results": {
    "completed_rubrics": [
      {
        "rubric_id": "api_correctness",
        "rubric_name": "API Correctness",
        "score": 38.0,
        "max_score": 40.0,
        "status": "completed"
      }
    ],
    "pending_rubrics": [
      {
        "rubric_id": "security",
        "rubric_name": "Security Implementation",
        "status": "in_progress"
      },
      {
        "rubric_id": "code_quality",
        "rubric_name": "Code Quality & Style",
        "status": "pending"
      }
    ]
  },
  "estimated_completion_time": "2025-10-13T10:40:00.000Z",
  "elapsed_seconds": 180,
  "estimated_remaining_seconds": 120,
  "message": "Evaluation in progress. Check back in a few moments."
}
```

#### Response (200 OK) - Evaluation Failed

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "team_id": "team-42",
  "status": "completed",
  "evaluation_status": "failed",
  "overall_result": {
    "passed": false,
    "total_score": 0,
    "max_score": 100,
    "percentage": 0,
    "verdict": "Failed"
  },
  "failure_reason": {
    "type": "deployment_failed",
    "message": "Application failed to start",
    "details": {
      "phase": "deployment",
      "error": "Error: listen EADDRINUSE: address already in use :::3000",
      "exit_code": 1,
      "stderr": "Error: listen EADDRINUSE: address already in use :::3000\n    at Server.setupListenHandle [as _listen2] (node:net:1740:16)\n    at listenInCluster (node:net:1788:12)"
    },
    "suggestion": "Check that your application uses the PORT environment variable or a unique port number."
  },
  "execution_summary": {
    "container_id": "eval-sub_1234567890abcdef",
    "started_at": "2025-10-13T10:35:00.123Z",
    "failed_at": "2025-10-13T10:36:05.456Z",
    "total_time_seconds": 65.3,
    "phases": {
      "download": {
        "duration_seconds": 4.8,
        "status": "success"
      },
      "pre_execution": {
        "duration_seconds": 55.2,
        "status": "success"
      },
      "deployment": {
        "duration_seconds": 5.3,
        "status": "failed",
        "error": "Application startup failed"
      }
    }
  },
  "logs_summary": {
    "total_lines": 234,
    "error_count": 15,
    "warning_count": 3,
    "log_file_size_kb": 28,
    "errors": [
      {
        "timestamp": "2025-10-13T10:36:05.123Z",
        "level": "error",
        "message": "Error: listen EADDRINUSE: address already in use :::3000"
      }
    ]
  },
  "created_at": "2025-10-13T10:30:15.789Z",
  "evaluated_at": "2025-10-13T10:36:05.456Z"
}
```

#### Response (200 OK) - Evaluation Timeout

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "database-design",
  "team_id": "team-42",
  "status": "completed",
  "evaluation_status": "timeout",
  "overall_result": {
    "passed": false,
    "total_score": 0,
    "max_score": 100,
    "percentage": 0,
    "verdict": "Time Limit Exceeded"
  },
  "failure_reason": {
    "type": "timeout",
    "message": "Evaluation exceeded time limit",
    "details": {
      "timeout_seconds": 300,
      "elapsed_seconds": 301,
      "phase": "evaluation",
      "current_hook": "complex_query_test.sh"
    },
    "suggestion": "Optimize your queries or algorithms to run within the time limit."
  },
  "partial_results": {
    "completed_rubrics": [
      {
        "rubric_id": "schema_design",
        "score": 18.0,
        "max_score": 20.0
      }
    ],
    "incomplete_rubrics": [
      {
        "rubric_id": "query_performance",
        "status": "timeout"
      }
    ]
  },
  "resource_metrics": {
    "memory": {
      "peak_mb": 512,
      "average_mb": 480,
      "limit_mb": 1024
    },
    "cpu": {
      "average_percent": 98.5,
      "peak_percent": 100.0
    }
  },
  "created_at": "2025-10-13T10:30:15.789Z",
  "evaluated_at": "2025-10-13T10:35:16.123Z"
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "submission_not_found",
  "message": "Submission with the specified ID does not exist",
  "details": {
    "submission_id": "sub_unknown123456",
    "suggestion": "Check the submission ID or verify that the submission was created successfully"
  }
}
```

#### Error Response (204 No Content) - Queued, No Results Yet

When a submission is queued but evaluation hasn't started:

```http
HTTP/1.1 204 No Content
```

---

## GET /results/:submission_id/logs

Retrieves full execution logs for a submission.

### Description

Returns complete container execution logs including:

- Standard output (stdout)
- Standard error (stderr)
- Hook execution logs
- System messages

### Request

**Endpoint:** `GET /results/:submission_id/logs`

#### Query Parameters

| Parameter    | Type    | Required | Description                                                                            |
| ------------ | ------- | -------- | -------------------------------------------------------------------------------------- |
| `type`       | string  | No       | Log type: `"all"` (default), `"stdout"`, `"stderr"`, `"hooks"`, `"system"`             |
| `phase`      | string  | No       | Filter by phase: `"pre_execution"`, `"deployment"`, `"evaluation"`, `"post_execution"` |
| `format`     | string  | No       | Format: `"text"` (default), `"json"`, `"html"`                                         |
| `timestamps` | boolean | No       | Include timestamps (default: `true`)                                                   |
| `download`   | boolean | No       | Download as file (default: `false`)                                                    |

### Response

#### Success Response (200 OK) - Text Format

```text
[2025-10-13T10:35:00.123Z] [INFO] Starting evaluation container eval-sub_1234567890abcdef
[2025-10-13T10:35:00.456Z] [INFO] Problem: rest-api-users (version 1.0.0)
[2025-10-13T10:35:00.789Z] [INFO] Team: team-42
[2025-10-13T10:35:01.012Z] [SYSTEM] Downloading submission from Git repository
[2025-10-13T10:35:05.234Z] [SYSTEM] Git clone completed (commit: a1b2c3d4e5f6)
[2025-10-13T10:35:05.567Z] [INFO] Running pre-execution hooks
[2025-10-13T10:35:05.890Z] [HOOK:PRE] Executing 01_install_dependencies.sh
[2025-10-13T10:35:06.123Z] [STDOUT] npm install
[2025-10-13T10:35:12.456Z] [STDOUT] added 245 packages in 6.2s
[2025-10-13T10:35:12.789Z] [HOOK:PRE] 01_install_dependencies.sh completed (exit code: 0)
[2025-10-13T10:35:13.012Z] [HOOK:PRE] Executing 02_setup_database.sh
[2025-10-13T10:35:15.345Z] [STDOUT] Database initialized successfully
[2025-10-13T10:35:15.678Z] [HOOK:PRE] 02_setup_database.sh completed (exit code: 0)
[2025-10-13T10:35:16.001Z] [INFO] Starting application deployment
[2025-10-13T10:35:16.334Z] [STDOUT] Server listening on port 3000
[2025-10-13T10:35:19.667Z] [INFO] Application deployed successfully
[2025-10-13T10:35:20.000Z] [INFO] Running post-execution hooks
[2025-10-13T10:35:20.333Z] [HOOK:POST] Executing test_api_endpoints.sh
[2025-10-13T10:35:22.666Z] [STDOUT] Running 20 API tests...
[2025-10-13T10:35:45.999Z] [STDOUT] Tests passed: 19/20
[2025-10-13T10:35:46.332Z] [STDERR] FAIL: DELETE /users/:id with invalid ID
[2025-10-13T10:35:46.665Z] [HOOK:POST] test_api_endpoints.sh completed (exit code: 0)
...
[2025-10-13T10:40:15.678Z] [INFO] Evaluation completed successfully
```

#### Success Response (200 OK) - JSON Format

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "log_entries": [
    {
      "timestamp": "2025-10-13T10:35:00.123Z",
      "level": "info",
      "source": "system",
      "message": "Starting evaluation container eval-sub_1234567890abcdef"
    },
    {
      "timestamp": "2025-10-13T10:35:05.890Z",
      "level": "info",
      "source": "hook",
      "phase": "pre_execution",
      "hook_name": "01_install_dependencies.sh",
      "message": "Executing 01_install_dependencies.sh"
    },
    {
      "timestamp": "2025-10-13T10:35:06.123Z",
      "level": "info",
      "source": "stdout",
      "message": "npm install"
    },
    {
      "timestamp": "2025-10-13T10:35:46.665Z",
      "level": "error",
      "source": "stderr",
      "phase": "evaluation",
      "message": "FAIL: DELETE /users/:id with invalid ID"
    }
  ],
  "summary": {
    "total_entries": 1247,
    "by_level": {
      "info": 1180,
      "warning": 5,
      "error": 2
    },
    "by_source": {
      "system": 45,
      "hook": 128,
      "stdout": 1050,
      "stderr": 24
    }
  }
}
```

---

## GET /results/:submission_id/metrics

Retrieves detailed performance metrics for a submission.

### Description

Returns comprehensive performance metrics including:

- CPU and memory usage over time
- Network I/O statistics
- Disk I/O statistics
- Hook execution times
- Performance benchmarks

### Request

**Endpoint:** `GET /results/:submission_id/metrics`

#### Query Parameters

| Parameter     | Type   | Required | Description                                                           |
| ------------- | ------ | -------- | --------------------------------------------------------------------- |
| `granularity` | string | No       | Time granularity: `"summary"` (default), `"detailed"`, `"timeseries"` |
| `format`      | string | No       | Format: `"json"` (default), `"csv"`                                   |

### Response

#### Success Response (200 OK) - Summary Granularity

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "metrics": {
    "cpu": {
      "average_percent": 45.3,
      "peak_percent": 92.1,
      "median_percent": 42.0,
      "total_cpu_seconds": 285.6,
      "cores_allocated": 2.0
    },
    "memory": {
      "peak_mb": 856,
      "average_mb": 642,
      "median_mb": 620,
      "limit_mb": 1024,
      "peak_percent": 83.6,
      "oom_events": 0
    },
    "disk": {
      "used_mb": 342,
      "limit_mb": 2048,
      "read_operations": 5432,
      "write_operations": 1234,
      "io_read_mb": 128,
      "io_write_mb": 45,
      "iops_average": 450
    },
    "network": {
      "bytes_sent": 2457600,
      "bytes_received": 1536000,
      "packets_sent": 12340,
      "packets_received": 10250,
      "requests_made": 450,
      "bandwidth_mbps_average": 1.2
    },
    "execution_times": {
      "total_seconds": 315.6,
      "download_seconds": 5.2,
      "pre_execution_seconds": 45.8,
      "deployment_seconds": 3.5,
      "evaluation_seconds": 248.3,
      "post_execution_seconds": 12.8
    },
    "hook_execution_times": {
      "01_install_dependencies.sh": 42.5,
      "02_setup_database.sh": 3.3,
      "test_api_endpoints.sh": 125.8,
      "security_scan.sh": 98.2,
      "performance_benchmark.sh": 24.3
    }
  },
  "collected_at": "2025-10-13T10:40:15.678Z"
}
```

#### Success Response (200 OK) - Timeseries Granularity

```json
{
  "success": true,
  "submission_id": "sub_1234567890abcdef",
  "timeseries": {
    "interval_seconds": 5,
    "data_points": [
      {
        "timestamp": "2025-10-13T10:35:00.000Z",
        "cpu_percent": 12.5,
        "memory_mb": 256,
        "disk_io_read_kbps": 1024,
        "disk_io_write_kbps": 256,
        "network_rx_kbps": 128,
        "network_tx_kbps": 64
      },
      {
        "timestamp": "2025-10-13T10:35:05.000Z",
        "cpu_percent": 85.3,
        "memory_mb": 512,
        "disk_io_read_kbps": 5120,
        "disk_io_write_kbps": 1024,
        "network_rx_kbps": 2048,
        "network_tx_kbps": 512
      }
      // ... more data points
    ]
  },
  "summary": {
    "total_data_points": 63,
    "duration_seconds": 315
  }
}
```

---

## GET /results

Lists results for multiple submissions.

### Request

**Endpoint:** `GET /results`

#### Query Parameters

| Parameter    | Type    | Required | Description                                                                    |
| ------------ | ------- | -------- | ------------------------------------------------------------------------------ |
| `problem_id` | string  | No       | Filter by problem                                                              |
| `team_id`    | string  | No       | Filter by team                                                                 |
| `status`     | string  | No       | Filter by evaluation status: `"success"`, `"failed"`, `"timeout"`              |
| `min_score`  | number  | No       | Minimum total score                                                            |
| `max_score`  | number  | No       | Maximum total score                                                            |
| `limit`      | integer | No       | Results per page (default: 20, max: 100)                                       |
| `offset`     | integer | No       | Pagination offset (default: 0)                                                 |
| `sort`       | string  | No       | Sort by: `"score"`, `"evaluated_at"`, `"duration"` (default: `"evaluated_at"`) |
| `order`      | string  | No       | Sort order: `"asc"` or `"desc"` (default: `"desc"`)                            |

### Response

```json
{
  "success": true,
  "results": [
    {
      "submission_id": "sub_1234567890abcdef",
      "problem_id": "rest-api-users",
      "team_id": "team-42",
      "status": "completed",
      "evaluation_status": "success",
      "total_score": 87.5,
      "max_score": 100,
      "percentage": 87.5,
      "passed": true,
      "evaluated_at": "2025-10-13T10:40:15.678Z",
      "duration_seconds": 315.6
    },
    {
      "submission_id": "sub_fedcba0987654321",
      "problem_id": "database-design",
      "team_id": "team-42",
      "status": "completed",
      "evaluation_status": "timeout",
      "total_score": 0,
      "max_score": 100,
      "percentage": 0,
      "passed": false,
      "evaluated_at": "2025-10-13T10:35:16.123Z",
      "duration_seconds": 301.0
    }
  ],
  "statistics": {
    "total_results": 45,
    "average_score": 72.3,
    "median_score": 75.0,
    "pass_rate": 0.82,
    "average_duration_seconds": 285.4
  },
  "pagination": {
    "total": 45,
    "limit": 20,
    "offset": 0,
    "has_more": true
  }
}
```

---

## Rubric Details Structure

All rubrics follow a standardized structure with `rubric_type` defining the evaluation method and details format.

### Common Fields

Every rubric includes:

- `rubric_id`, `rubric_name` - Identifiers
- `rubric_type` - Type of evaluation (see [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md))
- `score`, `max_score`, `percentage` - Scoring
- `weight`, `weighted_score` - Weighting
- `status` - Evaluation status
- `details` - Type-specific details (structure varies by `rubric_type`)
- `feedback` - Human-readable feedback

### Details Field Normalization

The `details` field structure is standardized per `rubric_type`:

- All types include: `total`, `passed`, `failed`, `skipped`
- Type-specific fields vary (see [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for complete specifications)

**Examples**:

- `test_cases`: includes `failures` array
- `security_scan`: includes `vulnerabilities` array and `summary`
- `performance_benchmark`: includes `benchmarks` array and `summary`
- `code_quality`: includes `metrics` object and `issues` array
- `api_endpoints`: includes `endpoints` array

See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for complete details field specifications for each rubric type.

---

## Result Status Values

### Evaluation Status

- `"success"` - Evaluation completed successfully
- `"failed"` - Evaluation failed (deployment, runtime error)
- `"timeout"` - Evaluation exceeded time limit
- `"cancelled"` - Evaluation was cancelled by user
- `"error"` - Internal error during evaluation

### Rubric Status

- `"passed"` - Rubric fully passed (typically >= 90%)
- `"partial"` - Rubric partially passed (typically 50-89%)
- `"failed"` - Rubric failed (typically < 50%)
- `"skipped"` - Rubric was skipped (dependency failed)
- `"in_progress"` - Rubric evaluation in progress
- `"pending"` - Rubric evaluation not started

### Verdict Values

- `"Excellent"` - Score >= 95%
- `"Good"` - Score >= 85%
- `"Acceptable"` - Score >= 70%
- `"Needs Improvement"` - Score >= 50%
- `"Failed"` - Score < 50%
- `"Time Limit Exceeded"` - Timeout
- `"Runtime Error"` - Execution failed

---

## Notes

1. **Automated evaluation only**: All rubrics are evaluated by hooks - no manual/human review
2. **Standardized rubric types**: See [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) for all supported types and their details structures
3. **Caching**: Results are cached for 5 minutes after completion
4. **Artifacts Expiration**: Artifact URLs expire after 7 days
5. **Log Size Limits**: Full logs are limited to 10 MB; larger logs are truncated
6. **Real-time Updates**: Use WebSocket endpoint `/ws/results/:submission_id` for real-time updates during evaluation
7. **Partial Results**: Available for in-progress evaluations using `?include_partial=true`
8. **Comparison**: Use `/results/compare?submissions=id1,id2,id3` to compare multiple submissions

---

## See Also

[`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type definitions and details field structures
[`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container execution and resource metrics
[`[API] ADD_SUBMISSION.md`](%5BAPI%5D%20ADD_SUBMISSION.md) - Submission management
[`[GUIDE] WRITING_HOOKS.md`](%5BGUIDE%5D%20WRITING_HOOKS.md) - Guide for writing evaluation hooks that produce results
