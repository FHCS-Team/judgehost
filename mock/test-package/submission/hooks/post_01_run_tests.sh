#!/bin/sh
# Post-hook: Run test cases

echo "[POST-HOOK] Running test cases..."

# Load test cases
TEST_CASES_FILE="/data/test_cases.json"

if [ ! -f "$TEST_CASES_FILE" ]; then
  echo "ERROR: test_cases.json not found"
  exit 1
fi

# Run tests using Node.js
node /hooks/test_runner.js

# Check exit code
if [ $? -eq 0 ]; then
  echo "[POST-HOOK] All tests completed"
  exit 0
else
  echo "[POST-HOOK] Tests execution failed"
  exit 1
fi
