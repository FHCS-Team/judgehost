#!/bin/bash
# priority: 30
# Post-hook: Evaluate performance (time complexity)

set -e

echo "[POST] Evaluating performance..."

SUBMISSION_DIR="${SUBMISSION_DIR:-/workspace/submission}"
TEMP_DIR="/tmp/judgehost"

# Detect submission file
detect_submission_command() {
    if [ -f "$SUBMISSION_DIR/solution.py" ]; then
        echo "python3 $SUBMISSION_DIR/solution.py"
    elif [ -f "$SUBMISSION_DIR/solution.js" ]; then
        echo "node $SUBMISSION_DIR/solution.js"
    elif [ -f "$SUBMISSION_DIR/solution" ]; then
        echo "$SUBMISSION_DIR/solution"
    else
        echo "bash $SUBMISSION_DIR/solution.sh"
    fi
}

SOLUTION_CMD=$(detect_submission_command)

# Generate large test case (10000 elements)
LARGE_SIZE=10000
TARGET=19999
LARGE_INPUT="$TARGET"
for i in $(seq 0 $((LARGE_SIZE - 1))); do
    LARGE_INPUT="$LARGE_INPUT $i"
done

echo "[POST] Running performance test with $LARGE_SIZE elements..."

# Measure execution time (3 runs, take average)
TOTAL_TIME=0
RUNS=3

for run in $(seq 1 $RUNS); do
    START_TIME=$(date +%s%N)
    echo "$LARGE_INPUT" | timeout 10s bash -c "$SOLUTION_CMD" > /dev/null 2>&1 || true
    END_TIME=$(date +%s%N)
    
    RUN_TIME=$(( (END_TIME - START_TIME) / 1000000 )) # Convert to milliseconds
    TOTAL_TIME=$((TOTAL_TIME + RUN_TIME))
done

AVG_TIME=$((TOTAL_TIME / RUNS))

echo "[POST] Average execution time: ${AVG_TIME}ms"

# Score based on performance
# O(n) solutions should complete in < 100ms
# O(n log n) solutions in < 500ms
# O(n²) solutions may timeout or take > 5000ms

SCORE=0
if [ $AVG_TIME -lt 100 ]; then
    SCORE=10
    COMPLEXITY="O(n)"
    RATING="Excellent"
elif [ $AVG_TIME -lt 500 ]; then
    SCORE=7
    COMPLEXITY="O(n log n)"
    RATING="Good"
elif [ $AVG_TIME -lt 5000 ]; then
    SCORE=3
    COMPLEXITY="O(n²)"
    RATING="Poor"
else
    SCORE=0
    COMPLEXITY="Worse than O(n²)"
    RATING="Timeout/Fail"
fi

echo "[POST] Estimated complexity: $COMPLEXITY"
echo "[POST] Performance Score: $SCORE/10"

# Write rubric JSON
cat > "$TEMP_DIR/rubric_performance.json" <<EOF
{
  "rubric_id": "performance",
  "rubric_name": "Performance",
  "rubric_type": "numeric",
  "score": $SCORE,
  "max_score": 10,
  "percentage": $((SCORE * 10)),
  "details": {
    "avg_execution_time_ms": $AVG_TIME,
    "test_size": $LARGE_SIZE,
    "estimated_complexity": "$COMPLEXITY",
    "rating": "$RATING"
  },
  "message": "Average execution time: ${AVG_TIME}ms for $LARGE_SIZE elements"
}
EOF

echo "[POST] Performance evaluation complete"
