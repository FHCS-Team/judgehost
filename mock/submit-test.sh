#!/bin/bash

# Script to create and submit a test submission
# Usage: ./submit-test.sh <problem_id>

set -e

API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"
PROBLEM_ID="${1:-test-package}"

echo "=========================================="
echo "Creating and Submitting Test Submission"
echo "=========================================="
echo "Problem ID: $PROBLEM_ID"
echo "API Base URL: $API_BASE_URL"
echo ""

# Create a temporary submission file
TEMP_DIR=$(mktemp -d)
SUBMISSION_FILE="$TEMP_DIR/submission.tar.gz"

# Create a simple submission
echo "Creating test submission..."
cat > "$TEMP_DIR/solution.sh" <<'EOF'
#!/bin/bash
echo "Hello from test submission"
exit 0
EOF

chmod +x "$TEMP_DIR/solution.sh"

# Package it
(cd "$TEMP_DIR" && tar -czf submission.tar.gz solution.sh)

echo "Submission created: $SUBMISSION_FILE"
echo ""

# Generate a unique submission ID
SUBMISSION_ID="test-sub-$(date +%s)"

echo "=========================================="
echo "Submitting to API..."
echo "=========================================="
echo "Submission ID: $SUBMISSION_ID"
echo ""

# Submit via API
HTTP_CODE=$(curl -s -o "$TEMP_DIR/response.json" -w "%{http_code}" \
  -X POST "$API_BASE_URL/submissions" \
  -F "problem_id=$PROBLEM_ID" \
  -F "package_type=file" \
  -F "submission_file=@$SUBMISSION_FILE" \
  -F "team_id=test-team" \
  -F "submission_metadata={\"test\":true}")

echo "HTTP Status Code: $HTTP_CODE"
echo ""
echo "Response Body:"
cat "$TEMP_DIR/response.json" | jq '.' || cat "$TEMP_DIR/response.json"
echo ""

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
  SUBMISSION_ID=$(cat "$TEMP_DIR/response.json" | jq -r '.data.submission_id // .data.submissionId')
  echo ""
  echo "✓ Submission created: $SUBMISSION_ID"
  echo ""
  echo "Check status with:"
  echo "  curl $API_BASE_URL/submissions/$SUBMISSION_ID | jq '.'"
  
  # Cleanup
  rm -rf "$TEMP_DIR"
  exit 0
else
  echo ""
  echo "✗ Submission failed with status $HTTP_CODE"
  rm -rf "$TEMP_DIR"
  exit 1
fi
