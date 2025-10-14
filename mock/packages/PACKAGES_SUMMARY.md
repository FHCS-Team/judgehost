# Generated Test Packages Summary

**Generated:** January 2025  
**Purpose:** Test and validate judgehost evaluation system  
**Total Packages:** 5 (2 problems + 3 submissions)

---

## Overview

This directory contains complete test packages for validating the judgehost evaluation system. These packages test both single-container and multi-container scenarios with various rubric types.

---

## Package Inventory

### Problem Packages

| Package                   | Size   | Containers | Rubrics | Description                        |
| ------------------------- | ------ | ---------- | ------- | ---------------------------------- |
| **two-sum.tar.gz**        | 5.1 KB | 1          | 2       | Simple algorithm problem (two-sum) |
| **rest-api-users.tar.gz** | 8.2 KB | 3          | 3       | Multi-container REST API problem   |

### Submission Packages

| Package                               | Size   | Type      | Expected Score | Description                     |
| ------------------------------------- | ------ | --------- | -------------- | ------------------------------- |
| **two-sum-submission-correct.tar.gz** | 664 B  | Algorithm | 100/100        | Hash map solution (O(n))        |
| **two-sum-submission-partial.tar.gz** | 715 B  | Algorithm | 94-98/100      | Brute force with quality issues |
| **rest-api-users-submission.tar.gz**  | 1.7 KB | REST API  | 95-100/100     | Express.js CRUD implementation  |

**Total Size:** ~17 KB

---

## Problem Package Details

### 1. two-sum.tar.gz (5.1 KB)

**Problem ID:** `two-sum`  
**Type:** Algorithm / Single Container  
**Difficulty:** Easy

#### Features Tested

- ✅ Single container evaluation
- ✅ Pre-hook validation
- ✅ Post-hook test execution
- ✅ Post-hook code quality checks
- ✅ test_cases rubric type
- ✅ code_quality rubric type
- ✅ Data mounting (/data/test_cases.json)
- ✅ Multi-stage configuration (build + evaluation)

#### Containers

1. **submission** (accepts_submission: true)
   - Base: Node.js 18 Alpine
   - Tools: ESLint
   - Stages: 2 (build with network, evaluation without network)

#### Rubrics

1. **test_cases** (80 points) - 10 test cases
2. **code_quality** (20 points) - ESLint analysis

#### Test Coverage

- Basic cases: Simple pairs, first/last elements
- Edge cases: No solution, multiple solutions
- Boundaries: Empty array, single element, duplicates
- Large numbers: Max/min integers
- Negatives: Negative numbers

#### Documentation

- See: `TWO_SUM_PACKAGE.md`

---

### 2. rest-api-users.tar.gz (8.2 KB)

**Problem ID:** `rest-api-users`  
**Type:** REST API / Multi-Container  
**Difficulty:** Medium

#### Features Tested

- ✅ Multi-container orchestration (3 containers)
- ✅ Container dependencies with conditions
- ✅ Health checks with retries
- ✅ Inter-container communication
- ✅ Internal-only networking
- ✅ Container termination
- ✅ Database integration (PostgreSQL)
- ✅ api_endpoints rubric type
- ✅ code_quality rubric type
- ✅ security_scan rubric type
- ✅ Multi-stage configuration per container
- ✅ Environment variable passing

#### Containers

1. **database** (accepts_submission: false)

   - Base: PostgreSQL 15 Alpine
   - Purpose: Users database
   - Health check: pg_isready
   - Dependencies: None (starts first)

2. **submission** (accepts_submission: true)

   - Base: Node.js 18 Alpine
   - Purpose: Student's REST API
   - Health check: curl /health
   - Dependencies: database (healthy)
   - Network: Internal only, can access database

3. **api-tester** (accepts_submission: false)
   - Base: Node.js 18 Alpine + axios
   - Purpose: Test the API
   - Health check: None
   - Dependencies: submission (healthy)
   - Terminates: submission (after tests complete)

#### Dependency Flow

```
database (starts first, must be healthy)
    ↓
submission (starts after database healthy, must be healthy)
    ↓
api-tester (starts after submission healthy, terminates submission)
```

#### Rubrics

1. **api_endpoints** (60 points) - 6 API tests
   - Evaluated by: api-tester container
   - Tests: GET /health, GET /users, GET /users/:id, POST, PUT, DELETE
2. **code_quality** (20 points) - ESLint analysis

   - Evaluated by: submission container
   - Hook: post/01_code_quality.sh

3. **security** (20 points) - Security scan
   - Evaluated by: submission container
   - Checks: npm audit, hardcoded secrets, eval() usage
   - Hook: post/02_security_scan.sh

#### Test Coverage

- CRUD operations on users endpoint
- Health check endpoint
- Database connectivity
- Error handling (404, 409, 500)
- Input validation

#### Documentation

- See: `REST_API_USERS_PACKAGE.md`

---

## Submission Package Details

### 1. two-sum-submission-correct.tar.gz (664 B)

**For Problem:** two-sum  
**Solution Approach:** Hash map (optimal)  
**Time Complexity:** O(n)  
**Space Complexity:** O(n)

#### Expected Results

- **test_cases:** 80/80 (all 10 tests pass)
- **code_quality:** 20/20 (clean code, no issues)
- **Total:** 100/100

#### Implementation

```javascript
function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return null;
}
```

---

### 2. two-sum-submission-partial.tar.gz (715 B)

**For Problem:** two-sum  
**Solution Approach:** Brute force (suboptimal)  
**Time Complexity:** O(n²)  
**Space Complexity:** O(1)

#### Expected Results

- **test_cases:** 80/80 (all tests pass, but slower)
- **code_quality:** 14-18/20 (code quality issues)
  - Uses `var` instead of `const/let`
  - Unused variables
  - Missing semicolons
- **Total:** 94-98/100

#### Implementation

```javascript
function twoSum(nums, target) {
  var unusedVar = "test"; // Unused variable
  for (var i = 0; i < nums.length; i++) {
    for (var j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return null;
}
```

---

### 3. rest-api-users-submission.tar.gz (1.7 KB)

**For Problem:** rest-api-users  
**Framework:** Express.js  
**Database:** PostgreSQL with pg library

#### Expected Results

- **api_endpoints:** 60/60 (all 6 API tests pass)
- **code_quality:** 20/20 (clean code)
- **security:** 15-20/20 (minimal/no vulnerabilities)
- **Total:** 95-100/100

#### Implementation Features

- ✅ Full CRUD operations (GET, POST, PUT, DELETE)
- ✅ Health check endpoint
- ✅ PostgreSQL connection with connection pooling
- ✅ Input validation (email, age)
- ✅ Proper error handling
- ✅ HTTP status codes (200, 201, 404, 409, 500)
- ✅ Duplicate email detection
- ✅ JSON request/response

#### API Endpoints

```
GET  /health          - Health check
GET  /api/users       - List all users
GET  /api/users/:id   - Get specific user
POST /api/users       - Create new user
PUT  /api/users/:id   - Update user
DELETE /api/users/:id - Delete user
```

---

## Testing Matrix

| Feature                | two-sum | rest-api-users |
| ---------------------- | ------- | -------------- |
| Single container       | ✅      | ❌             |
| Multi-container        | ❌      | ✅             |
| Container dependencies | ❌      | ✅             |
| Health checks          | ❌      | ✅             |
| Pre-hooks              | ✅      | ❌             |
| Post-hooks             | ✅      | ✅             |
| test_cases rubric      | ✅      | ❌             |
| code_quality rubric    | ✅      | ✅             |
| api_endpoints rubric   | ❌      | ✅             |
| security_scan rubric   | ❌      | ✅             |
| Data mounting          | ✅      | ✅             |
| Database integration   | ❌      | ✅             |
| Network isolation      | ✅      | ✅             |
| Container termination  | ❌      | ✅             |
| Multi-stage config     | ✅      | ✅             |

---

## Usage Instructions

### 1. Verify Package Structure

```bash
cd /home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages

# List all packages
ls -lh *.tar.gz

# View package contents
tar -tzf two-sum.tar.gz
tar -tzf rest-api-users.tar.gz
```

### 2. Register Problems via API

```bash
# Register two-sum problem
curl -X POST http://localhost:3000/api/problems \
  -F "problemPackage=@two-sum.tar.gz" \
  -F "problemId=two-sum"

# Register rest-api-users problem
curl -X POST http://localhost:3000/api/problems \
  -F "problemPackage=@rest-api-users.tar.gz" \
  -F "problemId=rest-api-users"
```

### 3. Submit Solutions via API

```bash
# Submit correct two-sum solution
curl -X POST http://localhost:3000/api/submissions \
  -F "problemId=two-sum" \
  -F "submissionPackage=@two-sum-submission-correct.tar.gz" \
  -F "teamId=team-001"

# Submit partial two-sum solution
curl -X POST http://localhost:3000/api/submissions \
  -F "problemId=two-sum" \
  -F "submissionPackage=@two-sum-submission-partial.tar.gz" \
  -F "teamId=team-002"

# Submit REST API solution
curl -X POST http://localhost:3000/api/submissions \
  -F "problemId=rest-api-users" \
  -F "submissionPackage=@rest-api-users-submission.tar.gz" \
  -F "teamId=team-003"
```

### 4. Check Results

```bash
# Get submission result (replace {submissionId} with actual ID)
curl http://localhost:3000/api/results/{submissionId}

# Get submission logs
curl http://localhost:3000/api/results/{submissionId}/logs

# View metrics
curl http://localhost:3000/api/results/{submissionId} | jq '.metrics'
```

---

## Validation Checklist

### Package Structure Validation

- [ ] Extract each tarball successfully
- [ ] Verify config.json format
- [ ] Check all containers have Dockerfiles
- [ ] Verify stage configs exist for each container
- [ ] Check hook scripts are present and executable
- [ ] Validate data files exist and are well-formed

### Docker Build Validation

- [ ] Build all Dockerfiles successfully
- [ ] Verify base images are accessible
- [ ] Check Docker image sizes are reasonable
- [ ] Test container startup without errors

### Multi-Container Validation (rest-api-users)

- [ ] Verify container dependencies are correct
- [ ] Test health checks work properly
- [ ] Check containers start in correct order
- [ ] Verify inter-container networking
- [ ] Test container termination works

### Rubric Validation

- [ ] All rubric files are generated in /out
- [ ] Rubric JSON format is correct
- [ ] Scores are within expected ranges
- [ ] Rubric status is valid (DONE/SKIPPED/ERROR)

### End-to-End Validation

- [ ] Register problems via API (status 201)
- [ ] Submit solutions via API (status 202)
- [ ] Retrieve results via API (status 200)
- [ ] Verify scores match expectations
- [ ] Check logs are collected
- [ ] Verify metrics are collected

---

## Expected Execution Times

| Package                    | Build Time | Evaluation Time | Total Time |
| -------------------------- | ---------- | --------------- | ---------- |
| two-sum-submission-correct | ~5-10s     | ~5-10s          | ~10-20s    |
| two-sum-submission-partial | ~5-10s     | ~5-10s          | ~10-20s    |
| rest-api-users-submission  | ~10-15s    | ~15-25s         | ~25-40s    |

**Note:** Times may vary based on system resources and network speed.

---

## Resource Requirements

### two-sum

- **Memory:** 512 MB
- **CPU:** 1.0 core
- **Disk:** ~200 MB (base image + dependencies)

### rest-api-users

- **Memory:** 1 GB (database: 256MB, submission: 512MB, api-tester: 256MB)
- **CPU:** 2.0 cores (database: 0.5, submission: 1.0, api-tester: 0.5)
- **Disk:** ~500 MB (PostgreSQL + Node.js images + dependencies)

---

## Next Steps

### Phase 5: Package Validation (Tasks 21-22)

1. **Task 21:** Validate two-sum package
   - Extract and verify structure
   - Build Dockerfile
   - Test hooks syntax
   - Verify test_cases.json format
2. **Task 22:** Validate rest-api-users package
   - Extract and verify 3-container structure
   - Build all Dockerfiles
   - Test health checks
   - Verify dependencies configuration
   - Test init.sql

### Phase 6: Docker-Level Testing (Task 23)

- Build Docker images from Dockerfiles
- Test container orchestration
- Verify health checks and dependencies
- Test hook execution via docker exec
- Verify volume mounting
- Test network isolation

### Phase 7: API Integration Testing (Tasks 24-27)

- Register problems via POST /api/problems
- Submit solutions via POST /api/submissions
- Retrieve results via GET /api/results
- Verify complete evaluation workflow

### Phase 8: Results Verification (Tasks 28-29)

- Verify rubric scores
- Check logs collection
- Validate metrics data
- Test error handling

---

## Documentation

- **two-sum package:** See `TWO_SUM_PACKAGE.md`
- **rest-api-users package:** See `REST_API_USERS_PACKAGE.md`
- **Implementation progress:** See `/IMPLEMENTATION_PROGRESS.md`
- **TODO list:** See `/TODO.md`

---

## Package Archive Location

```
/home/vtvinh24/Desktop/Workspace/Capstone/judgehost/mock/packages/
├── two-sum.tar.gz (5.1 KB)
├── two-sum-submission-correct.tar.gz (664 B)
├── two-sum-submission-partial.tar.gz (715 B)
├── rest-api-users.tar.gz (8.2 KB)
└── rest-api-users-submission.tar.gz (1.7 KB)
```

---

**Generated:** January 2025  
**Status:** Complete and ready for validation  
**Total Size:** ~17 KB  
**Coverage:** Single-container ✅, Multi-container ✅, All core rubric types ✅
