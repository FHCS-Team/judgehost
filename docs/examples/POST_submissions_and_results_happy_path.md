# POST /submissions - Happy Path Example

## Endpoint

```
POST /submissions
Content-Type: multipart/form-data
```

---

## Fields Table

| Field           | Type   | Required | Description                                 |
| --------------- | ------ | -------- | ------------------------------------------- |
| problem_id      | string | Yes      | The problem identifier to submit for        |
| package_type    | string | Yes      | Type of package (e.g., 'file')              |
| submission_file | file   | Yes      | Tarball (.tar.gz) of the submission package |

---

## Submission Package

```
db-optimization-submission/
├── README.md              # Solution description
├── migration.sql          # Schema changes (indexes, etc.)
├── Q1.sql                 # Optimized query 1
├── Q2.sql                 # Optimized query 2
└── Q3.sql                 # Optimized query 3
```

### Using cURL

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problem_id=sql-optimization" \
  -F "package_type=file" \
  -F "submission_file=@db-optimization-submission.tar.gz"
```

### Using the Mock Script

```bash
./mock/zip-and-submit.sh ./mock/packages/db-optimization-submission-sample sql-optimization
```

---

### Success Response (202 Accepted)

```json
{
  "success": true,
  "message": "Submission queued for evaluation",
  "data": {
    "submission_id": "sub_1760508291503a6mfftdq",
    "problem_id": "sql-optimization",
    "status": "queued",
    "enqueued_at": "2025-10-15T06:04:51.000Z",
    "position": 1,
    "estimated_wait_time_seconds": 60
  }
}
```

---

## Check Submission Status While Queued/Running

```bash
curl http://localhost:3000/api/submissions/sub_1760508291503a6mfftdq
```

**Response:**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1760508291503a6mfftdq",
    "problem_id": "sql-optimization",
    "status": "running",
    "enqueued_at": "2025-10-15T06:04:51.000Z",
    "started_at": "2025-10-15T06:04:52.000Z"
  }
}
```

---

## Get Evaluation Results After Completion

```bash
curl http://localhost:3000/api/results/sub_1760508291503a6mfftdq
```

**Response:**

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_1760508291503a6mfftdq",
    "problem_id": "sql-optimization",
    "status": "completed",
    "evaluated_at": "2025-10-15T06:05:39.595Z",
    "execution_status": "success",
    "timed_out": false,
    "total_score": 66.16,
    "max_score": 100,
    "percentage": 66.16,
    "rubric_scores": [
      {
        "rubric_id": "correctness",
        "rubric_name": "Query Result Correctness",
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
        "rubric_name": "Query Latency Performance",
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
        "rubric_name": "Concurrent Load Performance",
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
        "rubric_name": "Storage Efficiency",
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
    "metadata": {
      "execution_time": 48044,
      "memory_used": 0
    }
  }
}
```

## DOMserver Submission (Automatic)

### If DOMserver Integration Enabled

The judgehost automatically POSTs results to DOMserver:

**Endpoint Called:**

```
POST {DOMSERVER_URL}/api/v4/judgehosts/add-judging-run/{hostname}/{submission_id}
```

**See:** [POST to DOMserver Documentation](../to-domserver/POST_TO_DOMSERVER.md) for complete payload details.

## Related Documentation

- [POST /problems (Happy Path)](POST_problems_happy_path.md)
- [POST to DOMserver](../to-domserver/POST_TO_DOMSERVER.md)
