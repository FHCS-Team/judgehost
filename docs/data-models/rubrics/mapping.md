# Rubric-to-Container Mapping

This document explains how rubrics are mapped to specific containers in multi-container problem setups.

**Related Documentation**:

- [`../../problems/POST_problems.md`](../../problems/POST_problems.md) - Problem configuration
- [`../containers/resources.md`](../containers/resources.md) - Container resources
- [`../samples/problem_package_name.md`](../samples/problem_package_name.md) - Problem package structure

---

## Overview

In multi-container problems, different containers evaluate different rubrics:

- **Submission container** (`accepts_submission: true`): Evaluates rubrics related to the submission's own code and behavior
- **Tester/Sidecar containers** (`accepts_submission: false`): Evaluate external behavior and integration tests
- **Service containers** (`accepts_submission: false`): Typically don't evaluate rubrics, but support the evaluation

This separation allows for:

- **Isolation**: Test code doesn't interfere with submission code
- **Security**: Untrusted submission code doesn't access test suites
- **Specialization**: Different containers can use different tools and environments
- **Parallel evaluation**: Multiple rubrics can be evaluated simultaneously

---

## Configuration

### Specifying Container Mapping

In the global `config.json`, use the `container` field to specify which container evaluates each rubric:

```json
{
  "problem_id": "rest-api-users",
  "containers": [
    {
      "container_id": "submission",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile"
    },
    {
      "container_id": "api-tester",
      "accepts_submission": false,
      "dockerfile_path": "api-tester/Dockerfile"
    }
  ],
  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "rubric_name": "API Correctness",
      "rubric_type": "api_endpoints",
      "max_score": 40,
      "container": "api-tester"
    },
    {
      "rubric_id": "security",
      "rubric_name": "Security",
      "rubric_type": "security_scan",
      "max_score": 20,
      "container": "submission"
    },
    {
      "rubric_id": "code_quality",
      "rubric_name": "Code Quality",
      "rubric_type": "code_quality",
      "max_score": 20,
      "container": "submission"
    }
  ]
}
```

### Default Behavior

If `container` is not specified:

- Rubrics default to the **first container with `accepts_submission: true`**
- This is typically the submission container

---

## Common Mapping Patterns

### Pattern 1: API Problem (Submission + Tester)

```
┌─────────────────────┐         ┌─────────────────────┐
│ Submission Container│◄────────┤   API Tester        │
│                     │ HTTP    │                     │
│ - Run submission API│         │ - Tests endpoints   │
│                     │         │ - Measures perf     │
│ Evaluates:          │         │                     │
│ • Security scan     │         │ Evaluates:          │
│ • Code quality      │         │ • API correctness   │
│ • Resource usage    │         │ • Performance       │
└─────────────────────┘         └─────────────────────┘
```

**Rationale**:

- **Submission container** evaluates its own code (security, quality, resource usage)
- **API tester** evaluates external API behavior without accessing submission internals

**Example rubrics**:

| Rubric            | Container    | Reason                                    |
| ----------------- | ------------ | ----------------------------------------- |
| `api_correctness` | `api_tester` | Tests endpoints from external client      |
| `performance`     | `api_tester` | Measures response times from client       |
| `security`        | `submission` | Scans submission code for vulnerabilities |
| `code_quality`    | `submission` | Analyzes submission code                  |
| `resource_usage`  | `submission` | Monitors submission container's resources |

---

### Pattern 2: Full-Stack Problem (Frontend + Backend + Database + Tester)

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   Frontend   │────►│   Backend    │────►│  Database    │
│  Container   │HTTP │  Container   │SQL  │  Container   │
│              │     │              │     │              │
│ Evaluates:   │     │ Evaluates:   │     │ (No rubrics) │
│ • UI quality │     │ • API tests  │     │              │
└──────────────┘     │ • DB schema  │     └──────────────┘
      ▲              └──────────────┘
      │                     ▲
      │                     │
      │              ┌──────────────┐
      └──────────────┤   UI Tester  │
           Selenium  │  Container   │
                     │              │
                     │ Evaluates:   │
                     │ • UI tests   │
                     │ • E2E tests  │
                     └──────────────┘
```

**Example rubrics**:

| Rubric             | Container   | Reason                                 |
| ------------------ | ----------- | -------------------------------------- |
| `ui_functionality` | `ui_tester` | Selenium tests from external browser   |
| `ui_styling`       | `ui_tester` | Visual regression testing              |
| `api_correctness`  | `backend`   | Backend validates its own API behavior |
| `database_design`  | `backend`   | Backend checks database schema         |
| `integration`      | `ui_tester` | E2E tests through full stack           |

---

### Pattern 3: Database Problem (Submission + Validator)

```
┌─────────────────────┐         ┌─────────────────────┐
│ Submission Container│         │  Validator          │
│                     │         │                     │
│ - Postgres/MySQL    │         │ - Runs SQL queries  │
│ - submission schema │         │ - Checks results    │
│                     │         │                     │
│ Evaluates:          │         │ Evaluates:          │
│ • Schema design     │         │ • Query correctness │
│ • Constraints       │         │ • Performance       │
└─────────────────────┘         └─────────────────────┘
       ▲                                 │
       └─────────────────────────────────┘
                   SQL queries
```

**Example rubrics**:

| Rubric              | Container    | Reason                               |
| ------------------- | ------------ | ------------------------------------ |
| `schema_design`     | `submission` | Validates schema structure           |
| `query_correctness` | `validator`  | Tests queries against submission DB  |
| `query_performance` | `validator`  | Measures query execution times       |
| `data_integrity`    | `submission` | Checks constraints and relationships |

---

## Hook Execution and Output

### Where Hooks Run

Hooks are executed in the container specified by `container`:

```
Container: submission
├── hooks/
│   ├── pre/
│   │   └── 01_install_deps.sh          # Runs in submission container
│   └── post/
│       └── 01_security_scan.sh         # Runs in submission container
│       └── 02_code_quality.sh          # Runs in submission container
└── out/
    ├── rubric_security.json            # Written by submission container
    └── rubric_code_quality.json        # Written by submission container

Container: api_tester
├── hooks/
│   └── post/
│       └── 01_test_endpoints.sh        # Runs in api_tester container
│       └── 02_performance_test.sh      # Runs in api_tester container
└── out/
    ├── rubric_api_correctness.json     # Written by api_tester container
    └── rubric_performance.json         # Written by api_tester container
```

### Output Collection

The judgehost collects rubric outputs from all containers:

1. Each container writes rubric results to `/out/rubric_<rubric_id>.json`
2. After evaluation completes, the judgehost collects outputs from all containers
3. Results are merged and returned in the final result JSON

---

## Access to Submission Code

### Submission Container

- **Has full access** to submission code at `/workspace/`
- Can analyze, scan, and modify submission files
- Evaluates rubrics related to code structure and quality

### Tester Containers

- **No direct access** to submission code (for security)
- Interacts with submission through network (HTTP, etc.) or shared volumes
- Evaluates external behavior only

### Shared Data Access

Both containers can access:

- Problem data at `/problem/data/` (read-only)
- Problem resources at `/problem/resources/` (read-only)

---

## Resource Reporting

### Metrics by Container

Each container reports its own resource usage:

```json
{
  "containers_summary": [
    {
      "container_id": "submission",
      "container_name": "Submission Container",
      "resource_usage": {
        "memory_peak_mb": 198.3,
        "memory_avg_mb": 145.6,
        "cpu_avg_percent": 12.5
      },
      "rubrics_evaluated": ["security", "code_quality", "resource_usage"]
    },
    {
      "container_id": "api_tester",
      "container_name": "API Test Runner",
      "resource_usage": {
        "memory_peak_mb": 112.8,
        "memory_avg_mb": 98.4,
        "cpu_avg_percent": 25.3
      },
      "rubrics_evaluated": ["api_correctness", "performance"]
    }
  ]
}
```

### Logs by Container

Logs from all containers are collected and tagged:

```
[2025-10-13T10:35:08.456Z] [INFO] [stdout:submission] npm install
[2025-10-13T10:35:25.901Z] [INFO] [stdout:api_tester] Running 25 API tests...
```

See [`../outputs/logs.md`](../outputs/logs.md) for log format details.

---

## Best Practices

### Security

1. **Never give tester containers direct file access to submission code**

   - Prevents cheating and information leakage
   - Use network communication instead

2. **Run untrusted submission code in isolated containers**
   - Apply strict resource limits
   - Use security profiles (AppArmor, seccomp)

### Performance

1. **Assign resource-intensive rubrics to dedicated containers**

   - Performance tests in separate container
   - Parallel execution when possible

2. **Use lightweight tester containers**
   - Minimize overhead
   - Faster startup times

### Organization

1. **Group related rubrics by container**

   - Code analysis rubrics → submission container
   - Behavioral tests → tester container

2. **Use clear naming conventions**
   - Container IDs: `submission`, `api_tester`, `ui_tester`
   - Rubric IDs include context: `api_correctness`, `api_performance`

---

## Example: Complete API Problem Configuration

```json
{
  "problem_id": "rest-api-users",
  "problem_name": "REST API - User Management",
  "project_type": "web_api",
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
      },
      "ports": ["3000"],
      "health_check": {
        "command": "curl -f http://localhost:3000/health || exit 1",
        "interval": 5,
        "timeout": 3,
        "retries": 3
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
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ],
      "terminates": ["submission"]
    }
  ],
  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "rubric_name": "API Correctness",
      "rubric_type": "api_endpoints",
      "max_score": 40,
      "weight": 1.0,
      "container": "api-tester",
      "description": "Tests all API endpoints for correct behavior"
    },
    {
      "rubric_id": "performance",
      "rubric_name": "API Performance",
      "rubric_type": "performance_benchmark",
      "max_score": 20,
      "weight": 0.8,
      "container": "api_tester",
      "description": "Measures API response times and throughput"
    },
    {
      "rubric_id": "security",
      "rubric_name": "Security",
      "rubric_type": "security_scan",
      "max_score": 20,
      "weight": 1.0,
      "container": "submission",
      "description": "Scans for security vulnerabilities"
    },
    {
      "rubric_id": "code_quality",
      "rubric_name": "Code Quality",
      "rubric_type": "code_quality",
      "max_score": 20,
      "weight": 0.5,
      "container": "submission",
      "description": "Analyzes code style and complexity"
    }
  ]
}
```

**Evaluation flow**:

1. **Submission container starts**

   - Pre-hook: Install dependencies
   - Start: Run `npm start` (API server)
   - Post-hook: Run security scan → writes `/out/rubric_security.json`
   - Post-hook: Run code quality analysis → writes `/out/rubric_code_quality.json`

2. **API tester container starts** (after submission container is ready)

   - Post-hook: Run API tests → writes `/out/rubric_api_correctness.json`
   - Post-hook: Run performance tests → writes `/out/rubric_performance.json`

3. **Judgehost collects results**
   - Merges rubric outputs from both containers
   - Aggregates logs and metrics
   - Returns final result

---

## See Also

- [Problem Registration API](../../problems/POST_problems.md)
- [Container Resources and Mounting](../containers/resources.md)
- [Problem Package Structure](../samples/problem_package_name.md)
- [Log Format](../outputs/logs.md)
- [Metrics Format](../outputs/metrics.md)
