# Guide: Writing Evaluation Hooks

This guide explains how to write custom evaluation hooks for the judgehost system.

**Related Documentation**:

- [`[SPEC] RUBRIC_TYPES.md`](%5BSPEC%5D%20RUBRIC_TYPES.md) - Output format for rubric scores
- [`[SPEC] CONTAINER_ARCHITECTURE.md`](%5BSPEC%5D%20CONTAINER_ARCHITECTURE.md) - Container environment
- [`[API] PROBLEM.md`](%5BAPI%5D%20PROBLEM.md) - Problem package structure

---

## Overview

Hooks are executable scripts that run at different stages of the evaluation lifecycle:

- **Pre-execution hooks** (`hooks/pre/`) - Setup and preparation before submission runs
- **Post-execution hooks** (`hooks/post/`) - Testing and evaluation after submission starts
- **Periodic hooks** (`hooks/periodic/`) - Continuous monitoring during evaluation

All hooks run inside the evaluation container and have access to:

- Problem resources (`/problem/`)
- Submission code (`/workspace/`)
- Output directory (`/out/`)
- Utilities (`/utils/`)

---

## Hook Execution Environment

### Directory Structure

```
/ (Container Root)
├── problem/          # Problem resources (read-only)
│   ├── data/         # Test data
│   └── resources/    # Additional resources
├── workspace/        # Submission code (read-only during post-execution)
├── hooks/            # Hook scripts
│   ├── pre/
│   ├── post/
│   └── periodic/
├── out/              # Output directory (write results here)
│   ├── logs/         # Log files
│   └── rubric_*.json # Rubric evaluation results
├── utils/            # Utility scripts provided by judgehost
└── tmp/              # Temporary storage
```

### Environment Variables

Hooks have access to the following environment variables:

```bash
# Problem Information
PROBLEM_ID               # Problem identifier (e.g., "rest-api-users")
PROBLEM_TYPE             # Project type (e.g., "web_api", "algorithm")
PROBLEM_VERSION          # Problem version (e.g., "1.2.0")

# Submission Information
SUBMISSION_ID            # Unique submission identifier
TEAM_ID                  # Team identifier (if provided)

# Resource Limits
MEMORY_LIMIT_MB          # Memory limit in megabytes
CPU_LIMIT_CORES          # CPU core limit
TIMEOUT_SECONDS          # Evaluation timeout

# Paths
PROBLEM_DIR              # /problem
WORKSPACE_DIR            # /workspace
OUTPUT_DIR               # /out
HOOKS_DIR                # /hooks
UTILS_DIR                # /utils

# Network
NETWORK_ENABLED          # "true" or "false"
SUBMISSION_HOST          # Hostname/IP of submission service (if running)
SUBMISSION_PORT          # Port of submission service (if applicable)

# Hook Context
HOOK_TYPE                # "pre", "post", or "periodic"
HOOK_NAME                # Name of the current hook script
HOOK_TIMEOUT             # Timeout for this hook in seconds
```

---

## Hook Types

### Pre-Execution Hooks

**Purpose**: Setup environment, install dependencies, prepare data

**When they run**: Before submission application starts

**Common use cases**:

- Install submission dependencies
- Setup databases or test fixtures
- Validate submission structure
- Prepare test environment

**Example**: `hooks/pre/01_install_dependencies.sh`

```bash
#!/bin/bash
set -e

cd "$WORKSPACE_DIR"

echo "Installing dependencies..."

if [ -f package.json ]; then
    echo "Found Node.js project"
    npm ci --production
elif [ -f requirements.txt ]; then
    echo "Found Python project"
    pip install -r requirements.txt
elif [ -f Gemfile ]; then
    echo "Found Ruby project"
    bundle install
else
    echo "No dependency file found, skipping installation"
fi

echo "Dependencies installed successfully"
exit 0
```

**Exit codes**:

- `0` - Success, continue evaluation
- `1-255` - Error, abort evaluation

---

### Post-Execution Hooks

**Purpose**: Test and evaluate the running submission

**When they run**: After submission application has started

**Common use cases**:

- Run API tests
- Execute functional tests
- Perform security scans
- Measure performance metrics
- Generate rubric scores

**Example**: `hooks/post/test_api_endpoints.py`

```python
#!/usr/bin/env python3
import os
import json
import requests
import sys

# Configuration
OUTPUT_DIR = os.environ['OUTPUT_DIR']
SUBMISSION_HOST = os.environ.get('SUBMISSION_HOST', 'localhost')
SUBMISSION_PORT = os.environ.get('SUBMISSION_PORT', '3000')
BASE_URL = f"http://{SUBMISSION_HOST}:{SUBMISSION_PORT}"

def test_endpoints():
    """Test API endpoints and return results"""

    results = {
        "total": 0,
        "passed": 0,
        "failed": 0,
        "skipped": 0,
        "endpoints": []
    }

    # Test 1: GET /users
    results["total"] += 1
    try:
        response = requests.get(f"{BASE_URL}/api/users", timeout=5)
        if response.status_code == 200:
            results["passed"] += 1
            results["endpoints"].append({
                "method": "GET",
                "path": "/api/users",
                "status": "passed",
                "status_code_expected": 200,
                "status_code_actual": response.status_code,
                "response_time_ms": int(response.elapsed.total_seconds() * 1000)
            })
        else:
            results["failed"] += 1
            results["endpoints"].append({
                "method": "GET",
                "path": "/api/users",
                "status": "failed",
                "status_code_expected": 200,
                "status_code_actual": response.status_code,
                "message": f"Expected 200, got {response.status_code}"
            })
    except Exception as e:
        results["failed"] += 1
        results["endpoints"].append({
            "method": "GET",
            "path": "/api/users",
            "status": "failed",
            "message": str(e)
        })

    # Test 2: POST /users
    results["total"] += 1
    try:
        payload = {"name": "Test User", "email": "test@example.com"}
        response = requests.post(f"{BASE_URL}/api/users", json=payload, timeout=5)
        if response.status_code == 201:
            results["passed"] += 1
            results["endpoints"].append({
                "method": "POST",
                "path": "/api/users",
                "status": "passed",
                "status_code_expected": 201,
                "status_code_actual": response.status_code,
                "response_time_ms": int(response.elapsed.total_seconds() * 1000)
            })
        else:
            results["failed"] += 1
            results["endpoints"].append({
                "method": "POST",
                "path": "/api/users",
                "status": "failed",
                "status_code_expected": 201,
                "status_code_actual": response.status_code
            })
    except Exception as e:
        results["failed"] += 1
        results["endpoints"].append({
            "method": "POST",
            "path": "/api/users",
            "status": "failed",
            "message": str(e)
        })

    return results

def calculate_score(results, max_score):
    """Calculate score based on test results"""
    if results["total"] == 0:
        return 0

    percentage = (results["passed"] / results["total"]) * 100
    score = (percentage / 100) * max_score
    return round(score, 2)

def main():
    print("Testing API endpoints...")

    # Run tests
    test_results = test_endpoints()

    # Calculate score (assuming max_score of 40 for this rubric)
    max_score = 40
    score = calculate_score(test_results, max_score)

    # Determine status
    if test_results["failed"] == 0:
        status = "passed"
    elif test_results["passed"] > 0:
        status = "partial"
    else:
        status = "failed"

    # Build rubric output
    rubric_output = {
        "rubric_id": "api_correctness",
        "rubric_name": "API Correctness",
        "rubric_type": "api_endpoints",
        "score": score,
        "max_score": max_score,
        "percentage": round((score / max_score) * 100, 2),
        "status": status,
        "details": test_results,
        "feedback": f"Passed {test_results['passed']}/{test_results['total']} endpoint tests"
    }

    # Write rubric output
    output_path = os.path.join(OUTPUT_DIR, "rubric_api_correctness.json")
    with open(output_path, 'w') as f:
        json.dump(rubric_output, f, indent=2)

    print(f"Rubric output written to {output_path}")
    print(f"Score: {score}/{max_score}")

    # Exit with success
    sys.exit(0)

if __name__ == "__main__":
    main()
```

**Rubric Output Format**:

Post-execution hooks that evaluate rubrics must write JSON files to:

```
/out/rubric_<rubric_id>.json
```

Format:

```json
{
  "rubric_id": "string (must match config.json)",
  "rubric_name": "string",
  "rubric_type": "string (see RUBRIC_TYPES.md)",
  "score": "number",
  "max_score": "number",
  "percentage": "number",
  "status": "passed | partial | failed | skipped",
  "details": {
    // Structure varies by rubric_type
  },
  "feedback": "string (optional)"
}
```

**Exit codes**:

- `0` - Hook completed successfully
- `1-255` - Hook failed (does not necessarily fail evaluation)

---

### Periodic Hooks

**Purpose**: Monitor submission during execution

**When they run**: At regular intervals (configurable in `config.json`)

**Common use cases**:

- Monitor resource usage
- Check application health
- Collect performance metrics
- Detect anomalies

**Example**: `hooks/periodic/monitor_resources.sh`

```bash
#!/bin/bash

# Get container resource usage
MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)
MEMORY_LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)
MEMORY_PCT=$(awk "BEGIN {printf \"%.2f\", ($MEMORY_USAGE/$MEMORY_LIMIT)*100}")

CPU_USAGE=$(cat /sys/fs/cgroup/cpuacct/cpuacct.usage)

# Write metrics
METRICS_FILE="$OUTPUT_DIR/logs/resource_metrics.jsonl"
echo "{\"timestamp\": $(date +%s), \"memory_bytes\": $MEMORY_USAGE, \"memory_pct\": $MEMORY_PCT, \"cpu_ns\": $CPU_USAGE}" >> "$METRICS_FILE"

exit 0
```

**Exit codes**:

- `0` - Continue monitoring
- `1-255` - Stop monitoring (does not fail evaluation)

---

## Hook Best Practices

### 1. Use Shebang

Always specify the interpreter:

```bash
#!/bin/bash
#!/usr/bin/env python3
#!/usr/bin/env node
```

### 2. Set Executable Permissions

In your problem package:

```bash
chmod +x hooks/pre/*.sh
chmod +x hooks/post/*.py
chmod +x hooks/periodic/*.sh
```

### 3. Handle Errors Gracefully

```bash
set -e  # Exit on error (for bash)

# Or handle errors explicitly
if ! command_that_might_fail; then
    echo "Error: Command failed" >&2
    exit 1
fi
```

### 4. Use Timeouts

Prevent hooks from running indefinitely:

```python
import requests

response = requests.get(url, timeout=5)  # 5 second timeout
```

### 5. Write Clear Output

Help with debugging:

```bash
echo "Installing dependencies..."
npm ci
echo "Dependencies installed successfully"
```

### 6. Validate Inputs

Check for required files/conditions:

```bash
if [ ! -f "$WORKSPACE_DIR/package.json" ]; then
    echo "Error: package.json not found" >&2
    exit 1
fi
```

### 7. Clean Up Resources

```python
import tempfile
import os

# Use context managers for cleanup
with tempfile.TemporaryDirectory() as tmpdir:
    # Use tmpdir
    pass  # Automatically cleaned up
```

---

## Testing Hooks Locally

### 1. Simulate Environment

```bash
export PROBLEM_ID="test-problem"
export PROBLEM_TYPE="web_api"
export WORKSPACE_DIR="/path/to/submission"
export OUTPUT_DIR="/tmp/test-output"
export SUBMISSION_HOST="localhost"
export SUBMISSION_PORT="3000"

mkdir -p "$OUTPUT_DIR"
```

### 2. Run Hook

```bash
cd /path/to/problem-package
./hooks/post/test_api_endpoints.py
```

### 3. Verify Output

```bash
cat "$OUTPUT_DIR/rubric_api_correctness.json"
```

---

## Common Patterns

### Pattern 1: Wait for Service to Start

```bash
#!/bin/bash
set -e

echo "Waiting for service to start..."

MAX_ATTEMPTS=30
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
    if curl -f "http://$SUBMISSION_HOST:$SUBMISSION_PORT/health" &> /dev/null; then
        echo "Service is ready"
        exit 0
    fi

    ATTEMPT=$((ATTEMPT + 1))
    echo "Attempt $ATTEMPT/$MAX_ATTEMPTS..."
    sleep 1
done

echo "Error: Service did not start within timeout" >&2
exit 1
```

### Pattern 2: Load Test Data

```bash
#!/bin/bash
set -e

echo "Loading test data..."

# Copy test data to workspace
cp -r "$PROBLEM_DIR/data/test_dataset.json" "$WORKSPACE_DIR/data/"

# Or seed database
psql -h localhost -U testuser -d testdb -f "$PROBLEM_DIR/data/seed.sql"

echo "Test data loaded"
exit 0
```

### Pattern 3: Aggregate Multiple Test Results

```python
#!/usr/bin/env python3
import json
import os
import glob

OUTPUT_DIR = os.environ['OUTPUT_DIR']

# Collect all test results
test_files = glob.glob(f"{OUTPUT_DIR}/logs/test_*.json")

total_passed = 0
total_failed = 0

for test_file in test_files:
    with open(test_file) as f:
        result = json.load(f)
        total_passed += result.get('passed', 0)
        total_failed += result.get('failed', 0)

# Calculate final rubric
max_score = 30
total_tests = total_passed + total_failed
score = (total_passed / total_tests) * max_score if total_tests > 0 else 0

rubric = {
    "rubric_id": "functional_tests",
    "rubric_name": "Functional Tests",
    "rubric_type": "test_cases",
    "score": round(score, 2),
    "max_score": max_score,
    "percentage": round((score / max_score) * 100, 2),
    "status": "passed" if total_failed == 0 else "partial",
    "details": {
        "total": total_tests,
        "passed": total_passed,
        "failed": total_failed,
        "skipped": 0
    }
}

with open(f"{OUTPUT_DIR}/rubric_functional_tests.json", 'w') as f:
    json.dump(rubric, f, indent=2)
```

---

## Troubleshooting

### Hook Not Executing

**Check**:

1. File has executable permissions (`chmod +x hook.sh`)
2. Shebang line is correct (`#!/bin/bash`)
3. Interpreter is available in container
4. Hook name follows naming convention

### Hook Timing Out

**Solutions**:

1. Increase `hook_timeout_seconds` in `config.json`
2. Optimize hook script
3. Use async operations where possible
4. Break into multiple smaller hooks

### Cannot Connect to Submission

**Check**:

1. Submission application is running
2. Correct host/port (use `$SUBMISSION_HOST` and `$SUBMISSION_PORT`)
3. Add wait logic before testing
4. Check firewall/network settings

### Rubric Not Showing Up

**Check**:

1. Output file name matches pattern: `rubric_<rubric_id>.json`
2. JSON is valid
3. `rubric_id` matches value in `config.json`
4. File is written to `$OUTPUT_DIR`

---

## Advanced Topics

### Custom Utility Scripts

You can include utility scripts in your problem package:

```
problem-package/
├── hooks/
├── utils/
│   ├── common_test.sh
│   └── api_client.py
```

Use in hooks:

```bash
source "$PROBLEM_DIR/utils/common_test.sh"
```

### Multi-Language Projects

Detect and handle multiple languages:

```bash
#!/bin/bash

if [ -f "$WORKSPACE_DIR/package.json" ]; then
    npm ci
fi

if [ -f "$WORKSPACE_DIR/requirements.txt" ]; then
    pip install -r requirements.txt
fi

if [ -f "$WORKSPACE_DIR/pom.xml" ]; then
    mvn install -DskipTests
fi
```

### Conditional Rubrics

Skip rubrics based on submission type:

```python
if not os.path.exists(f"{WORKSPACE_DIR}/security_config.json"):
    # Skip security rubric
    rubric = {
        "rubric_id": "security",
        "status": "skipped",
        "score": 0,
        "max_score": 10,
        "feedback": "Security configuration not provided"
    }
```

---

## Examples Repository

For more hook examples, see the [problem-examples](../sample-problems/) directory in this repository.
