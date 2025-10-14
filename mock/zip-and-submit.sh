#!/bin/bash

# Script to package and submit a submission
# Usage: ./zip-and-submit.sh <submission_directory> <problem_id> [team_id]

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
SUBMISSION_DIR="${1}"
PROBLEM_ID="${2}"
TEAM_ID="${3:-test-team}"

if [ $# -lt 2 ]; then
  echo "Usage: $0 <submission_directory> <problem_id> [team_id]"
  echo ""
  echo "Examples:"
  echo "  $0 mock/test-submission nodejs-api"
  echo "  $0 my-solution nodejs-api my-team"
  exit 1
fi

# Validate submission directory exists
if [ ! -d "$SUBMISSION_DIR" ]; then
  echo "Error: Submission directory '$SUBMISSION_DIR' does not exist"
  exit 1
fi

echo "=========================================="
echo "Packaging and Submitting Code"
echo "=========================================="
echo "Submission Directory: $SUBMISSION_DIR"
echo "Problem ID: $PROBLEM_ID"
echo "Team ID: $TEAM_ID"
echo "API Base URL: $API_BASE_URL"
echo ""

# Create temporary submission package
TEMP_DIR=$(mktemp -d)
SUBMISSION_PACKAGE="$TEMP_DIR/submission.tar.gz"

echo "Creating submission package..."
(cd "$SUBMISSION_DIR" && tar --exclude="node_modules" --exclude=".git*" --exclude=".DS_Store" -czf "$SUBMISSION_PACKAGE" .)

echo "Package created: $SUBMISSION_PACKAGE"
echo "Package size: $(du -h "$SUBMISSION_PACKAGE" | cut -f1)"
echo ""

# List contents for verification
echo "Package contents:"
tar -tzf "$SUBMISSION_PACKAGE" | head -20
echo ""

echo "=========================================="
echo "Submitting to API..."
echo "=========================================="
echo ""

# Submit via API
HTTP_CODE=$(curl -s -o "$TEMP_DIR/response.json" -w "%{http_code}" \
  -X POST "$API_BASE_URL/submissions" \
  -F "problem_id=$PROBLEM_ID" \
  -F "package_type=file" \
  -F "submission_file=@$SUBMISSION_PACKAGE" \
  -F "team_id=$TEAM_ID" \
  -F "submission_metadata={\"source\":\"cli\"}")

echo "HTTP Status Code: $HTTP_CODE"
echo ""
echo "Response Body:"
cat "$TEMP_DIR/response.json" | jq '.' || cat "$TEMP_DIR/response.json"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  SUBMISSION_ID=$(cat "$TEMP_DIR/response.json" | jq -r '.data.submission_id // .data.submissionId // .data.job_id')
  echo ""
  echo "✓ Submission created: $SUBMISSION_ID"
  echo ""
  echo "Check status with:"
  echo "  curl $API_BASE_URL/submissions/$SUBMISSION_ID | jq '.'"
  echo ""
  echo "Waiting for evaluation to complete..."
  sleep 5
  
  # Check final status
  curl -s "$API_BASE_URL/submissions/$SUBMISSION_ID" | jq '.data | {status, evaluation_status: .result.evaluation_status, totalScore: .result.totalScore, maxScore: .result.maxScore}'
  
  # Cleanup
  rm -rf "$TEMP_DIR"
  exit 0
else
  echo ""
  echo "✗ Submission failed with status $HTTP_CODE"
  rm -rf "$TEMP_DIR"
  exit 1
fi
