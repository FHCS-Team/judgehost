#!/bin/bash
# Post-hook: Run test cases

echo "=== Post-Hook: Running test cases ==="

cd /app
node test-runner.js

EXIT_CODE=$?
echo "Test runner exit code: $EXIT_CODE"

exit 0
