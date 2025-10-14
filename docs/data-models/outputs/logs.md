# Log Output Format Specification

This document specifies the structure and format of logs generated during submission evaluation.

**Related Documentation**:

- [`../../results/GET_results_logs.md`](../../results/GET_results_logs.md) - Log retrieval API
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Container-to-rubric mapping
- [`metrics.md`](metrics.md) - Resource metrics specification

---

## Overview

The judgehost collects logs from multiple sources during evaluation:

- **System logs**: Container lifecycle, orchestration events
- **Hook logs**: Execution of evaluation hooks
- **Application logs**: Submission application output (stdout/stderr)
- **Multi-container logs**: Logs from all containers in the evaluation environment

All logs are timestamped, categorized, and associated with their source container.

---

## Log Entry Structure

### JSON Format

```json
{
  "timestamp": "2025-10-13T10:35:08.456Z",
  "level": "info",
  "source": "stdout",
  "container_id": "submission",
  "phase": "execution",
  "hook_name": null,
  "message": "Server listening on port 3000"
}
```

### Text Format

```
[2025-10-13T10:35:08.456Z] [INFO] [stdout:submission] Server listening on port 3000
```

---

## Log Fields

| Field          | Type   | Required | Description                                              |
| -------------- | ------ | -------- | -------------------------------------------------------- |
| `timestamp`    | string | Yes      | ISO 8601 timestamp with milliseconds                     |
| `level`        | string | Yes      | Log level: `"debug"`, `"info"`, `"warn"`, `"error"`      |
| `source`       | string | Yes      | Log source: `"system"`, `"hook"`, `"stdout"`, `"stderr"` |
| `container_id` | string | Yes\*    | Container identifier (\*multi-container only)            |
| `phase`        | string | No       | Execution phase (see below)                              |
| `hook_name`    | string | No       | Hook script name (for `source="hook"` only)              |
| `message`      | string | Yes      | Log message content                                      |
| `metadata`     | object | No       | Additional context-specific data                         |

---

## Log Levels

### `debug`

Detailed diagnostic information for troubleshooting.

```json
{
  "level": "debug",
  "source": "system",
  "message": "Container network interface configured: eth0 172.18.0.3"
}
```

### `info`

Normal operational messages.

```json
{
  "level": "info",
  "source": "hook",
  "hook_name": "01_install_dependencies.sh",
  "message": "Installing npm packages..."
}
```

### `warn`

Warning messages for non-critical issues.

```json
{
  "level": "warn",
  "source": "stdout",
  "message": "DeprecationWarning: Buffer() is deprecated"
}
```

### `error`

Error messages for critical issues.

```json
{
  "level": "error",
  "source": "hook",
  "hook_name": "02_security_scan.sh",
  "message": "Security scan failed: unable to parse package.json"
}
```

---

## Log Sources

### `system`

Judgehost system messages about container lifecycle and orchestration.

**Examples**:

```json
{"source": "system", "message": "Starting evaluation for submission sub_123"}
{"source": "system", "message": "Building container 'submission'"}
{"source": "system", "container_id": "submission", "message": "Container started"}
{"source": "system", "container_id": "api_tester", "message": "Container started"}
{"source": "system", "message": "All containers started successfully"}
{"source": "system", "message": "Evaluation completed successfully"}
```

### `hook`

Messages from hook execution (pre, post, periodic).

**Examples**:

```json
{
  "source": "hook",
  "container_id": "submission",
  "phase": "pre_execution",
  "hook_name": "01_install_dependencies.sh",
  "message": "Executing 01_install_dependencies.sh"
}
```

```json
{
  "source": "hook",
  "container_id": "submission",
  "phase": "pre_execution",
  "hook_name": "01_install_dependencies.sh",
  "message": "01_install_dependencies.sh completed (exit: 0)",
  "metadata": {
    "exit_code": 0,
    "duration_seconds": 5.234
  }
}
```

### `stdout`

Standard output from submission application or hooks.

**Examples**:

```json
{"source": "stdout", "container_id": "submission", "message": "npm install"}
{"source": "stdout", "container_id": "submission", "message": "added 156 packages in 4.321s"}
{"source": "stdout", "container_id": "submission", "message": "Server listening on port 3000"}
{"source": "stdout", "container_id": "api_tester", "message": "Running 25 API tests..."}
{"source": "stdout", "container_id": "api_tester", "message": "Tests: 23 passed, 2 failed"}
```

### `stderr`

Standard error from submission application or hooks.

**Examples**:

```json
{"source": "stderr", "level": "error", "container_id": "submission", "message": "Error: Cannot find module 'express'"}
{"source": "stderr", "level": "warn", "container_id": "submission", "message": "Warning: Unhandled promise rejection"}
```

---

## Execution Phases

### System Phases

- `initialization`: Evaluation setup
- `building`: Container image building
- `starting`: Container startup
- `execution`: Main evaluation execution
- `cleanup`: Resource cleanup
- `completed`: Evaluation finished

### Hook Phases

- `pre_execution`: Pre-execution hooks
- `post_execution`: Post-execution hooks
- `periodic`: Periodic monitoring hooks

---

## Multi-Container Logs

### Container Identification

In multi-container problems, every log entry includes `container_id`:

```json
[
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
    "timestamp": "2025-10-13T10:35:18.345Z",
    "level": "info",
    "source": "stdout",
    "container_id": "submission",
    "message": "Server listening on port 3000"
  },
  {
    "timestamp": "2025-10-13T10:35:25.901Z",
    "level": "info",
    "source": "stdout",
    "container_id": "api_tester",
    "message": "Running 25 API tests..."
  }
]
```

### Text Format with Container Tags

```
[2025-10-13T10:35:05.890Z] [INFO] [system:submission] Container 'submission' started
[2025-10-13T10:35:06.012Z] [INFO] [system:api_tester] Container 'api_tester' started
[2025-10-13T10:35:18.345Z] [INFO] [stdout:submission] Server listening on port 3000
[2025-10-13T10:35:25.901Z] [INFO] [stdout:api_tester] Running 25 API tests...
```

---

## Complete Example: Multi-Container API Problem

### JSON Format

```json
{
  "submission_id": "sub_1234567890abcdef",
  "log_entries": [
    {
      "timestamp": "2025-10-13T10:35:00.123Z",
      "level": "info",
      "source": "system",
      "phase": "initialization",
      "message": "Starting evaluation for submission sub_1234567890abcdef"
    },
    {
      "timestamp": "2025-10-13T10:35:01.234Z",
      "level": "info",
      "source": "system",
      "phase": "building",
      "message": "Building containers for problem 'rest-api-users'"
    },
    {
      "timestamp": "2025-10-13T10:35:05.890Z",
      "level": "info",
      "source": "system",
      "phase": "starting",
      "container_id": "submission",
      "message": "Container 'submission' started"
    },
    {
      "timestamp": "2025-10-13T10:35:06.012Z",
      "level": "info",
      "source": "system",
      "phase": "starting",
      "container_id": "api_tester",
      "message": "Container 'api_tester' started"
    },
    {
      "timestamp": "2025-10-13T10:35:07.123Z",
      "level": "info",
      "source": "hook",
      "phase": "pre_execution",
      "container_id": "submission",
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
      "timestamp": "2025-10-13T10:35:12.789Z",
      "level": "info",
      "source": "stdout",
      "container_id": "submission",
      "message": "added 156 packages in 4.321s"
    },
    {
      "timestamp": "2025-10-13T10:35:13.890Z",
      "level": "info",
      "source": "hook",
      "phase": "pre_execution",
      "container_id": "submission",
      "hook_name": "01_install_dependencies.sh",
      "message": "01_install_dependencies.sh completed (exit: 0)",
      "metadata": {
        "exit_code": 0,
        "duration_seconds": 6.767
      }
    },
    {
      "timestamp": "2025-10-13T10:35:17.012Z",
      "level": "info",
      "source": "system",
      "phase": "execution",
      "container_id": "submission",
      "message": "Starting submission application"
    },
    {
      "timestamp": "2025-10-13T10:35:18.345Z",
      "level": "info",
      "source": "stdout",
      "container_id": "submission",
      "message": "Server listening on port 3000"
    },
    {
      "timestamp": "2025-10-13T10:35:20.678Z",
      "level": "info",
      "source": "hook",
      "phase": "post_execution",
      "container_id": "api_tester",
      "hook_name": "01_test_api_endpoints.sh",
      "message": "Executing 01_test_api_endpoints.sh"
    },
    {
      "timestamp": "2025-10-13T10:35:25.901Z",
      "level": "info",
      "source": "stdout",
      "container_id": "api_tester",
      "message": "Running 25 API tests..."
    },
    {
      "timestamp": "2025-10-13T10:36:45.234Z",
      "level": "info",
      "source": "stdout",
      "container_id": "api_tester",
      "message": "Tests: 23 passed, 2 failed"
    },
    {
      "timestamp": "2025-10-13T10:36:45.567Z",
      "level": "info",
      "source": "hook",
      "phase": "post_execution",
      "container_id": "api_tester",
      "hook_name": "01_test_api_endpoints.sh",
      "message": "01_test_api_endpoints.sh completed (exit: 0)",
      "metadata": {
        "exit_code": 0,
        "duration_seconds": 84.889
      }
    },
    {
      "timestamp": "2025-10-13T10:36:46.123Z",
      "level": "info",
      "source": "hook",
      "phase": "post_execution",
      "container_id": "submission",
      "hook_name": "02_security_scan.sh",
      "message": "Executing 02_security_scan.sh"
    },
    {
      "timestamp": "2025-10-13T10:36:46.890Z",
      "level": "warn",
      "source": "hook",
      "phase": "post_execution",
      "container_id": "submission",
      "hook_name": "02_security_scan.sh",
      "message": "Security scan found 1 medium severity issue"
    },
    {
      "timestamp": "2025-10-13T10:36:47.234Z",
      "level": "info",
      "source": "hook",
      "phase": "post_execution",
      "container_id": "submission",
      "hook_name": "02_security_scan.sh",
      "message": "02_security_scan.sh completed (exit: 0)",
      "metadata": {
        "exit_code": 0,
        "duration_seconds": 1.111
      }
    },
    {
      "timestamp": "2025-10-13T10:40:15.678Z",
      "level": "info",
      "source": "system",
      "phase": "completed",
      "message": "Evaluation completed successfully"
    }
  ],
  "total_entries": 18,
  "containers": ["submission", "api_tester"]
}
```

---

## Log Filtering

### By Container

```bash
GET /api/results/sub_123/logs?container_id=api_tester
```

Returns only logs from the `api_tester` container.

### By Source

```bash
GET /api/results/sub_123/logs?source=hook
```

Returns only hook execution logs.

### By Level

```bash
GET /api/results/sub_123/logs?level=error
```

Returns only error-level logs.

### Combined Filters

```bash
GET /api/results/sub_123/logs?container_id=submission&source=stdout&level=error
```

Returns only error-level stdout logs from the submission container.

---

## Storage and Retention

### Log Storage

Logs are stored in the results directory:

```
data/results/sub_1234567890abcdef/
├── result.json           # Final evaluation result
├── logs.json             # Structured logs (JSON)
├── logs.txt              # Plain text logs
└── containers/
    ├── submission/
    │   └── logs.txt      # Container-specific logs
    └── api_tester/
        └── logs.txt      # Container-specific logs
```

### Size Limits

- **Per-submission log limit**: 10 MB (default)
- **Logs are truncated** if they exceed the limit
- **Truncation marker**: `[... TRUNCATED: logs exceeded 10MB limit ...]`

### Retention

- **Default retention**: 30 days
- **Configurable** via environment variable `LOG_RETENTION_DAYS`
- **Automatic cleanup**: Old logs are deleted periodically

---

## Best Practices

### For Problem Authors

1. **Use appropriate log levels**

   ```bash
   echo "[INFO] Starting tests..." >&2
   echo "[ERROR] Test failed: expected 200, got 404" >&2
   ```

2. **Include context in messages**

   ```bash
   echo "[INFO] Running test case 5/10: POST /api/users" >&2
   ```

3. **Avoid excessive logging**

   - Don't log every HTTP request in production-like tests
   - Summarize results instead of logging each test individually

4. **Log hook progress**
   ```bash
   #!/bin/bash
   echo "[INFO] Installing dependencies..." >&2
   npm install
   echo "[INFO] Dependencies installed successfully" >&2
   ```

### For Consuming Applications

1. **Filter logs by container** when analyzing specific components
2. **Use log levels** to focus on important messages
3. **Search by timestamp** to correlate events across containers
4. **Parse structured JSON logs** for programmatic analysis

---

## See Also

- [`../../results/GET_results_logs.md`](../../results/GET_results_logs.md) - Log retrieval API
- [`metrics.md`](metrics.md) - Resource metrics specification
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Container-to-rubric mapping
- [`../containers/resources.md`](../containers/resources.md) - Container resources and hooks
