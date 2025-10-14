# Test Problem Package: REST API Users

**Package:** `rest-api-users.tar.gz`  
**Problem ID:** `rest-api-users`  
**Type:** REST API / Multi-Container  
**Difficulty:** Medium  
**Created:** October 14, 2025

---

## Overview

This is a multi-container REST API problem package designed to test advanced evaluation features including:

- Multi-container orchestration
- Container dependencies with health checks
- Inter-container communication
- Database integration
- API testing

---

## Package Structure

```
rest-api-users/
├── config.json                                 # Problem configuration (3 containers)
├── README.md                                   # Problem description
├── database/                                   # PostgreSQL container
│   ├── Dockerfile                              # PostgreSQL 15 Alpine
│   ├── stage1.config.json
│   ├── stage2.config.json
│   └── data/
│       └── init.sql                            # Database initialization
│
├── submission/                                 # Submission API container
│   ├── Dockerfile                              # Node.js 18 + tools
│   ├── package.json                            # Base dependencies
│   ├── stage1.config.json                      # Build stage
│   ├── stage2.config.json                      # Evaluation stage
│   └── hooks/
│       └── post/
│           ├── 01_code_quality.sh              # ESLint check
│           └── 02_security_scan.sh             # Security audit
│
└── api-tester/                                 # API testing container
    ├── Dockerfile                              # Node.js 18 + axios
    ├── package.json                            # Testing dependencies
    ├── api-test-runner.js                      # Test execution script
    ├── stage1.config.json
    ├── stage2.config.json
    └── hooks/
        └── post/
            └── 01_run_api_tests.sh             # Execute API tests
```

---

## Container Architecture

### 1. Database Container

**Purpose:** PostgreSQL database for user data  
**Image:** postgres:15-alpine  
**Network:** Internal only  
**Dependencies:** None (starts first)

**Features:**

- Initializes with users table schema
- Seeds 3 sample users
- Health check via pg_isready
- Exposes port 5432 internally

**Environment:**

- POSTGRES_USER=testuser
- POSTGRES_PASSWORD=testpass
- POSTGRES_DB=usersdb

### 2. Submission Container

**Purpose:** Student's REST API implementation  
**Image:** Node.js 18 Alpine  
**Network:** Internal only (can access database)  
**Dependencies:** database (healthy)  
**Accepts Submission:** Yes

**Features:**

- Mounts submission to /workspace
- Connects to database via environment variable
- Health check via curl to /health
- Runs on port 3000

**Environment:**

- DATABASE_URL=postgresql://testuser:testpass@database:5432/usersdb
- PORT=3000
- NODE_ENV=production

**Hooks:**

- Post: Code quality check (ESLint)
- Post: Security scan (npm audit, code analysis)

### 3. API-Tester Container

**Purpose:** Test the submission API  
**Image:** Node.js 18 Alpine + testing tools  
**Network:** Internal only (can access submission)  
**Dependencies:** submission (healthy)  
**Terminates:** submission (stops after tests complete)

**Features:**

- Waits for submission API to be healthy
- Runs 6 API test cases
- Outputs results to /out/rubric_api_endpoints.json

**Environment:**

- API_BASE_URL=http://submission:3000
- TEST_TIMEOUT=5000

**Hooks:**

- Post: Run API tests

---

## Dependency Flow

```
┌──────────┐
│ database │ (starts first, must be healthy)
└─────┬────┘
      │
      ▼
┌─────────────┐
│ submission  │ (starts after database healthy, must be healthy)
└──────┬──────┘
       │
       ▼
┌──────────────┐
│  api-tester  │ (starts after submission healthy, terminates submission when done)
└──────────────┘
```

---

## Rubrics

### 1. api_endpoints (60 points)

- **Evaluated by:** api-tester container
- **Type:** api_endpoints

**Test Cases:**
| Test | Endpoint | Weight | Description |
|------|----------|--------|-------------|
| 1 | GET /health | 5 | Health check |
| 2 | GET /api/users | 10 | List all users |
| 3 | GET /api/users/:id | 10 | Get specific user |
| 4 | POST /api/users | 15 | Create new user |
| 5 | PUT /api/users/:id | 10 | Update user |
| 6 | DELETE /api/users/:id | 10 | Delete user |

### 2. code_quality (20 points)

- **Evaluated by:** submission container
- **Type:** code_quality
- ESLint analysis
- Deducts 3 points per error, 1 point per warning

### 3. security (20 points)

- **Evaluated by:** submission container
- **Type:** security_scan
- npm audit for dependency vulnerabilities
- Code analysis for hardcoded secrets, eval() usage
- Deducts based on severity: critical=10, high=5, medium=2, low=1

**Total:** 100 points

---

## Expected Rubric Outputs

### /out/rubric_api_endpoints.json (from api-tester)

```json
{
  "rubric_id": "api_endpoints",
  "status": "DONE",
  "score": 60,
  "max_score": 60,
  "feedback": "Passed 6/6 API tests",
  "details": {
    "passed": 6,
    "failed": 0,
    "errors": 0,
    "total": 6,
    "total_score": 60,
    "max_score": 60,
    "test_results": [
      {
        "test_id": "test_1",
        "test_name": "Health Check",
        "status": "passed",
        "message": "Health check passed",
        "duration_ms": 25,
        "score": 5,
        "max_score": 5
      }
      // ... more tests
    ]
  }
}
```

### /out/rubric_code_quality.json (from submission)

```json
{
  "rubric_id": "code_quality",
  "status": "DONE",
  "score": 20,
  "max_score": 20,
  "feedback": "Code quality check completed",
  "details": {
    "issues_found": 0,
    "deduction": 0
  }
}
```

### /out/rubric_security.json (from submission)

```json
{
  "rubric_id": "security",
  "status": "DONE",
  "score": 20,
  "max_score": 20,
  "feedback": "No security issues found",
  "details": {
    "vulnerabilities": {
      "critical": 0,
      "high": 0,
      "medium": 0,
      "low": 0,
      "total": 0
    },
    "deduction": 0
  }
}
```

---

## Test Submission

### rest-api-users-submission.tar.gz (1.7 KB)

**Structure:**

```
rest-api-users-submission/
├── package.json
└── index.js
```

**Features:**

- Full CRUD implementation with Express.js
- PostgreSQL integration with pg
- Proper error handling and validation
- Health check endpoint
- Listens on 0.0.0.0:3000
- Email validation
- Age validation
- Handles duplicate emails (409 status)
- Returns proper status codes

**Expected Results:**

- API endpoints: 60/60 (all tests pass)
- Code quality: 20/20 (clean code)
- Security: 20/20 (no issues)
- **Total: 100/100**

---

## Usage

### 1. Register Problem

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problemPackage=@rest-api-users.tar.gz" \
  -F "problemId=rest-api-users"
```

### 2. Submit Solution

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problemId=rest-api-users" \
  -F "submissionPackage=@rest-api-users-submission.tar.gz" \
  -F "teamId=team-001"
```

### 3. Check Results

```bash
curl http://localhost:3000/api/results/{submissionId}
```

---

## What This Tests

### Multi-Container Features

✅ 3-container orchestration  
✅ Container dependencies (database → submission → api-tester)  
✅ Health checks with retries  
✅ Health check conditions (healthy state)  
✅ Inter-container communication  
✅ Container termination (terminates field)  
✅ Network isolation (internal only)  
✅ Container-specific environment variables

### Evaluation Features

✅ Multi-container rubric mapping (evaluated_by_container)  
✅ API endpoints rubric type  
✅ Code quality rubric type  
✅ Security scan rubric type  
✅ Hooks in multiple containers  
✅ Post-hooks execution  
✅ Rubric outputs from different containers  
✅ Database integration

### Advanced Features

✅ PostgreSQL database initialization  
✅ REST API implementation  
✅ HTTP endpoint testing  
✅ Dependency vulnerability scanning  
✅ Code quality analysis  
✅ Security checks  
✅ Graceful container startup sequencing

---

## Execution Flow

1. **Database starts**

   - PostgreSQL initializes
   - Creates users table
   - Seeds sample data
   - Health check passes

2. **Submission starts** (after database healthy)

   - npm install dependencies
   - Starts Express server on port 3000
   - Connects to database
   - Health check passes (/health endpoint)

3. **API-Tester starts** (after submission healthy)

   - Waits for submission API
   - Runs 6 API test cases
   - Writes results to /out/rubric_api_endpoints.json
   - Terminates submission container

4. **Hooks execute**

   - submission hooks: code_quality, security_scan
   - api-tester hooks: run_api_tests (already done in container)

5. **Results collected**
   - rubric_api_endpoints.json (from api-tester)
   - rubric_code_quality.json (from submission)
   - rubric_security.json (from submission)
   - Metrics from all 3 containers
   - Logs from all 3 containers

---

## File Sizes

- Problem package: 8.2 KB
- Submission package: 1.7 KB
- **Total: ~10 KB**

---

## Testing Notes

### Timing Considerations

- Database startup: ~3-5 seconds
- Submission startup: ~5-10 seconds (npm install + server start)
- API tests: ~5-10 seconds
- Total execution: ~15-25 seconds

### Resource Usage

- Database: 256MB memory, 0.5 CPU
- Submission: 512MB memory, 1.0 CPU
- API-Tester: 256MB memory, 0.5 CPU
- **Total: 1GB memory, 2.0 CPU**

### Common Issues

1. **Health check timeout:** Increase start_period or retries
2. **Database connection refused:** Ensure DATABASE_URL is correct
3. **API tests fail:** Verify submission listens on 0.0.0.0, not localhost
4. **Container start order:** Dependencies ensure proper sequencing

---

## Next Steps

After validating this multi-container problem:

1. Test problem registration and Docker image building
2. Test submission with rest-api-users-submission.tar.gz
3. Verify all 3 containers start in correct order
4. Verify health checks work
5. Verify inter-container communication
6. Verify all rubrics are collected from correct containers
7. Verify metrics collected from all 3 containers
8. Verify container termination works
9. Move to end-to-end API testing (Tasks 23-27)
