# Test Problem Package: Two Sum

**Package:** `two-sum.tar.gz`  
**Problem ID:** `two-sum`  
**Type:** Algorithm / Single Container  
**Difficulty:** Easy  
**Created:** October 14, 2025

---

## Overview

This is a simple algorithm problem package designed to test the basic evaluation workflow. It implements the classic "Two Sum" problem where students must find two numbers in an array that add up to a target value.

---

## Package Structure

```
two-sum/
├── config.json                              # Problem configuration
├── README.md                                # Problem description
└── submission/
    ├── Dockerfile                           # Node.js 18 + Python tools
    ├── stage1.config.json                   # Build stage configuration
    ├── stage2.config.json                   # Evaluation stage configuration
    ├── test-runner.js                       # Test execution script
    ├── hooks/
    │   ├── pre/
    │   │   └── 01_validate_submission.sh    # Validate submission structure
    │   └── post/
    │       ├── 01_run_tests.sh              # Execute test cases
    │       └── 02_code_quality.sh           # Code quality analysis
    └── data/
        └── test_cases.json                  # 10 test cases
```

---

## Problem Configuration

### Container Setup

- **Single container:** `submission`
- **Accepts submission:** Yes
- **Resource limits:** 1 CPU, 512M memory, 60s timeout
- **Network:** Disabled during evaluation

### Rubrics

1. **test_cases** (80 points)

   - Evaluated by: `submission` container
   - Type: `test_cases`
   - 10 test cases (8 points each)
   - Tests basic cases, edge cases, negatives, large numbers

2. **code_quality** (20 points)
   - Evaluated by: `submission` container
   - Type: `code_quality`
   - JavaScript: ESLint analysis
   - Python: Pylint analysis
   - Deducts 2 points per issue found

**Total:** 100 points

---

## Test Cases

| ID      | Description          | Input                            | Expected | Points |
| ------- | -------------------- | -------------------------------- | -------- | ------ |
| test_1  | Basic case           | nums=[2,7,11,15], target=9       | [0,1]    | 8      |
| test_2  | Three numbers        | nums=[3,2,4], target=6           | [1,2]    | 8      |
| test_3  | Same number twice    | nums=[3,3], target=6             | [0,1]    | 8      |
| test_4  | Negative numbers     | nums=[-1,-2,-3,-4,-5], target=-8 | [2,4]    | 8      |
| test_5  | Large numbers        | nums=[1M,2M,3M], target=3M       | [0,1]    | 8      |
| test_6  | Zero in array        | nums=[0,4,3,0], target=0         | [0,3]    | 8      |
| test_7  | Multiple valid pairs | nums=[1,2,3,4,5], target=5       | [0,3]    | 8      |
| test_8  | End of array         | nums=[1..10], target=19          | [8,9]    | 8      |
| test_9  | Large array          | nums=[5,10,..50], target=15      | [0,1]    | 8      |
| test_10 | Mixed pos/neg        | nums=[-10,-5,0,5,10], target=0   | [1,3]    | 8      |

---

## Hook Execution Flow

### Pre-Hooks

1. **01_validate_submission.sh**
   - Checks `/workspace` directory exists
   - Verifies solution file (.js or .py) present
   - Exits with error if validation fails

### Post-Hooks

1. **01_run_tests.sh**

   - Executes `test-runner.js`
   - Runs all 10 test cases
   - Writes results to `/out/rubric_test_cases.json`

2. **02_code_quality.sh**
   - Detects language (JavaScript or Python)
   - Runs ESLint (JS) or Pylint (Python)
   - Counts code quality issues
   - Writes results to `/out/rubric_code_quality.json`

---

## Expected Rubric Outputs

### /out/rubric_test_cases.json

```json
{
  "rubric_id": "test_cases",
  "status": "DONE",
  "score": 80,
  "max_score": 80,
  "feedback": "Passed 10/10 test cases",
  "details": {
    "passed": 10,
    "failed": 0,
    "errors": 0,
    "total": 10,
    "test_results": [
      {
        "test_id": "test_1",
        "status": "passed",
        "message": "Correct output: [0,1]",
        "duration_ms": 5
      }
      // ... more test results
    ]
  }
}
```

### /out/rubric_code_quality.json

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

---

## Test Submissions

### 1. Correct Solution (`two-sum-submission-correct.tar.gz`)

**File:** `solution.js`

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
  return [];
}
module.exports = { twoSum };
```

**Expected Results:**

- Test cases: 80/80 (all tests pass)
- Code quality: 20/20 (no issues)
- **Total: 100/100**

### 2. Partial Solution (`two-sum-submission-partial.tar.gz`)

**File:** `solution.js`

```javascript
function twoSum(nums, target) {
  // Brute force with code quality issues
  for (var i = 0; i < nums.length; i++) {
    for (var j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }
  return null; // Bug: should return []
}
var unusedVar = "not used"; // Code quality issue
module.exports = { twoSum };
```

**Expected Results:**

- Test cases: 80/80 (should pass all with brute force)
- Code quality: 14-18/20 (deductions for unused var, var instead of let/const)
- **Total: ~94-98/100**

---

## Usage

### 1. Register Problem

```bash
curl -X POST http://localhost:3000/api/problems \
  -F "problemPackage=@two-sum.tar.gz" \
  -F "problemId=two-sum"
```

### 2. Submit Solution

```bash
curl -X POST http://localhost:3000/api/submissions \
  -F "problemId=two-sum" \
  -F "submissionPackage=@two-sum-submission-correct.tar.gz" \
  -F "teamId=team-001"
```

### 3. Check Results

```bash
curl http://localhost:3000/api/results/{submissionId}
```

---

## Validation Checklist

- [x] Package structure matches documentation
- [x] config.json has valid schema
- [x] Dockerfile builds successfully
- [x] stage1.config.json and stage2.config.json present
- [x] Hooks have execute permissions
- [x] test_cases.json is valid JSON
- [x] Test runner produces correct rubric output
- [x] Code quality hook produces correct rubric output
- [x] Tarball created and compressed

---

## Testing Notes

### What This Tests

✅ Single container evaluation  
✅ Pre-hook validation  
✅ Post-hook execution  
✅ Test case rubric type  
✅ Code quality rubric type  
✅ Hook output to /out/ directory  
✅ Rubric collection by rubricEvaluator  
✅ Submission mounting to /workspace  
✅ Data mounting to /data  
✅ Resource limits (CPU, memory, timeout)  
✅ Network disabled during evaluation

### What This Doesn't Test

❌ Multi-container orchestration  
❌ Container dependencies  
❌ Health checks  
❌ Inter-container communication  
❌ Service containers (database, etc.)  
❌ Periodic hooks  
❌ Multiple submission packages

---

## Next Steps

After validating this simple algorithm problem:

1. Test with correct submission (`two-sum-submission-correct.tar.gz`)
2. Test with partial submission (`two-sum-submission-partial.tar.gz`)
3. Verify rubric outputs are collected correctly
4. Verify metrics are collected
5. Verify logs are saved
6. Move to REST API multi-container problem (Task 18)

---

## File Sizes

- Problem package: ~5.1 KB
- Correct submission: ~664 bytes
- Partial submission: ~715 bytes

Total size for testing: ~6.5 KB
