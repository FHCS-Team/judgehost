#!/bin/bash
# Post-hook: Security scan

echo "=== Post-Hook: Security Scan ==="

WORKSPACE="/workspace"
OUTPUT_DIR="/out"

# Initialize results
SCORE=20
FEEDBACK="No security issues found"
ISSUES_FOUND=0
CRITICAL=0
HIGH=0
MEDIUM=0
LOW=0

# Check for package.json and run npm audit
if [ -f "$WORKSPACE/package.json" ]; then
  echo "Running npm audit..."
  cd $WORKSPACE
  
  # Install dependencies if needed
  if [ ! -d "node_modules" ]; then
    npm install --silent > /dev/null 2>&1 || true
  fi
  
  # Run npm audit
  AUDIT_OUTPUT=$(npm audit --json 2>&1 || true)
  
  if echo "$AUDIT_OUTPUT" | grep -q "vulnerabilities"; then
    # Parse vulnerabilities
    CRITICAL=$(echo "$AUDIT_OUTPUT" | grep -o '"critical":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    HIGH=$(echo "$AUDIT_OUTPUT" | grep -o '"high":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    MEDIUM=$(echo "$AUDIT_OUTPUT" | grep -o '"moderate":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    LOW=$(echo "$AUDIT_OUTPUT" | grep -o '"low":[0-9]*' | head -1 | grep -o '[0-9]*' || echo "0")
    
    ISSUES_FOUND=$((CRITICAL + HIGH + MEDIUM + LOW))
    
    if [ $ISSUES_FOUND -gt 0 ]; then
      echo "Found $ISSUES_FOUND vulnerabilities: $CRITICAL critical, $HIGH high, $MEDIUM medium, $LOW low"
      
      # Deduct points based on severity
      DEDUCTION=$((CRITICAL * 10 + HIGH * 5 + MEDIUM * 2 + LOW * 1))
      if [ $DEDUCTION -gt 20 ]; then
        DEDUCTION=20
      fi
      SCORE=$((20 - DEDUCTION))
      
      FEEDBACK="Found $ISSUES_FOUND vulnerabilities ($CRITICAL critical, $HIGH high)"
    fi
  fi
fi

# Check for common security issues in code
if [ -d "$WORKSPACE" ]; then
  echo "Checking for common security issues..."
  
  # Check for hardcoded secrets/passwords
  if grep -r -i "password.*=.*['\"]" $WORKSPACE 2>/dev/null | grep -v node_modules | grep -v ".json" | grep -q .; then
    echo "WARNING: Possible hardcoded passwords found"
    SCORE=$((SCORE - 5))
    FEEDBACK="$FEEDBACK. Hardcoded passwords detected"
  fi
  
  # Check for eval() usage
  if grep -r "eval(" $WORKSPACE 2>/dev/null | grep -v node_modules | grep -q .; then
    echo "WARNING: eval() usage detected"
    SCORE=$((SCORE - 3))
    FEEDBACK="$FEEDBACK. Dangerous eval() usage"
  fi
fi

# Ensure score doesn't go below 0
if [ $SCORE -lt 0 ]; then
  SCORE=0
fi

echo "Security Score: $SCORE/20"

# Create output directory
mkdir -p $OUTPUT_DIR

# Write rubric output
cat > $OUTPUT_DIR/rubric_security.json << EOF
{
  "rubric_id": "security",
  "status": "DONE",
  "score": $SCORE,
  "max_score": 20,
  "feedback": "$FEEDBACK",
  "details": {
    "vulnerabilities": {
      "critical": $CRITICAL,
      "high": $HIGH,
      "medium": $MEDIUM,
      "low": $LOW,
      "total": $ISSUES_FOUND
    },
    "deduction": $((20 - SCORE))
  }
}
EOF

echo "✓ Security scan results written to /out/rubric_security.json"
exit 0
