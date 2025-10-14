#!/bin/bash
set -e

echo "[POST] Testing concurrent load performance"

# Create concurrent query runner
cat > /tmp/concurrent_query.sh <<'SCRIPT'
#!/bin/bash
count=0
start_time=$(date +%s)
end_time=$((start_time + 30))

while [ $(date +%s) -lt $end_time ]; do
    psql -h database -U judge -d hackathon_db -f /submission/Q1.sql > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        count=$((count + 1))
    fi
done

echo $count
SCRIPT

chmod +x /tmp/concurrent_query.sh

# Run 10 clients in parallel for 30 seconds
echo "[TEST] Running 10 concurrent clients for 30 seconds..."
total_queries=0

for i in {1..10}; do
    /tmp/concurrent_query.sh > /tmp/client_${i}.count &
done

# Wait for all clients
wait

# Collect results
for i in {1..10}; do
    if [ -f /tmp/client_${i}.count ]; then
        client_count=$(cat /tmp/client_${i}.count)
        total_queries=$((total_queries + client_count))
    fi
done

# Calculate throughput (queries per second)
throughput=$(echo "scale=2; $total_queries / 30" | bc)

echo "[TEST] Total queries: $total_queries"
echo "[TEST] Throughput: $throughput queries/second"

# Score: target = 10 qps
target_throughput=10
concurrency_score=$(echo "scale=4; if ($throughput > 0) $throughput / $target_throughput else 0" | bc)

if (( $(echo "$concurrency_score > 1" | bc -l) )); then
    concurrency_score=1
fi

final_score=$(echo "scale=2; $concurrency_score * 10" | bc)

cat > /out/rubric_concurrency.json <<EOF
{
  "rubric_id": "concurrency",
  "rubric_type": "performance_benchmark",
  "max_score": 10,
  "score": $final_score,
  "status": "DONE",
  "details": {
    "total_queries": $total_queries,
    "duration_seconds": 30,
    "concurrent_clients": 10,
    "throughput_qps": $throughput,
    "target_qps": $target_throughput
  },
  "message": "Concurrency: $throughput qps (target: $target_throughput)"
}
EOF

echo "[POST] Concurrency test complete"
