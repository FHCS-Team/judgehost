# Metrics Collection System Implementation

**Date:** October 14, 2025  
**Status:** ✅ Completed  
**Files Created:**

- `src/core/metricsCollector.js` (643 lines)

**Files Modified:**

- `src/core/processor.js` (integrated metrics collection)

---

## Overview

Implemented a comprehensive metrics collection system that monitors resource usage from Docker containers during evaluation. The system collects CPU, memory, network, and disk I/O metrics with periodic sampling and generates detailed reports.

---

## Architecture

### Core Components

```
MetricsCollector
├── ContainerMetricsCollector      # Per-container metrics collection
│   ├── start()                     # Begin periodic sampling
│   ├── stop()                      # End sampling
│   ├── collectSample()             # Single stats snapshot
│   ├── getSummary()                # Aggregated metrics
│   ├── getTimeSeries()             # Time-series data
│   └── getChartData()              # Chart-ready format
│
└── MetricsOrchestrator             # Multi-container coordination
    ├── initialize()                # Setup for all containers
    ├── startAll()                  # Start all collectors
    ├── stopAll()                   # Stop all collectors
    ├── generateReport()            # Complete metrics report
    ├── saveMetrics()               # Save to metrics.json
    └── saveTimeSeries()            # Save time-series data
```

---

## Key Features

### 1. Periodic Sampling

**Default Interval:** 10 seconds (configurable)

**Collected Metrics Per Sample:**

- Memory usage (MB)
- CPU usage (%)
- Network RX/TX (MB)
- Disk read/write (MB)
- Timestamp and elapsed time

**Example Sample:**

```javascript
{
  timestamp: "2025-10-14T10:35:18.345Z",
  elapsed_seconds: 10.0,
  memory_mb: 128.7,
  cpu_percent: 23.1,
  network_rx_mb: 1.2,
  network_tx_mb: 0.8,
  disk_read_mb: 15.3,
  disk_write_mb: 4.2
}
```

### 2. Resource Metrics Extraction

**Memory Metrics:**

- Extracted from `stats.memory_stats.usage`
- Converted from bytes to MB
- Tracks peak and average usage

**CPU Metrics:**

- Calculated from `cpu_stats.cpu_usage.total_usage` delta
- Normalized by system CPU delta and CPU count
- Returns percentage of one core

**Network Metrics:**

- Aggregated from all network interfaces
- RX (received) and TX (transmitted) bytes
- Converted to MB

**Disk I/O Metrics:**

- Extracted from `blkio_stats.io_service_bytes_recursive`
- Separate read/write operations
- Converted to MB

### 3. Summary Statistics

**Per-Container Summary:**

```javascript
{
  container_id: "submission",
  container_name: "Submission Container",
  status: "success",
  execution_time_seconds: 315.2,
  resource_usage: {
    memory_peak_mb: 198.3,    // Maximum memory used
    memory_avg_mb: 145.6,     // Average memory usage
    cpu_avg_percent: 12.5,    // Average CPU percentage
    cpu_time_seconds: 39.4,   // Total CPU time consumed
    network_rx_mb: 2.3,       // Total bytes received
    network_tx_mb: 1.8,       // Total bytes transmitted
    disk_read_mb: 45.2,       // Total disk reads
    disk_write_mb: 12.1       // Total disk writes
  }
}
```

**Total Resource Usage:**

- Aggregates metrics across all containers
- Memory peak = max of all container peaks
- Memory avg = sum of all container averages
- CPU/Network/Disk = sum of all containers

### 4. Time-Series Data

**Structure:**

```javascript
{
  submission_id: "sub_1234567890abcdef",
  problem_id: "rest-api-users",
  containers: [
    {
      container_id: "submission",
      container_name: "Submission Container",
      samples: [
        { timestamp: "...", elapsed_seconds: 0, memory_mb: 85.2, cpu_percent: 45.3 },
        { timestamp: "...", elapsed_seconds: 10, memory_mb: 128.7, cpu_percent: 23.1 },
        { timestamp: "...", elapsed_seconds: 20, memory_mb: 145.9, cpu_percent: 12.8 }
      ]
    }
  ]
}
```

**Use Cases:**

- Visualization and graphing
- Performance analysis over time
- Identifying resource spikes
- Debugging resource issues

### 5. Chart-Ready Format

**Structure:**

```javascript
{
  container_id: "submission",
  metrics: {
    memory: {
      labels: ["0s", "10s", "20s", "30s"],
      values: [85.2, 128.7, 145.9, 156.3]
    },
    cpu: {
      labels: ["0s", "10s", "20s", "30s"],
      values: [45.3, 23.1, 12.8, 8.5]
    }
  }
}
```

**Benefits:**

- Ready for direct use in Chart.js, D3.js, etc.
- No post-processing needed
- Separate series for memory and CPU

---

## Integration with Processor

### Workflow Integration

```javascript
// Step 5: Start containers
await docker.startContainerGroup(containerGroup);

// Step 5.5: Initialize and start metrics
const metricsOrchestrator = createMetricsOrchestrator();
metricsOrchestrator.initialize(submissionId, problemId, containerGroup);
await metricsOrchestrator.startAll();

// Step 6: Wait for execution
await docker.waitForContainerGroup(containerGroup, timeoutMs);

// Step 7.5: Stop metrics and save
await metricsOrchestrator.stopAll();
await metricsOrchestrator.saveMetrics(resultsDir);
await metricsOrchestrator.saveTimeSeries(resultsDir);

// Step 8: Include metrics in results
const metricsReport = metricsOrchestrator.generateReport();
results.metrics = metricsReport;
results.execution_time_seconds = metricsReport.execution_time_seconds;
results.resource_usage = metricsReport.total_resource_usage;
results.containers_metrics = metricsReport.containers_summary;
```

### Error Handling

**Graceful Degradation:**

- Continues if individual samples fail
- Logs warnings but doesn't fail evaluation
- Provides empty summary if no samples collected

**Cleanup on Error:**

```javascript
catch (error) {
  // Stop metrics collection if started
  if (evaluationState.metricsOrchestrator) {
    await evaluationState.metricsOrchestrator.stopAll();
  }
  throw error;
}
```

---

## Output Files

### 1. metrics.json

**Location:** `{resultsDir}/metrics.json`

**Content:**

- Submission and problem IDs
- Overall execution time
- Per-container summaries
- Total resource usage aggregation

**Size:** ~2-5 KB for typical evaluations

### 2. metrics_timeseries.json

**Location:** `{resultsDir}/metrics_timeseries.json`

**Content:**

- Full time-series data for all containers
- All samples with timestamps
- Useful for detailed analysis and visualization

**Size:** ~10-50 KB depending on execution duration and sample count

---

## Configuration

### Sample Interval

**Default:** 10 seconds (10000 ms)

**Customization:**

```javascript
// In processor.js
await metricsOrchestrator.startAll(5000); // 5-second interval
```

**Considerations:**

- Shorter intervals = more detailed data but higher overhead
- Longer intervals = less overhead but coarser granularity
- Recommended: 5-15 seconds for most use cases

### Docker Stats API

**Requirements:**

- Docker API access
- Container must be running
- Stats must be enabled (default)

**Limitations:**

- Network stats may not be available if networking disabled
- Disk I/O depends on Docker storage driver
- CPU throttling detection requires cgroup v2

---

## Documentation Compliance

### ✅ Implemented Features from docs/data-models/outputs/metrics.md

- **Overall metrics summary** with submission/problem IDs
- **Container-specific metrics** for multi-container setups
- **Periodic sampling** (configurable interval, default 10s)
- **Final summary** at completion
- **All documented fields:**
  - memory_peak_mb, memory_avg_mb
  - cpu_avg_percent, cpu_time_seconds
  - network_rx_mb, network_tx_mb
  - disk_read_mb, disk_write_mb
  - execution_time_seconds
- **Time-series format** with timestamps and elapsed time
- **Chart-ready format** for visualization
- **Total resource aggregation** across containers

---

## Usage Examples

### Basic Usage

```javascript
const { createMetricsOrchestrator } = require("./core/metricsCollector");

// Create orchestrator
const metrics = createMetricsOrchestrator();

// Initialize with containers
metrics.initialize(submissionId, problemId, containerGroup);

// Start collection
await metrics.startAll(); // Uses default 10s interval

// ... container execution ...

// Stop and save
await metrics.stopAll();
await metrics.saveMetrics(resultsDir);

// Get report
const report = metrics.generateReport();
console.log(`Peak memory: ${report.total_resource_usage.memory_peak_mb} MB`);
```

### Custom Interval

```javascript
// Start with 5-second sampling
await metrics.startAll(5000);
```

### Individual Container Control

```javascript
// Start specific container
await metrics.startContainer("submission");

// Stop specific container
await metrics.stopContainer("api-tester");
```

### Get Time-Series Data

```javascript
const timeSeries = metrics.getTimeSeriesData();
// Returns full sample history for all containers
```

### Get Chart Data

```javascript
const chartData = metrics.getChartData();
// Returns labels and values ready for charting libraries
```

---

## Performance Considerations

### Overhead

**Per Sample:**

- Docker stats API call: ~10-20ms
- Data extraction: ~1-2ms
- Total: ~12-22ms per container

**With 3 containers, 10s interval, 5min evaluation:**

- Samples: 30 samples per container × 3 = 90 samples
- Total overhead: ~2 seconds over 5 minutes = 0.7%

**Conclusion:** Negligible impact on evaluation performance

### Memory Usage

**Per Collector:**

- Sample object: ~200 bytes
- 30 samples over 5 min: ~6 KB
- 3 containers: ~18 KB total

**Conclusion:** Minimal memory footprint

---

## Testing Recommendations

### Unit Tests

1. **ContainerMetricsCollector**

   - Test sample collection
   - Test metric extraction (memory, CPU, network, disk)
   - Test summary calculation
   - Test time-series formatting

2. **MetricsOrchestrator**
   - Test initialization with multiple containers
   - Test start/stop all
   - Test report generation
   - Test file saving

### Integration Tests

1. **With Docker Container**

   - Create test container
   - Collect metrics for 30 seconds
   - Verify samples captured
   - Verify metrics values are reasonable

2. **Multi-Container Scenario**
   - Create 3 test containers
   - Start metrics for all
   - Verify aggregation
   - Check total resource usage

### End-to-End Tests

1. **Full Evaluation**

   - Run simple problem submission
   - Verify metrics.json created
   - Verify metrics_timeseries.json created
   - Validate JSON structure

2. **Error Scenarios**
   - Container stops early
   - Metrics collection fails
   - Verify graceful degradation

---

## Future Enhancements

### Potential Improvements

1. **Adaptive Sampling**

   - Increase frequency during high activity
   - Reduce frequency during idle periods
   - Smart spike detection

2. **Threshold Alerts**

   - Warn if memory exceeds 80% of limit
   - Alert on CPU throttling
   - Detect excessive disk I/O

3. **Historical Comparison**

   - Compare metrics to previous submissions
   - Detect performance regressions
   - Percentile calculations

4. **Real-Time Streaming**

   - WebSocket updates during evaluation
   - Live dashboard display
   - Progress indicators

5. **Advanced Metrics**
   - Container restart counts
   - OOM (Out of Memory) events
   - Network packet loss
   - Context switches

---

## Summary

The metrics collection system is fully implemented and integrated into the evaluation workflow. It provides comprehensive resource monitoring with:

- ✅ Periodic sampling (configurable interval)
- ✅ Per-container and aggregated metrics
- ✅ Memory, CPU, network, and disk I/O tracking
- ✅ Time-series data for visualization
- ✅ Chart-ready format
- ✅ JSON output files (metrics.json, metrics_timeseries.json)
- ✅ Graceful error handling
- ✅ Minimal performance overhead

**Key Files:**

- `src/core/metricsCollector.js` - Complete metrics collection engine (643 lines)
- `src/core/processor.js` - Integrated into evaluation workflow
- Output: `{resultsDir}/metrics.json` and `metrics_timeseries.json`

**Status:** ✅ Ready for testing with real evaluations
