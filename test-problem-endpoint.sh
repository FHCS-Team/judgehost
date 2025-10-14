#!/bin/bash

# Test script for POST /api/problems endpoint
# Usage: ./test-problem-endpoint.sh <problem_file>

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
PROBLEM_FILE="${1}"

if [ -z "$PROBLEM_FILE" ]; then
  echo "Usage: $0 <problem_file>"
  echo "Example: $0 mock/packages/blank-problem.zip"
  exit 1
fi

if [ ! -f "$PROBLEM_FILE" ]; then
  echo "Error: File '$PROBLEM_FILE' not found"
  exit 1
fi

echo "=========================================="
echo "Testing POST /api/problems endpoint"
echo "=========================================="
echo "API Base URL: $API_BASE_URL"
echo "Problem File: $PROBLEM_FILE"
echo ""

# Extract filename for problem_id
FILENAME=$(basename "$PROBLEM_FILE")
# Handle compound extensions like .tar.gz, .tar.bz2, etc.
if [[ "$FILENAME" =~ \.tar\.(gz|bz2|xz)$ ]]; then
  PROBLEM_ID="test-${FILENAME%.tar.*}"
else
  PROBLEM_ID="test-${FILENAME%.*}"
fi
PROBLEM_NAME="Test Problem - ${FILENAME}"

echo "Problem ID: $PROBLEM_ID"
echo "Problem Name: $PROBLEM_NAME"
echo ""
echo "=========================================="
echo "Sending POST request..."
echo "=========================================="
echo ""

# Send POST request
HTTP_CODE=$(curl -s -o response.json -w "%{http_code}" \
  -X POST "$API_BASE_URL/problems" \
  -F "problem_id=$PROBLEM_ID" \
  -F "problem_name=$PROBLEM_NAME" \
  -F "package_type=file" \
  -F "problem_package=@$PROBLEM_FILE")

echo "HTTP Status Code: $HTTP_CODE"
echo ""
echo "Response Body:"
cat response.json | jq '.' || cat response.json
echo ""

# Cleanup
rm -f response.json

# Check if request was successful
if [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "✓ Problem registered successfully"
  exit 0
else
  echo ""
  echo "✗ Problem registration failed"
  exit 1
fi
