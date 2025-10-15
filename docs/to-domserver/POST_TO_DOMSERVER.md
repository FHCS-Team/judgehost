# POST to DOMserver

After evaluation completes, the judgehost automatically submits results to DOMserver via HTTP POST.

---

## DOMserver Endpoint

```
POST {DOMSERVER_URL}/api/v4/judgehosts/add-judging-run/{hostname}/{submission_id}
```

### URL Parameters

| Parameter       | Example                     | Description                                      |
| --------------- | --------------------------- | ------------------------------------------------ |
| `hostname`      | `judgehost-1`               | Judgehost identifier (from `JUDGEHOST_HOSTNAME`) |
| `submission_id` | `sub_1760508291503a6mfftdq` | Unique submission identifier                     |

### Complete URL Example

```
POST http://domserver.example.com/api/v4/judgehosts/add-judging-run/judgehost-1/sub_1760508291503a6mfftdq
```

---

## Authentication

**Method:** HTTP Basic Authentication

**Headers:**

```http
Authorization: Basic {base64(username:password)}
Content-Type: application/json
X-Judgehost-Version: 1.0.0
```

**Configuration:**

```bash
DOMSERVER_USERNAME=judgehost
DOMSERVER_PASSWORD=your-secure-password
```

---

## Request Payload

### Complete Example (sql-optimization)

```json
{
  "judge_task_id": null,
  "submission_id": "sub_1760508291503a6mfftdq",
  "problem_id": "sql-optimization",
  "status": "completed",
  "started_at": "2025-10-15T06:04:51.000Z",
  "completed_at": "2025-10-15T06:05:39.595Z",
  "execution_time_seconds": 48.595,
  "total_score": 66.16,
  "max_score": 100,
  "percentage": 66.16,
  "rubrics": [
    {
      "rubric_id": "correctness",
      "name": "Query Result Correctness",
      "rubric_type": "test_cases",
      "score": 50,
      "max_score": 50,
      "percentage": 100,
      "status": "DONE",
      "message": "Query correctness: 3/3 queries passed",
      "details": {
        "total_queries": 3,
        "passed_queries": 3,
        "failed_queries": 0
      }
    },
    {
      "rubric_id": "query_latency",
      "name": "Query Latency Performance",
      "rubric_type": "performance_benchmark",
      "score": 0,
      "max_score": 30,
      "percentage": 0,
      "status": "DONE",
      "message": "Query latency: average score 0.0000",
      "details": {
        "queries_tested": 3,
        "target_ms": 2000,
        "timeout_ms": 5000
      }
    },
    {
      "rubric_id": "concurrency",
      "name": "Concurrent Load Performance",
      "rubric_type": "performance_benchmark",
      "score": 10,
      "max_score": 10,
      "percentage": 100,
      "status": "DONE",
      "message": "Concurrency: 40.17 qps (target: 10)",
      "details": {
        "total_queries": 1205,
        "duration_seconds": 30,
        "concurrent_clients": 10,
        "throughput_qps": 40.17,
        "target_qps": 10
      }
    },
    {
      "rubric_id": "resource_efficiency",
      "name": "Storage Efficiency",
      "rubric_type": "resource_usage",
      "score": 6.16,
      "max_score": 10,
      "percentage": 61.6,
      "status": "DONE",
      "message": "Storage: 11.53% additional (target: ≤30%)",
      "details": {
        "base_size_bytes": 10732323,
        "extra_storage_bytes": 1236992,
        "extra_storage_percentage": 11.53,
        "target_percentage": 30
      }
    }
  ],
  "logs_url": "http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/logs",
  "artifacts_urls": {
    "metrics": "http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/metrics"
  },
  "metadata": {
    "judgehost_version": "1.0.0",
    "judgehost_hostname": "judgehost-1",
    "docker_version": "24.0.0",
    "node_version": "v20.11.0",
    "platform": "linux",
    "arch": "x64",
    "problem_version": "1.0.0",
    "problem_name": "Database Query Optimization Challenge",
    "project_type": "database",
    "evaluation_method": "containerized_hooks",
    "timestamp": "2025-10-15T06:05:39.595Z"
  }
}
```

---

## Payload Field Descriptions

### Root Level Fields

| Field                    | Type              | Required | Description                                               |
| ------------------------ | ----------------- | -------- | --------------------------------------------------------- |
| `judge_task_id`          | number/null       | No       | Task ID assigned by DOMserver (if fetched from DOMserver) |
| `submission_id`          | string            | Yes      | Unique submission identifier                              |
| `problem_id`             | string            | Yes      | Problem identifier                                        |
| `status`                 | string            | Yes      | `"completed"`, `"failed"`, or `"error"`                   |
| `started_at`             | string (ISO 8601) | Yes      | Evaluation start timestamp                                |
| `completed_at`           | string (ISO 8601) | Yes      | Evaluation end timestamp                                  |
| `execution_time_seconds` | number            | Yes      | Total execution time in seconds                           |
| `total_score`            | number            | Yes      | Sum of all rubric scores                                  |
| `max_score`              | number            | Yes      | Sum of all rubric max scores                              |
| `percentage`             | number            | Yes      | Overall percentage (0-100)                                |

### Rubrics Array

Each rubric object contains:

| Field         | Type   | Required | Description                                                               |
| ------------- | ------ | -------- | ------------------------------------------------------------------------- |
| `rubric_id`   | string | Yes      | Unique rubric identifier (e.g., `"correctness"`)                          |
| `name`        | string | Yes      | Human-readable rubric name                                                |
| `rubric_type` | string | Yes      | Type: `"test_cases"`, `"performance_benchmark"`, `"resource_usage"`, etc. |
| `score`       | number | Yes      | Points earned (0 to max_score)                                            |
| `max_score`   | number | Yes      | Maximum possible points                                                   |
| `percentage`  | number | Yes      | Rubric percentage (0-100)                                                 |
| `status`      | string | Yes      | `"DONE"`, `"FAILED"`, or `"SKIPPED"`                                      |
| `message`     | string | No       | Summary message (e.g., "3/3 queries passed")                              |
| `details`     | object | No       | Detailed metrics and breakdown                                            |

### URLs for Lazy Loading

| Field            | Type   | Description                     |
| ---------------- | ------ | ------------------------------- |
| `logs_url`       | string | URL to fetch all execution logs |
| `artifacts_urls` | object | Map of artifact names to URLs   |

### Metadata

System information for debugging and tracking:

| Field                | Type              | Description                                       |
| -------------------- | ----------------- | ------------------------------------------------- |
| `judgehost_version`  | string            | Judgehost version                                 |
| `judgehost_hostname` | string            | Judgehost identifier                              |
| `docker_version`     | string            | Docker version                                    |
| `node_version`       | string            | Node.js version                                   |
| `platform`           | string            | OS platform (`"linux"`, `"darwin"`, etc.)         |
| `arch`               | string            | CPU architecture (`"x64"`, `"arm64"`, etc.)       |
| `problem_version`    | string            | Problem package version                           |
| `problem_name`       | string            | Human-readable problem name                       |
| `project_type`       | string            | Project type (`"database"`, `"nodejs-api"`, etc.) |
| `evaluation_method`  | string            | Always `"containerized_hooks"`                    |
| `timestamp`          | string (ISO 8601) | Submission timestamp                              |

---

## Retry Logic

The judgehost automatically retries failed submissions:

**Retryable Errors:**

- Network errors (no response)
- HTTP 408 (Request Timeout)
- HTTP 429 (Too Many Requests)
- HTTP 500-504 (Server errors)

**Non-Retryable Errors:**

- HTTP 400 (Bad Request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not Found)

**Retry Configuration:**

```bash
DOMSERVER_RETRY_ENABLED=true
DOMSERVER_RETRY_MAX_ATTEMPTS=3
DOMSERVER_RETRY_DELAY_MS=1000
DOMSERVER_RETRY_BACKOFF_MULTIPLIER=2.0
```

**Retry Schedule:**

1. Attempt 1: Immediate
2. Attempt 2: After 1000ms delay
3. Attempt 3: After 2000ms delay (1000 × 2.0)

---

## Judgehost Logs

### Successful Submission

```
[INFO] Submitting result to DOMserver {
  submission_id: 'sub_1760508291503a6mfftdq',
  problem_id: 'sql-optimization',
  status: 'completed',
  totalScore: 66.16,
  maxScore: 100,
  percentage: '66.16',
  rubrics_count: 4,
  rubrics: [
    { id: 'correctness', name: 'Query Result Correctness', score: 50, max: 50, pct: '100.00' },
    { id: 'query_latency', name: 'Query Latency Performance', score: 0, max: 30, pct: '0.00' },
    { id: 'concurrency', name: 'Concurrent Load Performance', score: 10, max: 10, pct: '100.00' },
    { id: 'resource_efficiency', name: 'Storage Efficiency', score: 6.16, max: 10, pct: '61.60' }
  ]
}

[INFO] Result submitted successfully to DOMserver {
  submission_id: 'sub_1760508291503a6mfftdq',
  result_id: 'result_12345'
}

[INFO] Results submitted to DOMserver successfully {
  submission_id: 'sub_1760508291503a6mfftdq',
  result_id: 'result_12345'
}
```

### Failed Submission

```
[ERROR] Failed to submit result to DOMserver {
  submission_id: 'sub_1760508291503a6mfftdq',
  error: 'connect ECONNREFUSED 127.0.0.1:8080',
  status: undefined,
  data: undefined
}

[WARN] Failed to submit results to DOMserver {
  submission_id: 'sub_1760508291503a6mfftdq',
  reason: { message: 'connect ECONNREFUSED 127.0.0.1:8080' }
}
```

**Note:** Evaluation still completes successfully even if DOMserver submission fails.

---

## DOMserver Resource Fetching

After receiving the result, DOMserver can fetch additional details:

### Get All Logs

```bash
curl http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/logs
```

### Get Container-Specific Logs

```bash
curl http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/logs/submission
```

### Get Metrics

```bash
curl http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/metrics
```

### Get Artifacts

```bash
curl http://judgehost1.example.com:3000/api/results/sub_1760508291503a6mfftdq/artifacts/migration_metrics.json
```

---

## Configuration

### Required Environment Variables

```bash
# Enable DOMserver integration
DOMSERVER_ENABLED=true

# DOMserver connection
DOMSERVER_URL=http://domserver.example.com
DOMSERVER_API_VERSION=v4

# Authentication
DOMSERVER_USERNAME=judgehost
DOMSERVER_PASSWORD=your-secure-password

# Judgehost identification
JUDGEHOST_HOSTNAME=judgehost-1
JUDGEHOST_PUBLIC_URL=http://judgehost1.example.com:3000
```

### Optional Environment Variables

```bash
# Submission control
DOMSERVER_SUBMIT_RESULTS=true
DOMSERVER_SUBMIT_ON_COMPLETE=true

# Retry settings
DOMSERVER_RETRY_ENABLED=true
DOMSERVER_RETRY_MAX_ATTEMPTS=3
DOMSERVER_RETRY_DELAY_MS=1000
DOMSERVER_RETRY_BACKOFF_MULTIPLIER=2.0

# Timeout
DOMSERVER_TIMEOUT_MS=30000
```

---

## Testing

### Validate Payload Structure

```bash
node ./scripts/test-domserver-payload.js sub_1760508291503a6mfftdq
```

**Expected Output:**

```
=== Summary ===
Submission ID: sub_1760508291503a6mfftdq
Problem ID: sql-optimization
Status: completed
Total Score: 66.16 / 100
Percentage: 66.16%

Rubrics (4):
  1. Query Result Correctness (correctness)
     Score: 50.00 / 50 (100.00%)
  ...

✓ Payload is VALID
```

### Manual Submission Test

```bash
# Start mock DOMserver on port 4000
node -e "
const http = require('http');
http.createServer((req, res) => {
  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', () => {
    console.log('Received:', JSON.parse(body));
    res.writeHead(200, {'Content-Type': 'application/json'});
    res.end(JSON.stringify({success: true, data: {result_id: 'test_123'}}));
  });
}).listen(4000);
" &

# Configure judgehost to use mock server
export DOMSERVER_ENABLED=true
export DOMSERVER_URL=http://localhost:4000
export DOMSERVER_USERNAME=test
export DOMSERVER_PASSWORD=test

# Submit and wait for evaluation
./mock/zip-and-submit.sh ./mock/packages/db-optimization-submission-sample sql-optimization
```

- [POST /problems (Happy Path)](../examples/POST_problems_happy_path.md)
- [POST /submissions & /results (Happy Path)](../examples/POST_submissions_and_results_happy_path.md)
