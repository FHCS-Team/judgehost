# Project Types Specification

This document defines the supported project types in the judgehost system and their specific characteristics.

---

## Overview

Project types define the category and evaluation approach for problems. Each project type has specific requirements, evaluation patterns, and resource configurations that guide how submissions are evaluated.

---

## Supported Project Types

### 1. `algorithm`

**Description**: Traditional algorithmic problems with input/output testing.

**Characteristics**:

- Single-file or multi-file code submissions
- Input/output based evaluation
- Performance testing (time/space complexity)
- Test case validation

**Typical Use Cases**:

- Competitive programming problems
- Data structure implementations
- Algorithm optimization challenges

**Default Configuration**:

```json
{
  "project_type": "algorithm",
  "resource_limits": {
    "memory_mb": 256,
    "cpu_cores": 1.0,
    "disk_mb": 512,
    "network_enabled": false,
    "timeout_seconds": 10
  }
}
```

**Common Rubric Types**: `test_cases`, `performance_benchmark`, `code_complexity`

---

### 2. `web_api`

**Description**: REST API, GraphQL API, or microservice implementations.

**Characteristics**:

- HTTP endpoint testing
- Request/response validation
- Authentication/authorization testing
- API contract compliance
- Performance benchmarking

**Typical Use Cases**:

- REST API implementations
- GraphQL servers
- Microservice endpoints
- WebSocket servers

**Default Configuration**:

```json
{
  "project_type": "web_api",
  "resource_limits": {
    "memory_mb": 1024,
    "cpu_cores": 2.0,
    "disk_mb": 2048,
    "network_enabled": true,
    "timeout_seconds": 300
  },
  "execution_config": {
    "ports": [3000, 8080]
  }
}
```

**Common Rubric Types**: `api_endpoints`, `security_scan`, `performance_benchmark`, `contract_validation`

---

### 3. `full_stack_web`

**Description**: Complete web applications with frontend and backend components.

**Characteristics**:

- Multi-service architecture (frontend + backend + database)
- UI functionality testing
- End-to-end testing
- Database integration validation
- Browser automation testing

**Typical Use Cases**:

- Single-page applications (SPA)
- Server-rendered web apps
- Full-stack projects with database
- Progressive web apps (PWA)

**Default Configuration**:

```json
{
  "project_type": "full_stack_web",
  "resource_limits": {
    "memory_mb": 2048,
    "cpu_cores": 3.0,
    "disk_mb": 4096,
    "network_enabled": true,
    "timeout_seconds": 600
  },
  "execution_config": {
    "ports": [3000, 5000, 5432, 27017]
  }
}
```

**Common Rubric Types**: `ui_tests`, `api_endpoints`, `database_integration`, `e2e_tests`

**Multi-Container**: Usually requires multiple services (frontend, backend, database)

---

### 4. `database_design`

**Description**: Database schema design, query optimization, and data modeling.

**Characteristics**:

- Schema validation
- Query performance testing
- Data integrity checks
- Normalization verification
- Index optimization

**Typical Use Cases**:

- Database schema design
- SQL query optimization
- Data migration scripts
- NoSQL data modeling

**Default Configuration**:

```json
{
  "project_type": "database_design",
  "resource_limits": {
    "memory_mb": 512,
    "cpu_cores": 1.0,
    "disk_mb": 2048,
    "network_enabled": false,
    "timeout_seconds": 180
  }
}
```

**Common Rubric Types**: `schema_validation`, `query_performance`, `data_integrity`, `normalization_check`

---

### 5. `cli_tool`

**Description**: Command-line applications and tools.

**Characteristics**:

- Command execution testing
- Argument parsing validation
- Output format verification
- Exit code validation
- Interactive mode testing

**Typical Use Cases**:

- CLI utilities
- Build tools
- Data processing scripts
- System administration tools

**Default Configuration**:

```json
{
  "project_type": "cli_tool",
  "resource_limits": {
    "memory_mb": 512,
    "cpu_cores": 1.0,
    "disk_mb": 1024,
    "network_enabled": false,
    "timeout_seconds": 60
  }
}
```

**Common Rubric Types**: `command_tests`, `output_validation`, `exit_codes`

---

### 6. `data_processing`

**Description**: ETL pipelines, data analysis, and machine learning applications.

**Characteristics**:

- Data transformation validation
- Output accuracy testing
- Performance on large datasets
- Memory efficiency
- Model accuracy (for ML)

**Typical Use Cases**:

- ETL pipelines
- Data analysis scripts
- Machine learning models
- Data visualization tools
- Batch processing systems

**Default Configuration**:

```json
{
  "project_type": "data_processing",
  "resource_limits": {
    "memory_mb": 4096,
    "cpu_cores": 4.0,
    "disk_mb": 8192,
    "network_enabled": false,
    "timeout_seconds": 900
  }
}
```

**Common Rubric Types**: `data_accuracy`, `performance_benchmark`, `output_validation`, `model_metrics`

---

## Project Type Selection Guide

### Decision Tree

```
Is it a web application?
├─ Yes → Does it have a UI?
│  ├─ Yes → full_stack_web
│  └─ No → web_api
└─ No → Does it process data?
   ├─ Yes → Does it use a database?
   │  ├─ Yes (as main focus) → database_design
   │  └─ No → data_processing
   └─ No → Is it command-line based?
      ├─ Yes → cli_tool
      └─ No → algorithm
```

---

## Multi-Container Requirements

### Project Types That May Require Multiple Containers

1. **`full_stack_web`** - Frontend, backend, database, cache
2. **`web_api`** - API server, database, message queue
3. **`database_design`** - Database server, test runner
4. **`data_processing`** - Processing worker, data source, result store

### Single-Container Project Types

1. **`algorithm`** - Single evaluation container
2. **`cli_tool`** - Single execution container

---

## Custom Project Types

For specialized use cases not covered by the standard types, you can define custom project types:

```json
{
  "project_type": "custom:game_server",
  "description": "Real-time multiplayer game server",
  "resource_limits": {
    "memory_mb": 2048,
    "cpu_cores": 2.0,
    "disk_mb": 2048,
    "network_enabled": true,
    "timeout_seconds": 600
  }
}
```

**Custom Project Type Naming Convention**: `custom:<type_name>`

---

## Resource Limit Guidelines

### By Project Complexity

| Complexity | Memory (MB) | CPU Cores | Disk (MB) | Timeout (s) |
| ---------- | ----------- | --------- | --------- | ----------- |
| Simple     | 256-512     | 0.5-1.0   | 512-1024  | 10-60       |
| Medium     | 512-1024    | 1.0-2.0   | 1024-2048 | 60-300      |
| Complex    | 1024-4096   | 2.0-4.0   | 2048-8192 | 300-900     |
| Enterprise | 4096+       | 4.0+      | 8192+     | 900+        |

### By Project Type Default Complexity

| Project Type      | Default Complexity |
| ----------------- | ------------------ |
| `algorithm`       | Simple             |
| `cli_tool`        | Simple             |
| `database_design` | Medium             |
| `web_api`         | Medium             |
| `data_processing` | Complex            |
| `full_stack_web`  | Complex            |

**Note**: These are defaults. Actual limits should be adjusted based on specific problem requirements and judgehost hardware capabilities (configured via environment variables).

---

## Project Type Validation

When registering a problem, the judgehost validates:

1. **Project type exists** - Standard or custom type
2. **Resource limits** - Within judgehost hardware limits
3. **Required files** - Dockerfile(s), config.json, compose.yml (if multi-container)
4. **Rubric compatibility** - Rubric types appropriate for project type
5. **Network requirements** - Network-enabled project types must have network capability

---

## Examples

### Example 1: Algorithm Problem

```json
{
  "problem_id": "two-sum",
  "problem_name": "Two Sum",
  "project_type": "algorithm",
  "resource_limits": {
    "memory_mb": 256,
    "cpu_cores": 1.0,
    "disk_mb": 512,
    "network_enabled": false,
    "timeout_seconds": 10
  }
}
```

### Example 2: Web API Problem

```json
{
  "problem_id": "rest-api-users",
  "problem_name": "User Management API",
  "project_type": "web_api",
  "resource_limits": {
    "memory_mb": 1024,
    "cpu_cores": 2.0,
    "disk_mb": 2048,
    "network_enabled": true,
    "timeout_seconds": 300
  },
  "execution_config": {
    "ports": [3000],
    "environment": {
      "PORT": "3000",
      "NODE_ENV": "test"
    }
  }
}
```

### Example 3: Full-Stack Web (Multi-Container)

```json
{
  "problem_id": "todo-app",
  "problem_name": "Full-Stack Todo Application",
  "project_type": "full_stack_web",
  "multi_container": true,
  "services": [
    {
      "name": "frontend",
      "resource_limits": {
        "memory_mb": 512,
        "cpu_cores": 1.0
      }
    },
    {
      "name": "backend",
      "resource_limits": {
        "memory_mb": 1024,
        "cpu_cores": 1.5
      }
    },
    {
      "name": "database",
      "resource_limits": {
        "memory_mb": 512,
        "cpu_cores": 0.5
      }
    }
  ]
}
```

---

## See Also

- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Rubric type definitions
- [`[API] ADD_PROBLEM.md`](%5BAPI%5D%20ADD_PROBLEM.md) - Problem registration API
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container configuration details
