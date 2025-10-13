# Two Sum - Example Problem Package

This is a complete example problem package demonstrating the judgehost evaluation system. It implements the classic "Two Sum" algorithm problem.

## Problem Structure

```
two-sum/
├── config.json                    # Problem configuration
├── Dockerfile                     # Base problem image
├── README.md                      # Problem description (this file)
├── data/
│   └── test_cases.json           # Test cases with inputs/outputs
├── hooks/
│   ├── pre/
│   │   └── 01_prepare_submission.sh    # Setup environment
│   └── post/
│       ├── 02_test_correctness.sh      # Run correctness tests
│       └── 03_test_performance.sh      # Evaluate performance
└── examples/
    ├── solution_optimal.py             # O(n) solution
    ├── solution_bruteforce.py          # O(n²) solution
    └── solution_broken.py              # Intentionally broken

```

## Configuration (config.json)

The problem is configured with:

- **problem_id**: `two-sum`
- **project_type**: `cli` (command-line interface)
- **resource_limits**: 512MB memory, 2 CPUs, 30s timeout
- **rubrics**:
  - **Correctness** (40 points): Tests pass and produce correct output
  - **Performance** (10 points): Algorithm efficiency (time complexity)

## Test Cases

Located in `data/test_cases.json`, includes:

1. Basic test cases with simple arrays
2. Edge cases (duplicates, negatives, zeros)
3. Large value tests
4. Performance tests (10,000 elements)

## Hooks

### Pre-deployment Hook: `01_prepare_submission.sh`

- Detects submission language (Python, Node.js, Java, C++, etc.)
- Installs dependencies if needed
- Compiles code for compiled languages
- Makes scripts executable

### Post-deployment Hooks

#### `02_test_correctness.sh`

- Runs all test cases from `test_cases.json`
- Compares actual output with expected output
- Calculates correctness score (0-40 points)
- Generates `rubric_correctness.json`

#### `03_test_performance.sh`

- Generates large test case (10,000 elements)
- Measures execution time over 3 runs
- Estimates time complexity:
  - O(n): 10 points (< 100ms)
  - O(n log n): 7 points (< 500ms)
  - O(n²): 3 points (< 5000ms)
  - Timeout: 0 points
- Generates `rubric_performance.json`

## Example Solutions

### Optimal Solution (`solution_optimal.py`)

**Expected Score: 50/50 (100%)**

Uses a hash table to find complements in a single pass:

- Time: O(n)
- Space: O(n)
- Correctness: 40/40
- Performance: 10/10

### Brute Force Solution (`solution_bruteforce.py`)

**Expected Score: 43/50 (86%)**

Checks all pairs of numbers:

- Time: O(n²)
- Space: O(1)
- Correctness: 40/40
- Performance: 3/10

### Broken Solution (`solution_broken.py`)

**Expected Score: 5/50 (10%)**

Always returns [0, 1] without checking:

- Correctness: 5/40 (only passes when [0,1] is correct)
- Performance: 0/10 (not measured due to failures)

## Testing the Problem

### 1. Register the Problem

```bash
# Via file upload
curl -X POST http://localhost:3000/api/problems \
  -F "package_source=file" \
  -F "file=@sample-problems/two-sum.tar.gz"

# Or via local path (for development)
cd sample-problems
tar -czf two-sum.tar.gz two-sum/
curl -X POST http://localhost:3000/api/problems \
  -F "package_source=file" \
  -F "file=@two-sum.tar.gz"
```

### 2. Submit a Solution

```bash
# Create a test submission directory
mkdir -p /tmp/test-submission
cp sample-problems/two-sum/examples/solution_optimal.py /tmp/test-submission/solution.py

# Package and submit
cd /tmp
tar -czf submission.tar.gz test-submission/
curl -X POST http://localhost:3000/api/submissions \
  -F "package_source=file" \
  -F "problem_id=two-sum" \
  -F "team_id=test-team" \
  -F "file=@submission.tar.gz"
```

### 3. Check Results

```bash
# Get submission status
curl http://localhost:3000/api/submissions/{submission_id}

# Get evaluation results
curl http://localhost:3000/api/results/{submission_id}

# Get detailed logs
curl http://localhost:3000/api/results/{submission_id}/logs
```

## Expected Output

### Optimal Solution Results

```json
{
  "submission_id": "sub_abc123",
  "problem_id": "two-sum",
  "status": "success",
  "rubric_scores": {
    "correctness": {
      "rubric_id": "correctness",
      "score": 40,
      "max_score": 40,
      "percentage": 100,
      "details": {
        "total_tests": 8,
        "passed": 8,
        "failed": 0
      }
    },
    "performance": {
      "rubric_id": "performance",
      "score": 10,
      "max_score": 10,
      "percentage": 100,
      "details": {
        "avg_execution_time_ms": 45,
        "estimated_complexity": "O(n)",
        "rating": "Excellent"
      }
    }
  },
  "total_score": 50,
  "max_score": 50,
  "percentage": 100
}
```

### Brute Force Solution Results

```json
{
  "total_score": 43,
  "max_score": 50,
  "percentage": 86,
  "rubric_scores": {
    "correctness": {
      "score": 40,
      "percentage": 100
    },
    "performance": {
      "score": 3,
      "percentage": 30,
      "details": {
        "avg_execution_time_ms": 3420,
        "estimated_complexity": "O(n²)",
        "rating": "Poor"
      }
    }
  }
}
```

## Creating Your Own Problem

Use this example as a template:

1. **Copy the structure**: `cp -r sample-problems/two-sum sample-problems/my-problem`
2. **Update config.json**: Change problem_id, name, rubrics
3. **Modify Dockerfile**: Add required dependencies
4. **Create test data**: Add your test cases in `data/`
5. **Write hooks**: Implement your evaluation logic
6. **Test locally**: Register and submit test solutions

## Common Issues

### Hook Not Executing

- Check file permissions: `chmod +x hooks/**/*.sh`
- Verify shebang line: `#!/bin/bash`
- Check logs: `curl .../results/{id}/logs`

### Test Cases Failing

- Verify input format matches problem specification
- Check output format (whitespace, newlines)
- Test solution locally: `echo "9 2 7 11 15" | python3 solution.py`

### Performance Timing Off

- Adjust thresholds in `03_test_performance.sh`
- Consider system performance variability
- Use multiple runs and averages

## Advanced Features

### Custom Rubric Types

Extend hooks to support:

- **Binary rubrics**: Pass/fail with threshold
- **Percentage rubrics**: Continuous scoring (0-100%)
- **Custom rubrics**: Complex scoring logic

### Multi-language Support

The pre-hook already detects:

- Python (requirements.txt)
- Node.js (package.json)
- Java (.java files)
- C/C++ (.c, .cpp files)

Add more languages by extending `01_prepare_submission.sh`.

### Integration Testing

For web applications, modify hooks to:

1. Start the submission app in background
2. Wait for health check
3. Run integration tests
4. Stop the app

### Code Quality Checks

Add additional post-hooks for:

- Linting (pylint, eslint)
- Security scanning (bandit, npm audit)
- Code coverage (pytest-cov)
- Complexity analysis (radon)

## Resources

- [Problem API Documentation](../../docs/[API]%20PROBLEM.md)
- [Submission API Documentation](../../docs/[API]%20SUBMISSION.md)
- [Result API Documentation](../../docs/[API]%20RESULT.md)
- [Hook System Guide](../../docker/tools/README.md)
