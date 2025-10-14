#!/bin/bash

# Script to zip a problem package and register it via the API
# Usage: ./zip-and-add-problem.sh <problem_directory> [problem_id]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
API_BASE_URL="${API_BASE_URL:-http://localhost:3000/api}"

# Check arguments
if [ $# -lt 1 ]; then
  echo "Usage: $0 <problem_directory> [problem_id]"
  echo ""
  echo "Examples:"
  echo "  $0 mock/test-package"
  echo "  $0 sample-problems/two-sum custom-problem-id"
  exit 1
fi

PROBLEM_DIR="$1"
CUSTOM_PROBLEM_ID="$2"

# Validate problem directory exists
if [ ! -d "$PROBLEM_DIR" ]; then
  echo "Error: Problem directory '$PROBLEM_DIR' does not exist"
  exit 1
fi

# Check for required files
if [ ! -f "$PROBLEM_DIR/config.json" ]; then
  echo "Error: config.json not found in '$PROBLEM_DIR'"
  exit 1
fi

if [ ! -f "$PROBLEM_DIR/Dockerfile" ]; then
  echo "Error: Dockerfile not found in '$PROBLEM_DIR'"
  exit 1
fi

# Extract problem_id from config.json or use custom
if [ -n "$CUSTOM_PROBLEM_ID" ]; then
  PROBLEM_ID="$CUSTOM_PROBLEM_ID"
else
  PROBLEM_ID=$(jq -r '.problem_id' "$PROBLEM_DIR/config.json")
  if [ -z "$PROBLEM_ID" ] || [ "$PROBLEM_ID" = "null" ]; then
    echo "Error: Could not extract problem_id from config.json"
    exit 1
  fi
fi

PROBLEM_NAME=$(jq -r '.problem_name // .problem_id' "$PROBLEM_DIR/config.json")

echo "=========================================="
echo "Zipping and Adding Problem Package"
echo "=========================================="
echo "Problem Directory: $PROBLEM_DIR"
echo "Problem ID: $PROBLEM_ID"
echo "Problem Name: $PROBLEM_NAME"
echo "API Base URL: $API_BASE_URL"
echo ""

# Create temporary zip file
TEMP_DIR=$(mktemp -d)
TEMP_ZIP="$TEMP_DIR/${PROBLEM_ID}.zip"

echo "Creating zip file..."
(cd "$PROBLEM_DIR" && zip -r "$TEMP_ZIP" . -x "*.git*" "node_modules/*" ".DS_Store")

echo "Zip file created: $TEMP_ZIP"
echo "Zip file size: $(du -h "$TEMP_ZIP" | cut -f1)"
echo ""

# List contents for verification
echo "Zip contents:"
unzip -l "$TEMP_ZIP" | head -20
echo ""

echo "=========================================="
echo "Sending POST request to API..."
echo "=========================================="
echo ""

# Send POST request
HTTP_CODE=$(curl -s -o "$TEMP_DIR/response.json" -w "%{http_code}" \
  -X POST "$API_BASE_URL/problems" \
  -F "problem_id=$PROBLEM_ID" \
  -F "problem_name=$PROBLEM_NAME" \
  -F "package_type=file" \
  -F "problem_package=@$TEMP_ZIP")

echo "HTTP Status Code: $HTTP_CODE"
echo ""
echo "Response Body:"
cat "$TEMP_DIR/response.json" | jq '.' || cat "$TEMP_DIR/response.json"
echo ""

# Cleanup
rm -rf "$TEMP_DIR"

# Check if request was successful
if [ "$HTTP_CODE" = "201" ]; then
  echo ""
  echo "✓ Problem '$PROBLEM_ID' registered successfully!"
  exit 0
else
  echo ""
  echo "✗ Problem registration failed with status $HTTP_CODE"
  exit 1
fi
