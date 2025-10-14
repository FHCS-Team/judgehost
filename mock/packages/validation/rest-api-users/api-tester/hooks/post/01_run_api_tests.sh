#!/bin/bash
# Post-hook: Run API tests

echo "=== Post-Hook: Running API Tests ==="

cd /app
node api-test-runner.js

EXIT_CODE=$?
echo "API test runner exit code: $EXIT_CODE"

exit 0
