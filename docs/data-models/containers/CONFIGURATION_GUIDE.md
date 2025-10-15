# Container Configuration Guide

**Last Updated:** October 15, 2025

This document provides comprehensive guidance on configuring problem packages, including container-specific configurations, staging behavior, and resource limits.

---

## Container Execution Model

**CRITICAL CONCEPT: Containers created by judgehost do not execute their work autonomously.**

### How Containers Actually Work

1. **Container Creation**: Judgehost builds and creates containers with mounted resources
2. **Container Start**: Containers start (may run services, entrypoints, or idle)
3. **Command Execution**: Judgehost executes commands inside containers using `docker exec`
4. **Hook Orchestration**: Evaluation logic runs via hooks passed as commands from judgehost

**Containers are execution environments, not autonomous agents.** The judgehost orchestrator:

- Controls **when** hooks execute
- Determines **which** commands to run
- Manages **how** containers interact
- Coordinates **lifecycle** and dependencies

**Example Flow:**

```
┌─────────────────────────────────────────────────┐
│ Judgehost Orchestrator                          │
├─────────────────────────────────────────────────┤
│ 1. Build container images                       │
│ 2. Create containers with mounts                │
│ 3. Start containers (idle or service)           │
│ 4. Execute: docker exec <id> /hooks/pre/01.sh   │
│ 5. Execute: docker exec <id> /hooks/post/01.sh  │
│ 6. Collect results from /out                    │
│ 7. Stop and cleanup containers                  │
└─────────────────────────────────────────────────┘
```

**What this means for problem design:**

- Don't expect containers to "do work" on their own
- Design hooks that will be executed by judgehost
- Use Dockerfiles to set up the environment, not the evaluation logic
- The CMD/ENTRYPOINT should start services or idle, not run tests

---

## Table of Contents

1. [Problem-Level Configuration](#problem-level-configuration)
2. [Container-Level Configuration](#container-level-configuration)
3. [Stage Configuration](#stage-configuration)
4. [Resource Limits](#resource-limits)
5. [Network Configuration](#network-configuration)
6. [Container Dependencies](#container-dependencies)
7. [Health Checks](#health-checks)
8. [Complete Examples](#complete-examples)

---

## Problem-Level Configuration

The root `config.json` defines the overall problem structure and orchestration.

### Structure

```json
{
  "problem_id": "string",
  "name": "string",
  "description": "string",
  "project_type": "string",
  "difficulty": "string",
  "time_limit": 300,

  "containers": [
    {
      "container_id": "string",
      "name": "string",
      "accepts_submission": boolean,
      "dockerfile_path": "string",
      "depends_on": [],
      "terminate_on_finish": []
    }
  ],

  "rubrics": [
    {
      "rubric_id": "string",
      "name": "string",
      "type": "string",
      "max_score": number,
      "container": "string"
    }
  ]
}
```

### Fields

#### Required Fields

- **problem_id** (string): Unique identifier for the problem
- **name** (string): Display name
- **containers** (array): List of container configurations
- **rubrics** (array): List of rubric evaluations

#### Optional Fields

- **description** (string): Problem description
- **project_type** (string): Type of problem (algorithm, web-api, data-science, etc.)
- **difficulty** (string): easy, medium, hard
- **time_limit** (number): Global timeout in seconds (deprecated, use per-container limits)

### Container Definition

Each container in the `containers` array must specify:

```json
{
  "container_id": "submission",
  "name": "Submission Container",
  "accepts_submission": true,
  "dockerfile_path": "submission/Dockerfile",
  "depends_on": [],
  "terminate_on_finish": []
}
```

#### Fields

- **container_id** (required): Unique identifier within the problem
- **name** (optional): Display name for the container
- **accepts_submission** (required): Whether this container receives the submission code
- **dockerfile_path** (required): Relative path to Dockerfile from problem root
- **depends_on** (optional): Array of dependency configurations (see [Container Dependencies](#container-dependencies))
- **terminate_on_finish** (optional): Array of container IDs to terminate when this container completes

---

## Container-Level Configuration

Each container can have its own configuration file(s) for different stages.

### Configuration Files

```
container-name/
├── Dockerfile
├── stage1.config.json    # Build stage configuration
└── stage2.config.json    # Evaluation stage configuration
```

### Stage Configuration Fallback Behavior

**Important:** If a stage configuration file is not found, the system falls back to the previous stage:

1. **Stage 2 (Evaluation)**: If `stage2.config.json` is not found, uses `stage1.config.json`
2. **Stage 1 (Build)**: If `stage1.config.json` is not found, uses default values

**Default Values:**

```json
{
  "network": {
    "enabled": false,
    "internal_only": false,
    "allowed_containers": []
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  }
}
```

### Configuration Structure

```json
{
  "container_id": "string",
  "accepts_submission": boolean,
  "submission_mount": "/workspace",
  "network": {
    "enabled": boolean,
    "internal_only": boolean,
    "network_name": "string",
    "allowed_containers": []
  },
  "resource_limits": {
    "cpu": "string",
    "memory": "string",
    "timeout": number
  },
  "environment": {
    "KEY": "value"
  },
  "health_check": {
    "command": "string",
    "interval": number,
    "timeout": number,
    "retries": number,
    "start_period": number
  }
}
```

---

## Stage Configuration

Containers go through two stages during evaluation:

### Stage 1: Build

**Purpose:** Build the Docker image with dependencies installed

**Typical Configuration:**

- Network enabled (for package installation)
- Higher timeout (for downloads)
- Submission NOT mounted

**Example: `stage1.config.json`**

```json
{
  "container_id": "submission",
  "network": {
    "enabled": true,
    "mode": "bridge"
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 180
  }
}
```

### Stage 2: Evaluation

**Purpose:** Run the submission with evaluation constraints

**Typical Configuration:**

- Network disabled or internal-only
- Stricter resource limits
- Submission mounted (if accepts_submission: true)
- Health checks configured
- Environment variables set

**Example: `stage2.config.json`**

```json
{
  "container_id": "submission",
  "accepts_submission": true,
  "submission_mount": "/workspace",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database", "api-tester"]
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  },
  "environment": {
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://user:pass@database:5432/db",
    "PORT": "3000"
  },
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

### Fallback Logic

```
┌─────────────────────────────────────────┐
│ Stage 2 Evaluation                      │
├─────────────────────────────────────────┤
│ Try: stage2.config.json                 │
│   ↓ If not found                        │
│ Fallback: stage1.config.json            │
│   ↓ If not found                        │
│ Fallback: Default values                │
└─────────────────────────────────────────┘
```

**Why this matters:**

- Simple single-stage containers only need one config file
- Complex multi-stage containers can have different configs per stage
- Missing configs don't cause failures

---

## Resource Limits

**CRITICAL:** Resource limits must be set **per-container**, not at the problem level.

### ❌ Incorrect (Problem-Level Limits)

```json
{
  "problem_id": "my-problem",
  "containers": [...],
  "resource_limits": {
    "cpu": "2.0",
    "memory": "1G"
  }
}
```

### ✅ Correct (Container-Level Limits)

Resource limits are set in stage configuration files:

**submission/stage2.config.json:**

```json
{
  "container_id": "submission",
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  }
}
```

**database/stage2.config.json:**

```json
{
  "container_id": "database",
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 300
  }
}
```

### Resource Limit Fields

- **cpu** (string): CPU allocation (e.g., "1.0" = 1 core, "0.5" = half core)
- **memory** (string): Memory limit with unit (e.g., "512M", "1G", "2048M")
- **timeout** (number): Maximum execution time in seconds

### Multi-Container Resource Planning

When planning resource limits for multi-container problems:

```
Total Resources = Sum of all container limits

Example:
- database:   0.5 CPU, 256M RAM
- submission: 1.0 CPU, 512M RAM
- api-tester: 0.5 CPU, 256M RAM
───────────────────────────────────
Total:        2.0 CPU, 1024M RAM
```

**Recommendations:**

- Database containers: 0.5 CPU, 256-512M RAM
- Submission containers: 1.0 CPU, 512M-1G RAM
- Tester containers: 0.5-1.0 CPU, 256-512M RAM

---

## Network Configuration

Network configuration controls how containers communicate.

### Network Modes

#### 1. External Network (Internet Access)

**Use Case:** Stage 1 (Build) for downloading dependencies

```json
{
  "network": {
    "enabled": true,
    "mode": "bridge"
  }
}
```

#### 2. Network Disabled

**Use Case:** Isolated evaluation with no network

```json
{
  "network": {
    "enabled": false
  }
}
```

#### 3. Internal-Only Network

**Use Case:** Multi-container communication without internet access

```json
{
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database", "api-tester"]
  }
}
```

### Network Name Format

**CRITICAL:** Internal networks must use explicit naming with submission ID:

**Template:**

```
eval-network-{{submission_id}}
```

**Example:**

```
eval-network-sub_abc123xyz
```

**Why explicit naming?**

- Prevents network conflicts between concurrent evaluations
- Enables proper cleanup after evaluation
- Allows monitoring and debugging
- Enforces network isolation

### Allowed Containers

The `allowed_containers` field specifies which containers can communicate:

```json
{
  "container_id": "submission",
  "network": {
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database"]
  }
}
```

This creates the following network topology:

```
eval-network-sub_abc123xyz
├── database (hostname: database)
├── submission (hostname: submission)
│   └── Can connect to: database
└── api-tester (hostname: api-tester)
    └── Can connect to: submission
```

### Network Configuration Examples

#### Single Container (No Network)

```json
{
  "container_id": "submission",
  "network": {
    "enabled": false
  }
}
```

#### Multi-Container with Database

**database/stage2.config.json:**

```json
{
  "container_id": "database",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": []
  }
}
```

**submission/stage2.config.json:**

```json
{
  "container_id": "submission",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database"]
  }
}
```

---

## Container Dependencies

Dependencies control the order and conditions for container startup.

### Configuration Format

**In root config.json:**

```json
{
  "containers": [
    {
      "container_id": "database",
      "depends_on": []
    },
    {
      "container_id": "submission",
      "depends_on": [
        {
          "container_id": "database",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5,
          "retry_interval": 2
        }
      ]
    },
    {
      "container_id": "api-tester",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ],
      "terminate_on_finish": ["submission", "database"]
    }
  ]
}
```

### Dependency Fields

#### depends_on (array)

Each dependency object contains:

- **container_id** (required): ID of the container to wait for
- **condition** (required): Condition to satisfy before starting
- **timeout** (optional): Maximum wait time in seconds (default: 30)
- **retry** (optional): Number of retries for health checks (default: 5)
- **retry_interval** (optional): Seconds between retries (default: 2)

#### Dependency Conditions

| Condition   | Description            | When to Use                                |
| ----------- | ---------------------- | ------------------------------------------ |
| `started`   | Container has started  | Simple dependencies without health checks  |
| `healthy`   | Container is healthy   | Recommended for services (APIs, databases) |
| `completed` | Container has finished | Init containers that run once              |

### Termination Configuration

#### terminate_on_finish (array)

Specifies which containers to stop when this container completes:

```json
{
  "container_id": "api-tester",
  "terminate_on_finish": ["submission", "database"]
}
```

**Use Cases:**

- Tester finishes → terminate API and database
- Cleanup container finishes → terminate all service containers
- Monitor completes → terminate monitored services

### Dependency Examples

#### Database → API → Tester

```json
{
  "containers": [
    {
      "container_id": "database",
      "depends_on": []
    },
    {
      "container_id": "submission",
      "depends_on": [
        {
          "container_id": "database",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ]
    },
    {
      "container_id": "api-tester",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ],
      "terminate_on_finish": ["submission", "database"]
    }
  ]
}
```

**Execution Flow:**

```
Time  Database       Submission       API Tester
──────────────────────────────────────────────────
0s    START          -                -
3s    healthy ✓      START            -
8s    running        healthy ✓        START
12s   running        running          testing...
20s   running        running          done ✓
21s   STOP ✗         STOP ✗           collect results
```

---

## Health Checks

Health checks determine when a container is ready for dependent containers to start.

### Configuration

**In stage2.config.json:**

```json
{
  "container_id": "submission",
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

### Fields

- **command** (required): Shell command to check health (exit 0 = healthy)
- **interval** (optional): Seconds between checks (default: 5)
- **timeout** (optional): Max seconds for command to complete (default: 3)
- **retries** (optional): Consecutive failures before unhealthy (default: 3)
- **start_period** (optional): Grace period before checks start (default: 10)

### Health Check Examples

#### HTTP API

```json
{
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

#### Database (PostgreSQL)

```json
{
  "health_check": {
    "command": "pg_isready -U postgres",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

#### Database (MySQL)

```json
{
  "health_check": {
    "command": "mysqladmin ping -h localhost",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

#### Redis

```json
{
  "health_check": {
    "command": "redis-cli ping",
    "interval": 5,
    "timeout": 3,
    "retries": 3,
    "start_period": 5
  }
}
```

#### File Existence

```json
{
  "health_check": {
    "command": "test -f /tmp/ready",
    "interval": 2,
    "timeout": 1,
    "retries": 10,
    "start_period": 5
  }
}
```

---

## Complete Examples

### Example 1: Simple Algorithm Problem

**Structure:**

```
two-sum/
├── config.json
└── submission/
    ├── Dockerfile
    ├── stage1.config.json
    ├── stage2.config.json
    └── hooks/
```

**config.json:**

```json
{
  "problem_id": "two-sum",
  "name": "Two Sum",
  "description": "Find two numbers that add up to target",
  "project_type": "algorithm",
  "difficulty": "easy",

  "containers": [
    {
      "container_id": "submission",
      "name": "Submission Container",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": []
    }
  ],

  "rubrics": [
    {
      "rubric_id": "test_cases",
      "name": "Test Cases",
      "type": "test_cases",
      "max_score": 80,
      "container": "submission"
    },
    {
      "rubric_id": "code_quality",
      "name": "Code Quality",
      "type": "code_quality",
      "max_score": 20,
      "container": "submission"
    }
  ]
}
```

**submission/stage1.config.json:**

```json
{
  "container_id": "submission",
  "network": {
    "enabled": true,
    "mode": "bridge"
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 180
  }
}
```

**submission/stage2.config.json:**

```json
{
  "container_id": "submission",
  "accepts_submission": true,
  "submission_mount": "/workspace",
  "network": {
    "enabled": false
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 60
  }
}
```

### Example 2: Multi-Container REST API Problem

**Structure:**

```
rest-api-users/
├── config.json
├── database/
│   ├── Dockerfile
│   ├── stage1.config.json
│   └── stage2.config.json
├── submission/
│   ├── Dockerfile
│   ├── stage1.config.json
│   └── stage2.config.json
└── api-tester/
    ├── Dockerfile
    ├── stage1.config.json
    └── stage2.config.json
```

**config.json:**

```json
{
  "problem_id": "rest-api-users",
  "name": "REST API - User Management",
  "description": "Build a REST API with database integration",
  "project_type": "web-api",
  "difficulty": "medium",

  "containers": [
    {
      "container_id": "database",
      "name": "PostgreSQL Database",
      "accepts_submission": false,
      "dockerfile_path": "database/Dockerfile",
      "depends_on": []
    },
    {
      "container_id": "submission",
      "name": "Submission API",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": [
        {
          "container_id": "database",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5,
          "retry_interval": 2
        }
      ]
    },
    {
      "container_id": "api-tester",
      "name": "API Test Runner",
      "accepts_submission": false,
      "dockerfile_path": "api-tester/Dockerfile",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5,
          "retry_interval": 2
        }
      ],
      "terminate_on_finish": ["submission", "database"]
    }
  ],

  "rubrics": [
    {
      "rubric_id": "api_endpoints",
      "name": "API Endpoints",
      "type": "api_endpoints",
      "max_score": 60,
      "container": "api-tester"
    },
    {
      "rubric_id": "code_quality",
      "name": "Code Quality",
      "type": "code_quality",
      "max_score": 20,
      "container": "submission"
    },
    {
      "rubric_id": "security",
      "name": "Security",
      "type": "security_scan",
      "max_score": 20,
      "container": "submission"
    }
  ]
}
```

**database/stage1.config.json:**

```json
{
  "container_id": "database",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": []
  },
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 300
  }
}
```

**database/stage2.config.json:**

```json
{
  "container_id": "database",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": []
  },
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 300
  },
  "environment": {
    "POSTGRES_USER": "testuser",
    "POSTGRES_PASSWORD": "testpass",
    "POSTGRES_DB": "usersdb"
  },
  "health_check": {
    "command": "pg_isready -U testuser",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

**submission/stage1.config.json:**

```json
{
  "container_id": "submission",
  "network": {
    "enabled": true,
    "mode": "bridge"
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 180
  }
}
```

**submission/stage2.config.json:**

```json
{
  "container_id": "submission",
  "accepts_submission": true,
  "submission_mount": "/workspace",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["database"]
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  },
  "environment": {
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://testuser:testpass@database:5432/usersdb",
    "PORT": "3000"
  },
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 5,
    "start_period": 10
  }
}
```

**api-tester/stage1.config.json:**

```json
{
  "container_id": "api-tester",
  "network": {
    "enabled": true,
    "mode": "bridge"
  },
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 180
  }
}
```

**api-tester/stage2.config.json:**

```json
{
  "container_id": "api-tester",
  "network": {
    "enabled": false,
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}",
    "allowed_containers": ["submission"]
  },
  "resource_limits": {
    "cpu": "0.5",
    "memory": "256M",
    "timeout": 300
  },
  "environment": {
    "API_BASE_URL": "http://submission:3000",
    "TEST_TIMEOUT": "5000"
  }
}
```

---

## Migration Guide

If you have existing problem packages using the old format, here's how to migrate:

### Issue 1: Problem-Level Resource Limits

**Old (Incorrect):**

```json
{
  "problem_id": "my-problem",
  "resource_limits": {
    "cpu": "2.0",
    "memory": "1G"
  }
}
```

**New (Correct):**

Remove from problem config, add to each container's stage configs.

### Issue 2: Dependencies Field Name

**Old:**

```json
{
  "container_id": "submission",
  "dependencies": [...]
}
```

**New:**

```json
{
  "container_id": "submission",
  "depends_on": [...]
}
```

### Issue 3: Terminates Field Name

**Old:**

```json
{
  "container_id": "tester",
  "terminates": ["submission"]
}
```

**New:**

```json
{
  "container_id": "tester",
  "terminate_on_finish": ["submission"]
}
```

### Issue 4: Implicit Network Names

**Old:**

```json
{
  "network": {
    "internal_only": true
  }
}
```

**New:**

```json
{
  "network": {
    "internal_only": true,
    "network_name": "eval-network-{{submission_id}}"
  }
}
```

---

## Best Practices

### 1. Resource Limits

- ✅ Set per-container in stage configs
- ✅ Plan total resources = sum of all containers
- ✅ Database: 0.5 CPU, 256-512M
- ✅ Submission: 1.0 CPU, 512M-1G
- ✅ Tester: 0.5-1.0 CPU, 256-512M

### 2. Network Configuration

- ✅ Use explicit network names with {{submission_id}}
- ✅ Enable network only in stage1 for dependency installation
- ✅ Use internal-only in stage2 for container communication
- ✅ Specify allowed_containers explicitly

### 3. Stage Configuration

- ✅ Always provide stage1.config.json (build stage)
- ✅ Always provide stage2.config.json (evaluation stage)
- ✅ Use stage1 for dependency installation with network
- ✅ Use stage2 for evaluation with restrictions

### 4. Dependencies

- ✅ Use depends_on (not dependencies)
- ✅ Use terminate_on_finish (not terminates)
- ✅ Always use "healthy" condition for services
- ✅ Configure appropriate timeouts and retries

### 5. Health Checks

- ✅ Define health checks for all service containers
- ✅ Use appropriate commands (curl for APIs, pg_isready for PostgreSQL)
- ✅ Set reasonable start_period for slow-starting services
- ✅ Configure retries to handle startup delays

---

## Troubleshooting

### Container Won't Start

Check:

- Resource limits are set in stage configs
- Network configuration is correct
- Dependencies are satisfied
- Health checks are passing

### Network Communication Fails

Check:

- network_name includes {{submission_id}}
- allowed_containers includes target container
- Both containers on same network
- Container hostnames match container_ids

### Health Check Fails

Check:

- Command is correct for the service
- start_period is long enough for startup
- retries are sufficient
- timeout is reasonable

### Dependency Timeout

Check:

- Dependent container has health_check configured
- timeout in depends_on is sufficient
- retry count is appropriate
- Health check command is working

---

## Related Documentation

- [Problem Resources and Container Mounting](./resources.md)
- [POST /api/problems](../../problems/POST_problems.md)
- [Rubric Mapping](../rubrics/mapping.md)
- [Problem Package Structure](../samples/problem_package_name.md)

---

**Last Updated:** October 14, 2025
