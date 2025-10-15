# POST /problems - Happy Path Example

## Endpoint

```
POST /problems
Content-Type: multipart/form-data
```

---

## Fields Table

| Field           | Type   | Required | Description                              |
| --------------- | ------ | -------- | ---------------------------------------- |
| problem_id      | string | Yes      | Unique problem identifier                |
| problem_name    | string | Yes      | Human-readable problem name              |
| package_type    | string | Yes      | Type of package (e.g., 'file')           |
| problem_package | file   | Yes      | Tarball (.tar.gz) of the problem package |
| project_type    | string | Yes      | Project type (e.g., 'database')          |

---

## Problem Package

```
db-optimization/
├── config.json                    # Problem configuration
├── README.md                      # Problem description
├── database/                      # Database container
│   ├── Dockerfile
│   ├── init-db.sql               # Database initialization
│   └── data/                     # Sample data
│       └── large_dataset.sql
└── submission/                    # Submission evaluation container
    ├── Dockerfile
    ├── entrypoint.sh
    └── hooks/
        ├── pre/
        │   └── 01_apply_migration.sh
        └── post/
            ├── 02_test_correctness.sh
            ├── 03_measure_latency.sh
            ├── 04_test_concurrency.sh
            └── 05_measure_storage.sh
```

---

## Package Configuration

**File:** `config.json`

```json
{
  "problem_id": "sql-optimization",
  "problem_name": "Database Query Optimization Challenge",
  "description": "Optimize slow SQL queries on a 1M+ row dataset using schema changes, indexes, and query rewriting",
  "project_type": "database",
  "version": "1.0.0",
  "time_limit": 1800,

  "containers": [
    {
      "container_id": "database",
      "name": "PostgreSQL Database Server",
      "accepts_submission": false,
      "dockerfile_path": "database/Dockerfile",
      "depends_on": [],
      "terminate_on_finish": []
    },
    {
      "container_id": "submission",
      "name": "Query Evaluation Container",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": [
        {
          "container_id": "database",
          "condition": "healthy",
          "timeout": 60,
          "retry": 10,
          "retry_interval": 3
        }
      ],
      "terminate_on_finish": ["database"]
    }
  ],

  "rubrics": [
    {
      "rubric_id": "correctness",
      "name": "Query Result Correctness",
      "type": "test_cases",
      "max_score": 50,
      "container": "submission"
    },
    {
      "rubric_id": "query_latency",
      "name": "Query Latency Performance",
      "type": "performance_benchmark",
      "max_score": 30,
      "container": "submission"
    },
    {
      "rubric_id": "concurrency",
      "name": "Concurrent Load Performance",
      "type": "performance_benchmark",
      "max_score": 10,
      "container": "submission"
    },
    {
      "rubric_id": "resource_efficiency",
      "name": "Storage Efficiency",
      "type": "resource_usage",
      "max_score": 10,
      "container": "submission"
    }
  ]
}
```

---

### Using cURL

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problem_id=sql-optimization" \
  -F "problem_name=Database Query Optimization Challenge" \
  -F "package_type=file" \
  -F "problem_package=@db-optimization.tar.gz" \
  -F "project_type=database"
```

### Using the Mock Script

```bash
./mock/zip-and-add-problem.sh ./mock/packages/db-optimization
```

---

### Success Response (200 OK)

```json
{
  "success": true,
  "message": "Problem sql-optimization registered successfully",
  "data": {
    "problem_id": "sql-optimization",
    "image_names": {
      "database": "judgehost-sql-optimization-database:latest",
      "submission": "judgehost-sql-optimization-submission:latest"
    },
    "registered_at": "2025-10-15T06:00:00.000Z"
  }
}
```

### Reference

- [POST /submissions & /results - Happy Path Example](POST_submissions_and_results_happy_path.md)
- [POST to DOMserver](../to-domserver/POST_TO_DOMSERVER.md)
