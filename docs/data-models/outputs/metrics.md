# Resource Metrics Specification

This document specifies the structure and format of resource usage metrics collected during submission evaluation.

**Related Documentation**:

- [`../../results/GET_results.md`](../../results/GET_results.md) - Results API with metrics
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Container-to-rubric mapping
- [`logs.md`](logs.md) - Log format specification

---

## Overview

The judgehost collects resource usage metrics during evaluation:

- **CPU usage**: Percentage and time
- **Memory usage**: Peak and average consumption
- **Network I/O**: Bytes sent/received (if enabled)
- **Disk I/O**: Read/write operations
- **Container-specific metrics**: Per-container resource usage in multi-container setups

Metrics are collected:

- **Periodically** during execution (default: every 10 seconds)
- **At completion** for final summary
- **Per container** in multi-container problems

---

## Metrics Structure

### Overall Metrics Summary

```json
{
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "execution_time_seconds": 315.6,
  "containers_summary": [
    {
      "container_id": "submission",
      "container_name": "Submission Container",
      "status": "success",
      "execution_time_seconds": 315.2,
      "resource_usage": {
        "memory_peak_mb": 198.3,
        "memory_avg_mb": 145.6,
        "cpu_avg_percent": 12.5,
        "cpu_time_seconds": 39.4,
        "network_rx_mb": 2.3,
        "network_tx_mb": 1.8,
        "disk_read_mb": 45.2,
        "disk_write_mb": 12.1
      }
    },
    {
      "container_id": "api_tester",
      "container_name": "API Test Runner",
      "status": "success",
      "execution_time_seconds": 287.5,
      "resource_usage": {
        "memory_peak_mb": 112.8,
        "memory_avg_mb": 98.4,
        "cpu_avg_percent": 25.3,
        "cpu_time_seconds": 72.7,
        "network_rx_mb": 1.8,
        "network_tx_mb": 2.3,
        "disk_read_mb": 12.4,
        "disk_write_mb": 3.2
      }
    }
  ],
  "total_resource_usage": {
    "memory_peak_mb": 311.1,
    "memory_avg_mb": 244.0,
    "cpu_avg_percent": 37.8,
    "cpu_time_seconds": 112.1,
    "network_rx_mb": 4.1,
    "network_tx_mb": 4.1,
    "disk_read_mb": 57.6,
    "disk_write_mb": 15.3
  }
}
```

---

## Container Resource Usage

### Field Descriptions

| Field              | Type   | Unit    | Description                            |
| ------------------ | ------ | ------- | -------------------------------------- |
| `memory_peak_mb`   | number | MB      | Peak memory usage during execution     |
| `memory_avg_mb`    | number | MB      | Average memory usage                   |
| `cpu_avg_percent`  | number | %       | Average CPU usage percentage           |
| `cpu_time_seconds` | number | seconds | Total CPU time consumed                |
| `network_rx_mb`    | number | MB      | Network bytes received (if enabled)    |
| `network_tx_mb`    | number | MB      | Network bytes transmitted (if enabled) |
| `disk_read_mb`     | number | MB      | Disk bytes read                        |
| `disk_write_mb`    | number | MB      | Disk bytes written                     |

### Memory Metrics

```json
{
  "memory_peak_mb": 198.3,
  "memory_avg_mb": 145.6,
  "memory_limit_mb": 512.0,
  "memory_usage_percent": 38.7
}
```

- `memory_peak_mb`: Maximum memory used at any point
- `memory_avg_mb`: Average memory usage across evaluation
- `memory_limit_mb`: Configured memory limit for container
- `memory_usage_percent`: Peak as percentage of limit

### CPU Metrics

```json
{
  "cpu_avg_percent": 12.5,
  "cpu_time_seconds": 39.4,
  "cpu_limit_cores": 1.0,
  "cpu_throttling_count": 0
}
```

- `cpu_avg_percent`: Average CPU usage as percentage of one core
- `cpu_time_seconds`: Total CPU time consumed (sum of all cores)
- `cpu_limit_cores`: Configured CPU limit
- `cpu_throttling_count`: Number of times CPU was throttled

### Network Metrics

```json
{
  "network_rx_mb": 2.3,
  "network_tx_mb": 1.8,
  "network_rx_packets": 15234,
  "network_tx_packets": 12456,
  "network_enabled": true
}
```

- `network_rx_mb`: Megabytes received
- `network_tx_mb`: Megabytes transmitted
- `network_rx_packets`: Packets received
- `network_tx_packets`: Packets transmitted
- `network_enabled`: Whether network was enabled for container

### Disk I/O Metrics

```json
{
  "disk_read_mb": 45.2,
  "disk_write_mb": 12.1,
  "disk_read_ops": 1234,
  "disk_write_ops": 567
}
```

- `disk_read_mb`: Megabytes read from disk
- `disk_write_mb`: Megabytes written to disk
- `disk_read_ops`: Number of read operations
- `disk_write_ops`: Number of write operations

---

## Time-Series Metrics

### Periodic Sampling

Metrics are sampled periodically (default: every 10 seconds) and stored as time series:

```json
{
  "container_id": "submission",
  "samples": [
    {
      "timestamp": "2025-10-13T10:35:18.345Z",
      "elapsed_seconds": 0,
      "memory_mb": 85.2,
      "cpu_percent": 45.3
    },
    {
      "timestamp": "2025-10-13T10:35:28.345Z",
      "elapsed_seconds": 10,
      "memory_mb": 128.7,
      "cpu_percent": 23.1
    },
    {
      "timestamp": "2025-10-13T10:35:38.345Z",
      "elapsed_seconds": 20,
      "memory_mb": 145.9,
      "cpu_percent": 12.8
    },
    {
      "timestamp": "2025-10-13T10:35:48.345Z",
      "elapsed_seconds": 30,
      "memory_mb": 156.3,
      "cpu_percent": 8.5
    }
  ]
}
```

### Chart-Ready Format

For visualization, metrics can be retrieved in chart-ready format:

```json
{
  "container_id": "submission",
  "metrics": {
    "memory": {
      "labels": ["0s", "10s", "20s", "30s", "40s"],
      "values": [85.2, 128.7, 145.9, 156.3, 145.1]
    },
    "cpu": {
      "labels": ["0s", "10s", "20s", "30s", "40s"],
      "values": [45.3, 23.1, 12.8, 8.5, 10.2]
    }
  }
}
```

---

## Multi-Container Metrics

### Per-Container Breakdown

```json
{
  "submission_id": "sub_1234567890abcdef",
  "containers": [
    {
      "container_id": "submission",
      "container_name": "Submission Container",
      "accepts_submission": true,
      "resource_usage": {
        "memory_peak_mb": 198.3,
        "memory_avg_mb": 145.6,
        "cpu_avg_percent": 12.5
      }
    },
    {
      "container_id": "api-tester",
      "container_name": "API Test Runner",
      "accepts_submission": false,
      "resource_usage": {
        "memory_peak_mb": 112.8,
        "memory_avg_mb": 98.4,
        "cpu_avg_percent": 25.3
      }
    },
    {
      "container_id": "database",
      "container_name": "PostgreSQL",
      "accepts_submission": false,
      "resource_usage": {
        "memory_peak_mb": 256.1,
        "memory_avg_mb": 234.5,
        "cpu_avg_percent": 5.2
      }
    }
  ],
  "total_resource_usage": {
    "memory_peak_mb": 567.2,
    "memory_avg_mb": 478.5,
    "cpu_avg_percent": 43.0
  }
}
```

### Network Communication Between Containers

```json
{
  "container_id": "api_tester",
  "network_connections": [
    {
      "target_container": "submission",
      "connection_count": 25,
      "bytes_sent": 123456,
      "bytes_received": 234567
    }
  ]
}
```

---

## Resource Limit Violations

### Exceeded Limits

```json
{
  "container_id": "submission",
  "resource_violations": [
    {
      "type": "memory",
      "limit_mb": 512.0,
      "peak_mb": 523.4,
      "exceeded_by_mb": 11.4,
      "timestamp": "2025-10-13T10:38:45.123Z",
      "action": "container_killed"
    }
  ]
}
```

### Timeout

```json
{
  "container_id": "submission",
  "timeout": true,
  "timeout_seconds": 300,
  "actual_execution_seconds": 305.2,
  "exceeded_by_seconds": 5.2
}
```

---

## Storage Location

### Metrics Files

Metrics are stored in the results directory:

```
data/results/sub_1234567890abcdef/
├── result.json              # Includes summary metrics
├── metrics.json             # Detailed metrics
├── metrics_timeseries.json  # Time-series data
└── containers/
    ├── submission/
    │   └── metrics.json     # Container-specific metrics
    └── api_tester/
        └── metrics.json     # Container-specific metrics
```

### metrics.json Structure

```json
{
  "submission_id": "sub_1234567890abcdef",
  "problem_id": "rest-api-users",
  "collected_at": "2025-10-13T10:40:15.678Z",
  "execution_time_seconds": 315.6,
  "containers": [
    {
      "container_id": "submission",
      "resource_usage": { ... },
      "timeseries": [ ... ]
    },
    {
      "container_id": "api_tester",
      "resource_usage": { ... },
      "timeseries": [ ... ]
    }
  ],
  "total_resource_usage": { ... }
}
```

---

## Metrics Collection

### Default Monitor

The judgehost includes a default periodic monitoring script that runs every 10 seconds:

```bash
#!/bin/bash
# Collects resource metrics for a container

CONTAINER_ID=$1
METRICS_FILE="/out/metrics.json"

# Get memory usage
MEMORY_USAGE=$(cat /sys/fs/cgroup/memory/memory.usage_in_bytes)
MEMORY_LIMIT=$(cat /sys/fs/cgroup/memory/memory.limit_in_bytes)

# Get CPU usage
CPU_USAGE=$(cat /sys/fs/cgroup/cpuacct/cpuacct.usage)

# Write metrics
echo "{
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"memory_bytes\": $MEMORY_USAGE,
  \"memory_limit_bytes\": $MEMORY_LIMIT,
  \"cpu_nanoseconds\": $CPU_USAGE
}" >> "$METRICS_FILE"
```

### Custom Metrics

Problem authors can add custom metrics in periodic hooks:

```bash
#!/bin/bash
# hooks/periodic/01_custom_metrics.sh

METRICS_FILE="/out/custom_metrics.json"

# Collect custom application metrics
API_RESPONSE_TIME=$(curl -w "%{time_total}" -s http://localhost:3000/api/health)
ACTIVE_CONNECTIONS=$(netstat -an | grep ESTABLISHED | wc -l)

echo "{
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"api_response_time_seconds\": $API_RESPONSE_TIME,
  \"active_connections\": $ACTIVE_CONNECTIONS
}" >> "$METRICS_FILE"
```

---

## API Endpoints

### Get Metrics Summary

```bash
GET /api/results/:submission_id
```

Response includes metrics in the `metadata` field:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_123",
    "metadata": {
      "execution_time_seconds": 315.6,
      "memory_peak_mb": 198.3,
      "cpu_avg_percent": 12.5
    },
    "containers_summary": [ ... ]
  }
}
```

### Get Detailed Metrics

```bash
GET /api/results/:submission_id/metrics
```

Response:

```json
{
  "success": true,
  "data": {
    "submission_id": "sub_123",
    "containers": [ ... ],
    "total_resource_usage": { ... },
    "timeseries": [ ... ]
  }
}
```

### Get Container-Specific Metrics

```bash
GET /api/results/:submission_id/metrics?container_id=submission
```

Response:

```json
{
  "success": true,
  "data": {
    "container_id": "submission",
    "resource_usage": { ... },
    "timeseries": [ ... ]
  }
}
```

---

## Use Cases

### Resource Efficiency Rubric

Evaluate submissions based on resource usage:

```bash
#!/bin/bash
# hooks/post/evaluate_efficiency.sh

METRICS=$(cat /out/metrics.json)
MEMORY_AVG=$(echo "$METRICS" | jq '.containers[0].resource_usage.memory_avg_mb')
CPU_AVG=$(echo "$METRICS" | jq '.containers[0].resource_usage.cpu_avg_percent')

# Score based on resource efficiency
SCORE=20

if (( $(echo "$MEMORY_AVG > 200" | bc -l) )); then
  SCORE=$((SCORE - 5))
fi

if (( $(echo "$CPU_AVG > 50" | bc -l) )); then
  SCORE=$((SCORE - 5))
fi

cat > /out/rubric_efficiency.json << EOF
{
  "rubric_id": "efficiency",
  "rubric_type": "custom",
  "score": $SCORE,
  "details": {
    "memory_avg_mb": $MEMORY_AVG,
    "cpu_avg_percent": $CPU_AVG
  }
}
EOF
```

### Performance Monitoring

Track performance over time:

```bash
#!/bin/bash
# hooks/periodic/monitor_performance.sh

# Measure API response time
START=$(date +%s%N)
curl -s http://localhost:3000/api/users > /dev/null
END=$(date +%s%N)
RESPONSE_TIME=$(echo "scale=3; ($END - $START) / 1000000000" | bc)

echo "{
  \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)\",
  \"response_time_seconds\": $RESPONSE_TIME
}" >> /out/performance_metrics.json
```

---

## Best Practices

### For Problem Authors

1. **Set appropriate resource limits** based on expected usage

   ```json
   {
     "resource_limits": {
       "memory": "512m",
       "cpus": 1.0,
       "timeout": 300
     }
   }
   ```

2. **Monitor resource-intensive operations**

   ```bash
   # Before expensive operation
   echo "[INFO] Starting database migration..." >&2

   # After
   echo "[INFO] Database migration completed" >&2
   ```

3. **Use custom metrics for application-specific measurements**
   - Response times
   - Query performance
   - Connection counts

### For System Administrators

1. **Configure monitoring interval** based on needs

   - Shorter intervals (5s) for detailed analysis
   - Longer intervals (30s) to reduce overhead

2. **Set up alerts** for resource violations

   - Memory limit exceeded
   - CPU throttling
   - Disk quota exceeded

3. **Archive old metrics** to save storage
   - Keep detailed metrics for 7 days
   - Keep summary metrics for 30 days

---

## See Also

- [`../../results/GET_results.md`](../../results/GET_results.md) - Results API with metrics
- [`../rubrics/mapping.md`](../rubrics/mapping.md) - Container-to-rubric mapping
- [`logs.md`](logs.md) - Log format specification
- [`../containers/resources.md`](../containers/resources.md) - Container resources and monitoring
