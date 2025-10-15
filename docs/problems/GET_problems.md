# GET /problems

Lists all registered problems or retrieves details of a specific problem.

**Related Documentation**:

- [`POST_problems.md`](POST_problems.md) - Register new problems
- [`../data-models/samples/problem_package_name.md`](../data-models/samples/problem_package_name.md) - Problem package structure

---

## GET /problems

Lists all registered problems.

### Request

**Endpoint:** `GET /problems`

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "problems": [
      {
        "problem_id": "rest-api-users",
        "problem_name": "REST API - User Management",
        "project_type": "web_api",
        "version": "1.0.0",
        "description": "Build a RESTful API with user authentication",
        "rubrics": [
          {
            "rubric_id": "api_correctness",
            "rubric_name": "API Correctness",
            "rubric_type": "api_endpoints",
            "max_score": 40,
            "weight": 1.0
          },
          {
            "rubric_id": "security",
            "rubric_name": "Security",
            "rubric_type": "security_scan",
            "max_score": 20,
            "weight": 1.0
          }
        ],
        "registered_at": "2025-10-13T10:30:45.123Z"
      }
    ],
    "total": 1
  }
}
```

---

## GET /problems/:problem_id

Get detailed information about a specific problem.

### Request

**Endpoint:** `GET /problems/:problem_id`

### URL Parameters

| Parameter    | Type   | Description                  |
| ------------ | ------ | ---------------------------- |
| `problem_id` | string | Unique identifier of problem |

### Response

#### Success Response (200 OK)

```json
{
  "success": true,
  "data": {
    "problem_id": "rest-api-users",
    "problem_name": "REST API - User Management",
    "project_type": "web_api",
    "version": "1.0.0",
    "description": "Build a RESTful API with user authentication",
    "containers": [
      {
        "container_id": "submission",
        "container_name": "Submission Container",
        "accepts_submission": true,
        "dockerfile_path": "submission/Dockerfile",
        "resource_limits": {
          "memory": "512m",
          "cpus": 1.0,
          "timeout": 300
        }
      },
      {
        "container_id": "api-tester",
        "container_name": "API Test Runner",
        "accepts_submission": false,
        "dockerfile_path": "api-tester/Dockerfile",
        "resource_limits": {
          "memory": "256m",
          "cpus": 0.5,
          "timeout": 300
        },
        "depends_on": [
          {
            "container_id": "submission",
            "condition": "healthy"
          }
        ]
      }
    ],
    "rubrics": [
      {
        "rubric_id": "api_correctness",
        "rubric_name": "API Correctness",
        "rubric_type": "api_endpoints",
        "max_score": 40,
        "weight": 1.0,
        "container": "api_tester"
      },
      {
        "rubric_id": "security",
        "rubric_name": "Security",
        "rubric_type": "security_scan",
        "max_score": 20,
        "weight": 1.0,
        "container": "submission"
      },
      {
        "rubric_id": "code_quality",
        "rubric_name": "Code Quality",
        "rubric_type": "code_quality",
        "max_score": 20,
        "weight": 0.5,
        "container": "submission"
      }
    ],
    "hooks_config": {
      "periodic_interval_seconds": 10,
      "hook_timeout_seconds": 30,
      "use_default_monitor": true
    },
    "resource_limits": {
      "memory_mb": 1024,
      "cpu_cores": 2.0,
      "disk_mb": 2048,
      "network_enabled": true,
      "timeout_seconds": 300
    },
    "registered_at": "2025-10-13T10:30:45.123Z",
    "image_name": "problem-rest-api-users:latest"
  }
}
```

#### Error Response (404 Not Found)

```json
{
  "success": false,
  "error": "problem_not_found",
  "message": "Problem rest-api-users not found"
}
```

---

## Notes

1. **Container-Specific Rubrics**: The `container` field indicates which container is responsible for evaluating each rubric. See [`../data-models/rubrics/mapping.md`](../data-models/rubrics/mapping.md) for more details.
2. **Resource Limits**: Total resource limits are the sum of all container limits
3. **Image Names**: Follow the pattern `problem-{problem_id}:latest`
