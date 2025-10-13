#!/bin/sh
###############################################################################
# Default Monitoring Script
# Collects system metrics during evaluation
#
# This script runs periodically to monitor:
# - CPU usage
# - Memory usage
# - Disk I/O
# - Network traffic (if enabled)
###############################################################################

# Configuration
MONITOR_INTERVAL="${PERIODIC_INTERVAL_SECONDS:-10}"
OUTPUT_DIR="${OUTPUT_DIR:-/out}"
METRICS_FILE="${OUTPUT_DIR}/metrics.json"

# Initialize metrics file
if [ ! -f "${METRICS_FILE}" ]; then
    cat > "${METRICS_FILE}" <<EOF
{
  "start_time": "$(date -u +%Y-%m-%dT%H:%M:%S.000Z)",
  "samples": []
}
EOF
fi

# Get CPU usage
get_cpu_usage() {
    # Use top or ps to get CPU percentage
    if command -v top > /dev/null 2>&1; then
        top -bn1 | grep "Cpu(s)" | sed "s/.*, *\([0-9.]*\)%* id.*/\1/" | awk '{print 100 - $1}'
    else
        echo "0"
    fi
}

# Get memory usage
get_memory_usage() {
    if [ -f /proc/meminfo ]; then
        local total=$(grep MemTotal /proc/meminfo | awk '{print $2}')
        local available=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
        local used=$((total - available))
        local percent=$((used * 100 / total))
        echo "${used}:${total}:${percent}"
    else
        echo "0:0:0"
    fi
}

# Get disk usage
get_disk_usage() {
    if command -v df > /dev/null 2>&1; then
        df -k / | tail -1 | awk '{print $3":"$2":"$5}' | tr -d '%'
    else
        echo "0:0:0"
    fi
}

# Collect sample
collect_sample() {
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
    local cpu=$(get_cpu_usage)
    local memory=$(get_memory_usage)
    local disk=$(get_disk_usage)
    
    # Parse values
    IFS=':' read -r mem_used mem_total mem_percent <<< "$memory"
    IFS=':' read -r disk_used disk_total disk_percent <<< "$disk"
    
    # Create sample JSON
    local sample=$(cat <<EOF
{
  "timestamp": "${timestamp}",
  "cpu_percent": ${cpu},
  "memory": {
    "used_kb": ${mem_used},
    "total_kb": ${mem_total},
    "percent": ${mem_percent}
  },
  "disk": {
    "used_kb": ${disk_used},
    "total_kb": ${disk_total},
    "percent": ${disk_percent}
  }
}
EOF
)
    
    # Append to metrics file (simple append, not perfect JSON but parseable)
    echo "${sample}" >> "${OUTPUT_DIR}/metrics_samples.jsonl"
}

# Main monitoring loop
main() {
    echo "[MONITOR] Starting resource monitoring (interval: ${MONITOR_INTERVAL}s)"
    
    # Create JSONL file for samples
    touch "${OUTPUT_DIR}/metrics_samples.jsonl"
    
    while true; do
        collect_sample
        sleep "${MONITOR_INTERVAL}"
    done
}

# Run if executed directly
if [ "${BASH_SOURCE[0]}" = "${0}" ]; then
    main
fi
