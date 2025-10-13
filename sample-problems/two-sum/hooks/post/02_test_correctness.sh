#!/bin/bash
# priority: 20
# Post-hook: Run test cases and evaluate correctness

set -e

echo "[POST] Running correctness tests..."

TEST_CASES="$PROBLEM_DIR/data/test_cases.json"
SUBMISSION_DIR="${SUBMISSION_DIR:-/workspace/submission}"
TEMP_DIR="/tmp/judgehost"
RESULTS_FILE="$TEMP_DIR/test_results.json"

mkdir -p "$TEMP_DIR"

# Detect submission file and execution command
detect_submission_command() {
    if [ -f "$SUBMISSION_DIR/solution.py" ]; then
        echo "python3 $SUBMISSION_DIR/solution.py"
    elif [ -f "$SUBMISSION_DIR/solution.js" ]; then
        echo "node $SUBMISSION_DIR/solution.js"
    elif [ -f "$SUBMISSION_DIR/solution" ]; then
        echo "$SUBMISSION_DIR/solution"
    elif [ -f "$SUBMISSION_DIR/solution.sh" ]; then
        echo "bash $SUBMISSION_DIR/solution.sh"
    elif [ -f "$SUBMISSION_DIR/Solution.class" ]; then
        echo "java -cp $SUBMISSION_DIR Solution"
    else
        echo "[POST ERROR] No solution file found"
        exit 1
    fi
}

SOLUTION_CMD=$(detect_submission_command)
echo "[POST] Using command: $SOLUTION_CMD"

# Initialize counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Parse test cases and run them
TEST_COUNT=$(jq length "$TEST_CASES")
TOTAL_TESTS=$TEST_COUNT

echo "[POST] Running $TEST_COUNT test cases..."

for i in $(seq 0 $((TEST_COUNT - 1))); do
    TEST_NAME=$(jq -r ".[$i].name" "$TEST_CASES")
    TEST_INPUT=$(jq -r ".[$i].input" "$TEST_CASES")
    EXPECTED_OUTPUT=$(jq -r ".[$i].expected" "$TEST_CASES")
    
    echo "[POST] Test $((i + 1))/$TEST_COUNT: $TEST_NAME"
    
    # Run solution with timeout
    ACTUAL_OUTPUT=$(echo "$TEST_INPUT" | timeout 5s bash -c "$SOLUTION_CMD" 2>/dev/null | tr -d '\n' | tr -s ' ')
    EXPECTED_NORMALIZED=$(echo "$EXPECTED_OUTPUT" | tr -d '\n' | tr -s ' ')
    
    # Compare output (normalize whitespace)
    if [ "$ACTUAL_OUTPUT" = "$EXPECTED_NORMALIZED" ]; then
        echo "[POST]   ✓ PASS"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo "[POST]   ✗ FAIL - Expected: $EXPECTED_NORMALIZED, Got: $ACTUAL_OUTPUT"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi
done

# Calculate score
if [ $TOTAL_TESTS -gt 0 ]; then
    SCORE=$((PASSED_TESTS * 40 / TOTAL_TESTS))
else
    SCORE=0
fi

PERCENTAGE=$((PASSED_TESTS * 100 / TOTAL_TESTS))

echo "[POST] Test Results: $PASSED_TESTS/$TOTAL_TESTS passed ($PERCENTAGE%)"
echo "[POST] Correctness Score: $SCORE/40"

# Write rubric JSON
cat > "$TEMP_DIR/rubric_correctness.json" <<EOF
{
  "rubric_id": "correctness",
  "rubric_name": "Correctness",
  "rubric_type": "numeric",
  "score": $SCORE,
  "max_score": 40,
  "percentage": $PERCENTAGE,
  "details": {
    "total_tests": $TOTAL_TESTS,
    "passed": $PASSED_TESTS,
    "failed": $FAILED_TESTS
  },
  "message": "Passed $PASSED_TESTS out of $TOTAL_TESTS test cases"
}
EOF

echo "[POST] Correctness evaluation complete"
