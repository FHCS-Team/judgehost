#!/bin/sh
# Post-hook: Check code quality

echo "[POST-HOOK] Checking code quality..."

# Simple code quality checks
SCORE=20
FEEDBACK=""

# Check if code uses strict mode
if grep -q "'use strict'" /workspace/index.js || grep -q '"use strict"' /workspace/index.js; then
  FEEDBACK="$FEEDBACK\n- Uses strict mode: Good practice"
else
  SCORE=$((SCORE - 5))
  FEEDBACK="$FEEDBACK\n- Missing strict mode: -5 points"
fi

# Check if code has comments
if grep -q "//" /workspace/index.js || grep -q "/\*" /workspace/index.js; then
  FEEDBACK="$FEEDBACK\n- Has comments: Good documentation"
else
  SCORE=$((SCORE - 3))
  FEEDBACK="$FEEDBACK\n- No comments found: -3 points"
fi

# Check for proper function naming (not using 'var')
if grep -q "var " /workspace/index.js; then
  SCORE=$((SCORE - 5))
  FEEDBACK="$FEEDBACK\n- Uses 'var' instead of 'const'/'let': -5 points"
fi

# Create rubric output
cat > /out/rubric_rubric_2_code_quality.json << EOF
{
  "rubric_id": "rubric_2_code_quality",
  "score": $SCORE,
  "max_score": 20,
  "status": "DONE",
  "feedback": "Code Quality Analysis:$FEEDBACK",
  "details": {
    "checks_performed": ["strict_mode", "comments", "variable_declaration"]
  }
}
EOF

echo "[POST-HOOK] Code quality check completed. Score: $SCORE/20"
exit 0
