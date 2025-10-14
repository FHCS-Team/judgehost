#!/bin/bash
# Post-hook: Code quality check for REST API

echo "=== Post-Hook: Code Quality Analysis ==="

WORKSPACE="/workspace"
OUTPUT_DIR="/out"

# Initialize results
SCORE=20
FEEDBACK="Code quality check completed"
ISSUES_FOUND=0

# Check for JavaScript files
if [ -d "$WORKSPACE" ] && ls $WORKSPACE/**/*.js 1> /dev/null 2>&1; then
  echo "Running ESLint on JavaScript files..."
  
  # Create .eslintrc.json
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
    "no-console": "off",
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}
EOF

  # Run eslint
  cd $WORKSPACE
  ESLINT_OUTPUT=$(eslint -c /tmp/.eslintrc.json . --format json 2>&1 || true)
  
  # Count issues
  if echo "$ESLINT_OUTPUT" | grep -q "errorCount"; then
    ERRORS=$(echo "$ESLINT_OUTPUT" | grep -o '"errorCount":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    WARNINGS=$(echo "$ESLINT_OUTPUT" | grep -o '"warningCount":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    ISSUES_FOUND=$((ERRORS + WARNINGS))
    
    echo "Found $ERRORS errors and $WARNINGS warnings"
    
    # Deduct points: errors worth 3 points, warnings worth 1 point
    DEDUCTION=$((ERRORS * 3 + WARNINGS * 1))
    if [ $DEDUCTION -gt 20 ]; then
      DEDUCTION=20
    fi
    SCORE=$((20 - DEDUCTION))
    
    if [ $ISSUES_FOUND -gt 0 ]; then
      FEEDBACK="Found $ERRORS errors and $WARNINGS warnings"
    fi
  fi
fi

echo "Code Quality Score: $SCORE/20"

# Create output directory
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
