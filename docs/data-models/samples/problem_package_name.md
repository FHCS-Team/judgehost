# Problem Package Structure

This document provides a visual overview of the problem package file structure.

**Related Documentation**:

- [`../../problems/POST_problems.md`](../../problems/POST_problems.md) - Problem registration API
- [`../containers/resources.md`](../containers/resources.md) - Resource mounting details
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Rubric-to-container mapping

---

## Overview

A problem package is a `.tar.gz` or `.zip` archive containing:

- **Global configuration** - Problem metadata and container setup
- **Container definitions** - Per-container Dockerfiles, stage configs, hooks, and data
- **Shared data** - Data available to all containers

---

## File Structure

```
problem-package.tar.gz
└── problem-id/
    ├── config.json                 # Global configuration with container dependencies
    │
    ├── container-1/                # First container (e.g., submission)
    │   ├── Dockerfile              # Container image definition
    │   ├── stage1.config.json      # Stage 1 configuration (problem build)
    │   ├── stage2.config.json      # Stage 2 configuration (submission evaluation)
    │   ├── hooks/                  # Container-specific hooks
    │   │   ├── pre/
    │   │   │   └── 01_setup.sh
    │   │   └── post/
    │   │       ├── 01_security_scan.sh
    │   │       └── 02_code_quality.sh
    │   └── data/                   # Container-specific data
    │       └── security_rules.yaml
    │
    ├── container-2/                # Second container (e.g., api-tester)
    │   ├── Dockerfile
    │   ├── stage1.config.json
    │   ├── stage2.config.json
    │   ├── hooks/
    │   │   └── post/
    │   │       ├── 01_test_endpoints.sh
    │   │       └── 02_load_test.sh
    │   └── data/
    │       └── api_test_cases.json
    │
    ├── container-3/                # Third container (e.g., database)
    │   ├── Dockerfile
    │   ├── stage1.config.json
    │   └── data/
    │       └── init.sql
    │
    ├── data/                       # Shared data (optional)
    │   ├── common_fixtures/
    │   │   └── users.json
    │   └── schemas/
    │       └── api_schema.json
    │
    └── README.md                   # Problem description (optional)
```

---

## Complete Example: REST API Problem

```
rest-api-users.tar.gz
└── rest-api-users/
    ├── config.json                 # Defines 3 containers with dependencies
    │
    ├── submission/                 # Container that accepts submission
    │   ├── Dockerfile              # FROM node:18-alpine
    │   ├── stage1.config.json      # Network enabled, install dependencies
    │   ├── stage2.config.json      # Network disabled (internal only), accepts_submission: true
    │   ├── hooks/
    │   │   └── post/
    │   │       ├── 01_security_scan.sh      # Evaluates security rubric
    │   │       └── 02_code_quality.sh       # Evaluates code_quality rubric
    │   └── data/
    │       └── linting_rules.yaml
    │
    ├── api-tester/                 # Container that tests the API
    │   ├── Dockerfile              # FROM node:18-alpine with testing tools
    │   ├── stage1.config.json      # Network enabled
    │   ├── stage2.config.json      # Network internal only, accepts_submission: false
    │   ├── hooks/
    │   │   └── post/
    │   │       ├── 01_test_endpoints.sh     # Evaluates api_correctness rubric
    │   │       └── 02_performance_test.sh   # Evaluates performance rubric
    │   └── data/
    │       └── test_cases/
    │           ├── test_get_users.json
    │           ├── test_create_user.json
    │           └── test_update_user.json
    │
    ├── database/                   # Service container (PostgreSQL)
    │   ├── Dockerfile              # FROM postgres:15-alpine
    │   ├── stage1.config.json      # accepts_submission: false
    │   └── data/
    │       ├── init.sql            # Database schema
    │       └── seed.sql            # Test data
    │
    ├── data/                       # Shared test data
    │   └── schemas/
    │       ├── user_schema.json
    │       └── error_schema.json
    │
    └── README.md                   # Problem description
```

---

## Global config.json Structure

The global `config.json` at the root defines the container setup:

```json
{
  "problem_id": "rest-api-users",
  "problem_name": "REST API - User Management",
  "project_type": "nodejs-api",

  "submission_mounts": {
    "submission": "/workspace/src"
  },

  "containers": [
    {
      "container_id": "submission",
      "accepts_submission": true,
      "dockerfile_path": "submission/Dockerfile",
      "depends_on": ["database"]
    },
    {
      "container_id": "api-tester",
      "accepts_submission": false,
      "dockerfile_path": "api-tester/Dockerfile",
      "depends_on": [
        {
          "container_id": "submission",
          "condition": "healthy",
          "timeout": 30,
          "retry": 5
        }
      ],
      "terminates": ["submission"]
    },
    {
      "container_id": "database",
      "accepts_submission": false,
      "dockerfile_path": "database/Dockerfile"
    }
  ],

  "rubrics": [
    {
      "rubric_id": "api_correctness",
      "container": "api-tester"
    },
    {
      "rubric_id": "performance",
      "container": "api-tester"
    },
    {
      "rubric_id": "security",
      "container": "submission"
    },
    {
      "rubric_id": "code_quality",
      "container": "submission"
    }
  ]
}
```

---

## Stage-Specific Configuration

Each container has two stages with separate configurations:

### Stage 1: Problem Build (`stage1.config.json`)

Executed during problem registration to build the problem image:

```json
{
  "container_id": "submission",
  "network": {
    "enabled": true,
    "mode": "bridge"
  },
  "resource_limits": {
    "cpu": "2.0",
    "memory": "1G",
    "timeout": 600
  },
  "environment": {
    "NODE_ENV": "development"
  }
}
```

**Purpose**: Install dependencies, download libraries, set up environment

### Stage 2: Submission Evaluation (`stage2.config.json`)

Executed during each submission evaluation:

```json
{
  "container_id": "submission",
  "accepts_submission": true,
  "submission_mount": "/workspace/src",
  "network": {
    "enabled": false,
    "internal_only": true,
    "allowed_containers": ["database", "api-tester"]
  },
  "resource_limits": {
    "cpu": "1.0",
    "memory": "512M",
    "timeout": 300
  },
  "environment": {
    "NODE_ENV": "production",
    "DATABASE_URL": "postgresql://postgres:postgres@database:5432/testdb"
  },
  "health_check": {
    "command": "curl -f http://localhost:3000/health || exit 1",
    "interval": 5,
    "timeout": 3,
    "retries": 3
  }
}
```

**Key differences in this example:**

- **Stage 1**: Build problem image with network enabled to install dependencies. Snapshot or cache layers for faster builds
- **Stage 2**: Build submission on top of problem image with network disabled (internal only), stricter resource limits, and mount submission code

**Note**: Network settings can be overriden to allow specific inter-container communication as needed.

## Submission Mounting

Submissions are mounted using the format: `<container-id>:<path>`

Defined in global `config.json`:

```json
{
  "submission_mounts": {
    "submission-id": "container-id:/workspace/src"
  }
}
```

For example:

```json
{
  "submission_mounts": {
    "frontend": "frontend:/workspace/src"
  }
}
```

This mounts the submission directory to `/workspace/src` in the `submission` container.

**Container filesystem after mounting:**

```
/
├── usr/
│   └── local/
│       └── lib/              # Dependencies from Stage 1
│           └── node_modules/ # Installed via npm in Dockerfile
├── workspace/
│   └── src/                  # Submission mounted here (Stage 2)
│       └── [submission files]
├── hooks/                    # Problem hooks
├── data/                     # Problem data
└── out/                      # Output directory
```

**Why this matters**: The submission is placed where it can access dependencies installed in Stage 1. For example, if `node_modules` or Python packages were installed in Stage 1, the submission code at `/workspace/src` can import them.

---

## Directory Naming Conventions

- **Container directories**: Use descriptive names (`submission`, `api-tester`, `database`, not `container-1`, `container-2`)
- **Hook scripts**: Prefix with numbers for execution order (`01_`, `02_`, `03_`)
- **Hook phases**: Use `pre/`, `post/` subdirectories
- **Shared data**: Place in root-level `data/` directory
- **Container-specific data**: Place in `<container-id>/data/` directory

---

## Resource Mounting Behavior

When containers are started:

1. **Global data** (`data/` at root) is mounted to all containers at `/data/`
2. **Container-specific data** (`<container-id>/data/`) is mounted only to that container at `/data/<container-id>/`
3. **Hooks** are executed **outside** containers using `docker exec`
4. **Submission** (if `accepts_submission: true`) is mounted to the path specified in `submission_mounts`

See [`../containers/resources.md`](../containers/resources.md) for detailed mounting specifications.

---

## Two-Stage Build for Submission Containers

Containers with `accepts_submission: true` undergo a two-stage build:

### Stage 1: Build Problem Image (stage1.config.json)

- Network enabled for downloading dependencies
- Install packages, libraries, and tools
- Set up the evaluation environment
- More relaxed resource limits
- Create the problem base image (cached)

**Example Dockerfile:**

```dockerfile
FROM node:18-alpine

# Install dependencies during Stage 1
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --only=production

# Copy hooks and data
COPY hooks /hooks
COPY data /data

WORKDIR /workspace
```

### Stage 2: Load Submission (stage2.config.json)

- Network disabled or restricted to internal only
- Start from the cached problem base image
- Mount submission submission code to specified path
- Stricter resource limits for security
- Ready for execution

**Container state after Stage 2:**

```
/
├── app/
│   └── node_modules/         # Installed in Stage 1
├── workspace/
│   └── src/                  # Submission mounted here in Stage 2
│       └── [submission files]   # Can import from /app/node_modules
├── hooks/
├── data/
└── out/
```

---

## Best Practices

1. **Define explicit dependencies** between containers with health checks and timeouts
2. **Place shared data** at the root level, container-specific data in container directories
3. **Use meaningful container IDs** (e.g., `submission`, `api-tester`, not `container1`)
4. **Number hook scripts** to control execution order
5. **Configure Stage 1 for setup**: Enable network, install dependencies
6. **Configure Stage 2 for security**: Disable external network, mount submission
7. **Mount submission where it can access dependencies**: e.g., `/workspace/src` can access `/app/node_modules`
8. **Test locally** before uploading to judgehost

---

## See Also

- [Problem Registration API](../../problems/POST_problems.md)
- [Resource Mounting Details](../containers/resources.md)
- [Rubric-to-Container Mapping](../rubrics/mapping.md)
- [Submission Package Structure](submission_package_name.md)
