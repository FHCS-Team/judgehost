# GET /results/:submission_id/logs

Retrieves execution logs for a submission.

**Related Documentation**:

- [`GET_results.md`](GET_results.md) - Main results endpoint
- [`../data-models/outputs/logs.md`](../data-models/outputs/logs.md) - Log format specification

---

## Description

Returns logs from:

- Container startup and initialization
- Hook execution (pre, post, periodic)
- Submission application output
- System events and errors
- Multiple containers (in multi-container problems)

## Request

**Endpoint:** `GET /results/:submission_id/logs`

### URL Parameters

| Parameter       | Type   | Description                     |
| --------------- | ------ | ------------------------------- |
| `submission_id` | string | Unique identifier of submission |

### Query Parameters

| Parameter      | Type   | Description                                                    |
| -------------- | ------ | -------------------------------------------------------------- |
| `format`       | string | Format: `"text"` (default) or `"json"`                         |
| `container_id` | string | Filter logs by specific container (optional)                   |
| `source`       | string | Filter by source: `"system"`, `"hook"`, `"stdout"`, `"stderr"` |
| `level`        | string | Filter by level: `"debug"`, `"info"`, `"warn"`, `"error"`      |
| `limit`        | number | Limit number of log entries (default: 1000)                    |

## Response

### Text Format (Default)

```
Content-Type: text/plain

[2025-10-13T10:35:00.123Z] [INFO] [system] Starting evaluation for submission sub_1234567890abcdef
[2025-10-13T10:35:01.234Z] [INFO] [system] Building containers...
[2025-10-13T10:35:05.890Z] [INFO] [system:submission] Container 'submission' started
[2025-10-13T10:35:06.012Z] [INFO] [system:api_tester] Container 'api_tester' started
[2025-10-13T10:35:07.123Z] [INFO] [hook:pre:submission] Executing 01_install_dependencies.sh
[2025-10-13T10:35:08.456Z] [INFO] [stdout:submission] npm install
[2025-10-13T10:35:12.789Z] [INFO] [stdout:submission] added 156 packages in 4.321s
[2025-10-13T10:35:13.890Z] [INFO] [hook:pre:submission] 01_install_dependencies.sh completed (exit: 0)
[2025-10-13T10:35:14.123Z] [INFO] [hook:pre:submission] Executing 02_setup_database.sh
[2025-10-13T10:35:16.456Z] [INFO] [stdout:submission] Database initialized
[2025-10-13T10:35:16.789Z] [INFO] [hook:pre:submission] 02_setup_database.sh completed (exit: 0)
[2025-10-13T10:35:17.012Z] [INFO] [system:submission] Starting submission application
[2025-10-13T10:35:18.345Z] [INFO] [stdout:submission] Server listening on port 3000
[2025-10-13T10:35:20.678Z] [INFO] [hook:post:api_tester] Executing 01_test_api_endpoints.sh
[2025-10-13T10:35:25.901Z] [INFO] [stdout:api_tester] Running 25 API tests...
[2025-10-13T10:36:45.234Z] [INFO] [stdout:api_tester] Tests: 23 passed, 2 failed
[2025-10-13T10:36:45.567Z] [INFO] [hook:post:api_tester] 01_test_api_endpoints.sh completed (exit: 0)
[2025-10-13T10:36:46.890Z] [WARN] [hook:post:submission] Security scan found 1 medium severity issue
[2025-10-13T10:40:15.678Z] [INFO] [system] Evaluation completed successfully
```

### JSON Format

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "log_entries": [
      {
        "timestamp": "2025-10-13T10:35:00.123Z",
        "level": "info",
        "source": "system",
        "message": "Starting evaluation for submission sub_1234567890abcdef"
      },
      {
        "timestamp": "2025-10-13T10:35:05.890Z",
        "level": "info",
        "source": "system",
        "container_id": "submission",
        "message": "Container 'submission' started"
      },
      {
        "timestamp": "2025-10-13T10:35:06.012Z",
        "level": "info",
        "source": "system",
        "container_id": "api_tester",
        "message": "Container 'api_tester' started"
      },
      {
        "timestamp": "2025-10-13T10:35:07.123Z",
        "level": "info",
        "source": "hook",
        "container_id": "submission",
        "phase": "pre_execution",
        "hook_name": "01_install_dependencies.sh",
        "message": "Executing 01_install_dependencies.sh"
      },
      {
        "timestamp": "2025-10-13T10:35:08.456Z",
        "level": "info",
        "source": "stdout",
        "container_id": "submission",
        "message": "npm install"
      },
      {
        "timestamp": "2025-10-13T10:35:20.678Z",
        "level": "info",
        "source": "hook",
        "container_id": "api_tester",
        "phase": "post_execution",
        "hook_name": "01_test_api_endpoints.sh",
        "message": "Executing 01_test_api_endpoints.sh"
      },
      {
        "timestamp": "2025-10-13T10:36:46.890Z",
        "level": "warn",
        "source": "hook",
        "container_id": "submission",
        "phase": "post_execution",
        "hook_name": "02_security_scan.sh",
        "message": "Security scan found 1 medium severity issue"
      },
      {
        "timestamp": "2025-10-13T10:40:15.678Z",
        "level": "info",
        "source": "system",
        "message": "Evaluation completed successfully"
      }
    ],
    "total_entries": 8,
    "containers": ["submission", "api_tester"],
    "timestamp": "2025-10-13T10:40:15.678Z"
  }
}
```

### Filtered by Container

```bash
GET /api/results/sub_1234567890abcdef/logs?format=json&container_id=api_tester
```

Response:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1234567890abcdef",
    "container_id": "api_tester",
    "log_entries": [
      {
        "timestamp": "2025-10-13T10:35:06.012Z",
        "level": "info",
        "source": "system",
        "container_id": "api_tester",
        "message": "Container 'api_tester' started"
      },
      {
        "timestamp": "2025-10-13T10:35:20.678Z",
        "level": "info",
        "source": "hook",
        "container_id": "api_tester",
        "phase": "post_execution",
        "hook_name": "01_test_api_endpoints.sh",
        "message": "Executing 01_test_api_endpoints.sh"
      },
      {
        "timestamp": "2025-10-13T10:35:25.901Z",
        "level": "info",
        "source": "stdout",
        "container_id": "api_tester",
        "message": "Running 25 API tests..."
      }
    ],
    "total_entries": 3
  }
}
```

### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "results_not_found",
  "message": "Results for submission sub_1234567890abcdef not found"
}
```

---

## Log Entry Structure

### Fields

| Field          | Type   | Description                                                                      |
| -------------- | ------ | -------------------------------------------------------------------------------- |
| `timestamp`    | string | ISO 8601 timestamp                                                               |
| `level`        | string | `"debug"`, `"info"`, `"warn"`, `"error"`                                         |
| `source`       | string | `"system"`, `"hook"`, `"stdout"`, `"stderr"`                                     |
| `container_id` | string | Container that generated the log (multi-container only)                          |
| `phase`        | string | Hook phase: `"pre_execution"`, `"post_execution"`, `"periodic"` (hook logs only) |
| `hook_name`    | string | Name of the hook script (hook logs only)                                         |
| `message`      | string | Log message content                                                              |

### Log Levels

- `debug`: Detailed diagnostic information
- `info`: Normal operational messages
- `warn`: Warning messages (non-critical issues)
- `error`: Error messages (critical issues)

### Log Sources

- `system`: Judgehost system messages (container lifecycle, orchestration)
- `hook`: Hook execution messages (pre, post, periodic)
- `stdout`: Submission application standard output
- `stderr`: Submission application standard error

---

## Multi-Container Logs

In multi-container problems, logs from all containers are interleaved chronologically. Each log entry includes a `container_id` field to identify its source:

```
[2025-10-13T10:35:05.890Z] [INFO] [system:submission] Container 'submission' started
[2025-10-13T10:35:06.012Z] [INFO] [system:api_tester] Container 'api_tester' started
[2025-10-13T10:35:18.345Z] [INFO] [stdout:submission] Server listening on port 3000
[2025-10-13T10:35:25.901Z] [INFO] [stdout:api_tester] Running 25 API tests...
```

Use the `container_id` query parameter to filter logs for a specific container.

---

## Notes

1. **Size Limits**: Logs are truncated if they exceed the configured size limit (default: 10MB per submission)
2. **Retention**: Logs are retained for the configured period (default: 30 days)
3. **Real-time Streaming**: For running submissions, logs may be incomplete. Poll periodically or use WebSocket streaming (if enabled)
4. **Container Identification**: Multi-container logs include `container_id` to distinguish sources

---

## See Also

- [`../data-models/outputs/logs.md`](../data-models/outputs/logs.md) - Detailed log format specification
- [`GET_results.md`](GET_results.md) - Main results endpoint
