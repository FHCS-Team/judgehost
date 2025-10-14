#!/bin/bash
set -e

echo "[POST] Evaluating storage efficiency"

# Read migration metrics
if [ ! -f "/shared/migration_metrics.json" ]; then
    echo "[ERROR] Migration metrics not found!"
    exit 1
fi

INITIAL_SIZE=$(jq -r '.initial_size_bytes' /shared/migration_metrics.json)
EXTRA_SIZE=$(jq -r '.extra_storage_bytes' /shared/migration_metrics.json)

echo "[TEST] Base dataset: $INITIAL_SIZE bytes"
echo "[TEST] Additional storage: $EXTRA_SIZE bytes"

# Calculate storage efficiency score
# score_s = clamp(1 - (extra_storage / (0.3 * base_data_size)), 0, 1)
target_extra=$(echo "scale=0; $INITIAL_SIZE * 0.3 / 1" | bc)
storage_ratio=$(echo "scale=4; $EXTRA_SIZE / $target_extra" | bc)
storage_score=$(echo "scale=4; 1 - $storage_ratio" | bc)

# Clamp between 0 and 1
if (( $(echo "$storage_score < 0" | bc -l) )); then
    storage_score=0
elif (( $(echo "$storage_score > 1" | bc -l) )); then
    storage_score=1
fi

final_score=$(echo "scale=2; $storage_score * 10" | bc)
extra_percentage=$(echo "scale=2; $EXTRA_SIZE * 100 / $INITIAL_SIZE" | bc)

cat > /out/rubric_resource_efficiency.json <<EOF
{
  "rubric_id": "resource_efficiency",
  "rubric_type": "resource_usage",
  "max_score": 10,
  "score": $final_score,
  "status": "DONE",
  "details": {
    "base_size_bytes": $INITIAL_SIZE,
    "extra_storage_bytes": $EXTRA_SIZE,
    "extra_storage_percentage": $extra_percentage,
    "target_percentage": 30
  },
  "message": "Storage: ${extra_percentage}% additional (target: ≤30%)"
}
EOF

echo "[POST] Storage efficiency evaluation complete"
