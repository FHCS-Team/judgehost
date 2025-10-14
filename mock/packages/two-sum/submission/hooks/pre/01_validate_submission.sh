#!/bin/bash
# Pre-hook: Validate submission structure

echo "=== Pre-Hook: Validating submission structure ==="

# Check if workspace exists
if [ ! -d "/workspace" ]; then
  echo "ERROR: /workspace directory not found"
  exit 1
fi

# Check for solution file
if ls /workspace/*.js 1> /dev/null 2>&1; then
  echo "✓ Found JavaScript solution file"
elif ls /workspace/*.py 1> /dev/null 2>&1; then
  echo "✓ Found Python solution file"
else
  echo "ERROR: No solution file found (.js or .py required)"
  exit 1
fi

echo "✓ Submission structure validated"
exit 0
