#!/bin/bash
# Post-hook: Code quality check

echo "=== Post-Hook: Code Quality Analysis ==="

WORKSPACE="/workspace"
OUTPUT_DIR="/out"

# Initialize results
SCORE=20
FEEDBACK="Code quality check completed"
ISSUES_FOUND=0

# Check for JavaScript files
if ls $WORKSPACE/*.js 1> /dev/null 2>&1; then
  echo "Running ESLint on JavaScript files..."
  
  # Create .eslintrc.json if not exists
  cat > /tmp/.eslintrc.json << 'EOF'
{
  "env": {
    "node": true,
    "es2021": true
  },
  "extends": "eslint:recommended",
  "parserOptions": {
    "ecmaVersion": 12
  },
  "rules": {
    "no-unused-vars": "warn",
    "no-console": "off"
  }
}
EOF

  # Run eslint (ignore exit code, we just collect issues)
  ESLINT_OUTPUT=$(eslint -c /tmp/.eslintrc.json $WORKSPACE/*.js --format json 2>&1 || true)
  
  # Count issues
  if echo "$ESLINT_OUTPUT" | grep -q "errorCount"; then
    ISSUES_FOUND=$(echo "$ESLINT_OUTPUT" | grep -o '"errorCount":[0-9]*' | head -1 | grep -o '[0-9]*')
    echo "Found $ISSUES_FOUND code quality issues"
    
    # Deduct points (max 20 points, deduct 2 per issue)
    DEDUCTION=$((ISSUES_FOUND * 2))
    if [ $DEDUCTION -gt 20 ]; then
      DEDUCTION=20
    fi
    SCORE=$((20 - DEDUCTION))
    
    if [ $ISSUES_FOUND -gt 0 ]; then
      FEEDBACK="Found $ISSUES_FOUND code quality issues"
    fi
  fi
fi

# Check for Python files
if ls $WORKSPACE/*.py 1> /dev/null 2>&1; then
  echo "Running Pylint on Python files..."
  
  # Run pylint (ignore exit code)
  PYLINT_OUTPUT=$(pylint $WORKSPACE/*.py --output-format=json 2>&1 || true)
  
  # Count issues (simplified)
  if echo "$PYLINT_OUTPUT" | grep -q "message"; then
    ISSUES=$(echo "$PYLINT_OUTPUT" | grep -c "message" || echo "0")
    ISSUES_FOUND=$((ISSUES_FOUND + ISSUES))
    echo "Found $ISSUES code quality issues in Python"
    
    DEDUCTION=$((ISSUES * 2))
    if [ $DEDUCTION -gt 20 ]; then
      DEDUCTION=20
    fi
    SCORE=$((20 - DEDUCTION))
    
    FEEDBACK="Found $ISSUES_FOUND code quality issues"
  fi
fi

echo "Code Quality Score: $SCORE/20"

# Create output directory if not exists
mkdir -p $OUTPUT_DIR

# Write rubric output
cat > $OUTPUT_DIR/rubric_code_quality.json << EOF
{
  "rubric_id": "code_quality",
  "status": "DONE",
  "score": $SCORE,
  "max_score": 20,
  "feedback": "$FEEDBACK",
  "details": {
    "issues_found": $ISSUES_FOUND,
    "deduction": $((20 - SCORE))
  }
}
EOF

echo "✓ Code quality results written to /out/rubric_code_quality.json"
exit 0
