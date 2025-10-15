# DOMserver Result Submission Implementation Guide

## Overview

This guide explains how the judgehost automatically submits evaluation results to the DOMserver using the new API endpoint.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        JUDGEHOST                                 │
│                                                                  │
│  ┌────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │  Processor │───▶│  Evaluation  │───▶│ DOMserver Client │───┼──┐
│  └────────────┘    └──────────────┘    └──────────────────┘   │  │
│         │                  │                      │             │  │
│         │                  ▼                      │             │  │
│         │          ┌──────────────┐               │             │  │
│         │          │ Result Files │               │             │  │
│         │          └──────────────┘               │             │  │
│         │                                         │             │  │
│         ▼                                         ▼             │  │
│  ┌────────────────────────────────────────────────────────┐    │  │
│  │              Results API Endpoints                      │    │  │
│  │  - GET /api/results/:id/logs                           │    │  │
│  │  - GET /api/results/:id/logs/:container_id             │    │  │
│  │  - GET /api/results/:id/artifacts                      │    │  │
│  │  - GET /api/results/:id/artifacts/:filename            │    │  │
│  │  - GET /api/results/:id/metrics                        │    │  │
│  └────────────────────────────────────────────────────────┘    │  │
│                                                                  │  │
└──────────────────────────────────────────────────────────────────┘  │
                                                                       │
                              HTTP POST                                │
                              with Result Data                         │
                              + URLs for Resources                     │
                                                                       │
┌──────────────────────────────────────────────────────────────────◀─┘
│                        DOMSERVER                                 │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  POST /api/v4/judgehosts/add-judging-run/{hostname}/{submission_id} │
│  │  - Validates request                                      │   │
│  │  - Stores result in database                             │   │
│  │  - Returns result_id                                      │   │
│  └──────────────────────────────────────────────────────────┘   │
│                          │                                       │
│                          ▼                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Lazy-fetching logs/artifacts from judgehost             │   │
│  │  - Fetches via URLs provided in submission               │   │
│  │  - Caches locally if needed                              │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Components

### 1. DOMserver Client (`src/utils/domserver.js`)

Handles communication with the DOMserver API.

**Key Features:**

- Automatic retry with exponential backoff
- Request/response logging
- Error handling and categorization
- URL building for judgehost resources

**Main Functions:**

- `submitResult(result, judgeTaskId)` - Submit evaluation results
- `notifyAvailability()` - Notify DOMserver of judgehost availability
- `buildPublicUrl(path)` - Build public URLs for resources

### 2. Processor Integration (`src/core/processor.js`)

Modified to automatically submit results after evaluation completes.

**Flow:**

1. Evaluation completes
2. Results saved to file
3. `domserver.submitResult()` called (if enabled)
4. Success/failure logged
5. Job marked as complete

### 3. Results API Endpoints (`src/server/routes/results.js`)

Provides access to evaluation resources for DOMserver to fetch.

**New Endpoints:**

#### GET /api/results/:submission_id/logs/:container_id

Get logs for a specific container.

**Response:**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_123",
    "container_id": "database-container",
    "log": "PostgreSQL starting...\n...",
    "log_size_bytes": 23456,
    "generated_at": "2024-10-15T10:35:45.000Z"
  }
}
```

#### GET /api/results/:submission_id/metrics

Get evaluation metrics.

**Response:**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_123",
    "metrics": {
      "migration_time_seconds": 0.123,
      "initial_size_bytes": 10732323,
      "final_size_bytes": 11969315,
      "extra_storage_percentage": 11.53
    }
  }
}
```

## Configuration

### Environment Variables

Add to `.env` file:

```bash
# Enable DOMserver integration
DOMSERVER_ENABLED=true

# DOMserver URL
DOMSERVER_URL=http://domserver.example.com

# HTTP Basic Authentication credentials
# User must have "judgehost" role in DOMserver
DOMSERVER_USERNAME=judgehost
DOMSERVER_PASSWORD=your-password-here

# Judgehost hostname (must match DOMserver registration)
JUDGEHOST_HOSTNAME=judgehost-1

# Public URL for this judgehost
JUDGEHOST_PUBLIC_URL=http://judgehost1.example.com:3000

# Auto-submit results
DOMSERVER_SUBMIT_RESULTS=true
DOMSERVER_SUBMIT_ON_COMPLETE=true

# Retry settings
DOMSERVER_RETRY_ENABLED=true
DOMSERVER_RETRY_MAX_ATTEMPTS=3
DOMSERVER_RETRY_DELAY_MS=1000
DOMSERVER_RETRY_BACKOFF_MULTIPLIER=2.0
```

### Configuration Module

Config added to `src/config/index.js`:

```javascript
domserver: {
  enabled: process.env.DOMSERVER_ENABLED === "true",
  url: process.env.DOMSERVER_URL || "",
  apiVersion: process.env.DOMSERVER_API_VERSION || "v4",
  username: process.env.DOMSERVER_USERNAME || "",
  password: process.env.DOMSERVER_PASSWORD || "",
  hostname: process.env.JUDGEHOST_HOSTNAME || require("os").hostname(),
  submitResults: process.env.DOMSERVER_SUBMIT_RESULTS !== "false",
  submitOnComplete: process.env.DOMSERVER_SUBMIT_ON_COMPLETE !== "false",
  retryEnabled: process.env.DOMSERVER_RETRY_ENABLED !== "false",
  retryMaxAttempts: parseInt(process.env.DOMSERVER_RETRY_MAX_ATTEMPTS || "3", 10),
  retryDelayMs: parseInt(process.env.DOMSERVER_RETRY_DELAY_MS || "1000", 10),
  retryBackoffMultiplier: parseFloat(process.env.DOMSERVER_RETRY_BACKOFF_MULTIPLIER || "2.0"),
  timeoutMs: parseInt(process.env.DOMSERVER_TIMEOUT_MS || "30000", 10),
  publicUrl: process.env.JUDGEHOST_PUBLIC_URL || "",
}
```

## API Request Format

The judgehost sends this payload to DOMserver:

```json
{
  "judge_task_id": 12345,
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
      "percentage": 100.0,
      "status": "DONE",
      "message": "Query correctness: 3/3 queries passed",
      "details": {
        "total_queries": 3,
        "passed_queries": 3,
        "failed_queries": 0
      }
    }
  ],
  "metrics": {
    "migration_time_seconds": 0,
    "initial_size_bytes": 10732323,
    "final_size_bytes": 11969315,
    "extra_storage_percentage": 11.53
  },
  "logs_url": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/logs",
  "artifacts_urls": {
    "metrics": "http://judgehost1.example.com:3000/api/results/sub_20241015_abc123/metrics"
  },
  "metadata": {
    "judgehost_version": "1.0.0",
    "judgehost_hostname": "judgehost-1",
    "docker_version": "24.0.0",
    "evaluation_method": "containerized_hooks"
  }
}
```

## Error Handling

### Retryable Errors

The client automatically retries on:

- Network errors (no response)
- HTTP 408 (Request Timeout)
- HTTP 429 (Too Many Requests)
- HTTP 500 (Internal Server Error)
- HTTP 502 (Bad Gateway)
- HTTP 503 (Service Unavailable)
- HTTP 504 (Gateway Timeout)

### Non-Retryable Errors

These fail immediately:

- HTTP 400 (Bad Request) - Invalid data
- HTTP 401 (Unauthorized) - Invalid token
- HTTP 403 (Forbidden) - Wrong judgehost
- HTTP 404 (Not Found) - Task not found
- HTTP 409 (Conflict) - Duplicate submission

### Retry Logic

```javascript
Attempt 1: Submit
  ↓ (fails)
Wait: 1000ms
  ↓
Attempt 2: Submit
  ↓ (fails)
Wait: 2000ms (1000 * 2^1)
  ↓
Attempt 3: Submit
  ↓ (fails)
Wait: 4000ms (1000 * 2^2)
  ↓
Final failure
```

## Testing

### Local Testing

1. **Start judgehost:**

```bash
npm start
```

2. **Configure test DOMserver:**

```bash
export DOMSERVER_ENABLED=true
export DOMSERVER_URL=http://localhost:8080
export DOMSERVER_AUTH_TOKEN=test-token
export JUDGEHOST_HOSTNAME=test-judgehost
export JUDGEHOST_PUBLIC_URL=http://localhost:3000
```

3. **Submit test evaluation:**

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=sql-optimization" \
  -F "team_id=test-team" \
  -F "submission_file=@./test-submission.zip"
```

4. **Check logs:**

```bash
# Watch for DOMserver submission
tail -f logs/judgehost.log | grep -i "domserver"
```

### Mock DOMserver

For testing without a real DOMserver, create a mock endpoint:

```javascript
// mock-domserver.js
const express = require("express");
const app = express();

app.use(express.json());

app.post("/api/v4/judgehosts/submit-result/:hostname", (req, res) => {
  console.log("Received result submission:", JSON.stringify(req.body, null, 2));

  res.json({
    success: true,
    message: "Evaluation result accepted",
    data: {
      result_id: `res_${Date.now()}`,
      submission_id: req.body.submission_id,
      judge_task_id: req.body.judge_task_id,
      total_score: req.body.rubrics.reduce((s, r) => s + r.score, 0),
      max_score: req.body.rubrics.reduce((s, r) => s + r.max_score, 0),
      received_at: new Date().toISOString(),
    },
  });
});

app.listen(8080, () => {
  console.log("Mock DOMserver running on http://localhost:8080");
});
```

Run: `node mock-domserver.js`

## Monitoring

### Logs to Watch

**Successful submission:**

```
INFO: Submitting result to DOMserver [submission_id=sub_123, problem_id=sql-opt]
INFO: Result submitted successfully to DOMserver [result_id=res_456]
```

**Failed submission with retry:**

```
WARN: Retrying result submission (attempt 2/3) [delay_ms=2000, error=ECONNREFUSED]
INFO: Result submitted successfully to DOMserver [result_id=res_456]
```

**Final failure:**

```
ERROR: Failed to submit result to DOMserver [submission_id=sub_123, status=403]
```

### Metrics

Track these metrics:

- `domserver_submissions_total` - Total submission attempts
- `domserver_submissions_success` - Successful submissions
- `domserver_submissions_failed` - Failed submissions
- `domserver_submission_duration_ms` - Submission latency
- `domserver_retry_attempts` - Retry count

## Security Considerations

1. **Authentication Token:**

   - Store securely in environment variables
   - Rotate regularly
   - Use strong, random tokens

2. **Network Security:**

   - Use HTTPS in production
   - Validate SSL certificates
   - Consider VPN/private network

3. **Access Control:**

   - Protect judgehost API endpoints
   - Use authentication for results access
   - Implement rate limiting

4. **Data Privacy:**
   - Sanitize logs before sending
   - Don't include sensitive data in URLs
   - Consider encryption for artifacts

## Troubleshooting

### Problem: Results not being submitted

**Check:**

```bash
# Is DOMserver integration enabled?
grep DOMSERVER_ENABLED .env

# Is URL configured?
grep DOMSERVER_URL .env

# Check logs
grep -i "domserver" logs/judgehost.log
```

### Problem: Authentication failures

**Check:**

```bash
# Verify token
grep DOMSERVER_AUTH_TOKEN .env

# Test token manually
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://domserver.example.com/api/v4/judgehosts
```

### Problem: DOMserver can't fetch logs/artifacts

**Check:**

```bash
# Is public URL correct?
grep JUDGEHOST_PUBLIC_URL .env

# Test from DOMserver network
curl http://judgehost1.example.com:3000/api/results/sub_123/logs

# Check firewall rules
sudo iptables -L | grep 3000
```

### Problem: Retry exhaustion

**Increase retry attempts:**

```bash
export DOMSERVER_RETRY_MAX_ATTEMPTS=5
export DOMSERVER_RETRY_DELAY_MS=2000
```

## Migration from Legacy API

### Key Changes

| Legacy Field             | New Approach             |
| ------------------------ | ------------------------ |
| `output_run` (base64)    | `logs_url` (URL)         |
| `output_diff` (base64)   | Removed (not applicable) |
| `output_error` (base64)  | Included in logs         |
| `output_system` (base64) | Included in logs         |
| `team_message` (base64)  | `rubrics[].message`      |
| `metadata` (base64)      | `metadata` (JSON object) |
| `runresult`              | `status` + `rubrics`     |
| `runtime`                | `execution_time_seconds` |

### Migration Steps

1. Update DOMserver to support new endpoint
2. Configure judgehost with DOMserver settings
3. Enable `DOMSERVER_ENABLED=true`
4. Test with sample submission
5. Monitor logs for successful submission
6. Disable legacy endpoint once confirmed

## See Also

- [API_RESULT_SUBMISSION.md](./API_RESULT_SUBMISSION.md) - Full API specification
- [GET_results.md](./results/GET_results.md) - Results API documentation
- Configuration reference in `src/config/index.js`
