/**
 * Metrics Collection System
 * Collects resource usage metrics from Docker containers during evaluation
 * Matches docs/data-models/outputs/metrics.md specification
 */

const logger = require("../utils/logger");
const fs = require("fs/promises");
const path = require("path");

/**
 * Default sampling interval in milliseconds
 */
const DEFAULT_SAMPLE_INTERVAL_MS = 10000; // 10 seconds

/**
 * Metrics collector for a single container
 */
class ContainerMetricsCollector {
  constructor(dockerContainer, containerId, containerName) {
    this.dockerContainer = dockerContainer;
    this.containerId = containerId;
    this.containerName = containerName;
    this.samples = [];
    this.startTime = null;
    this.endTime = null;
    this.intervalId = null;
  }

  /**
   * Start periodic metrics collection
   */
  async start(intervalMs = DEFAULT_SAMPLE_INTERVAL_MS) {
    this.startTime = new Date();
    logger.info(
      `Starting metrics collection for container ${this.containerId} (interval: ${intervalMs}ms)`
    );

    // Collect initial sample
    await this.collectSample();

    // Set up periodic collection
    this.intervalId = setInterval(async () => {
      try {
        await this.collectSample();
      } catch (error) {
        logger.error(
          `Error collecting metrics for ${this.containerId}:`,
          error
        );
      }
    }, intervalMs);
  }

  /**
   * Stop metrics collection
   */
  async stop() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    this.endTime = new Date();

    // Collect final sample
    try {
      await this.collectSample();
    } catch (error) {
      logger.warn(
        `Could not collect final sample for ${this.containerId}:`,
        error.message
      );
    }

    logger.info(
      `Stopped metrics collection for ${this.containerId} (${this.samples.length} samples)`
    );
  }

  /**
   * Collect a single metrics sample
   */
  async collectSample() {
    try {
      const stats = await this.dockerContainer.stats({ stream: false });
      const elapsedSeconds = this.startTime
        ? (new Date() - this.startTime) / 1000
        : 0;

      const sample = {
        timestamp: new Date().toISOString(),
        elapsed_seconds: Math.round(elapsedSeconds * 10) / 10, // Round to 1 decimal
        memory_mb: this.extractMemoryUsage(stats),
        cpu_percent: this.extractCpuPercent(stats),
        network_rx_mb: this.extractNetworkRx(stats),
        network_tx_mb: this.extractNetworkTx(stats),
        disk_read_mb: this.extractDiskRead(stats),
        disk_write_mb: this.extractDiskWrite(stats),
      };

      this.samples.push(sample);
      return sample;
    } catch (error) {
      logger.error(
        `Failed to collect stats for ${this.containerId}:`,
        error.message
      );
      throw error;
    }
  }

  /**
   * Extract memory usage in MB
   */
  extractMemoryUsage(stats) {
    if (!stats.memory_stats || !stats.memory_stats.usage) {
      return 0;
    }
    const bytes = stats.memory_stats.usage;
    return Math.round((bytes / (1024 * 1024)) * 10) / 10; // Round to 1 decimal
  }

  /**
   * Extract CPU usage percentage
   */
  extractCpuPercent(stats) {
    if (
      !stats.cpu_stats ||
      !stats.precpu_stats ||
      !stats.cpu_stats.cpu_usage ||
      !stats.precpu_stats.cpu_usage
    ) {
      return 0;
    }

    const cpuDelta =
      stats.cpu_stats.cpu_usage.total_usage -
      stats.precpu_stats.cpu_usage.total_usage;
    const systemDelta =
      stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;

    if (systemDelta > 0 && cpuDelta > 0) {
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      const cpuPercent = (cpuDelta / systemDelta) * cpuCount * 100.0;
      return Math.round(cpuPercent * 10) / 10; // Round to 1 decimal
    }

    return 0;
  }

  /**
   * Extract network received in MB
   */
  extractNetworkRx(stats) {
    if (!stats.networks) {
      return 0;
    }

    let totalRx = 0;
    for (const iface in stats.networks) {
      totalRx += stats.networks[iface].rx_bytes || 0;
    }

    return Math.round((totalRx / (1024 * 1024)) * 10) / 10;
  }

  /**
   * Extract network transmitted in MB
   */
  extractNetworkTx(stats) {
    if (!stats.networks) {
      return 0;
    }

    let totalTx = 0;
    for (const iface in stats.networks) {
      totalTx += stats.networks[iface].tx_bytes || 0;
    }

    return Math.round((totalTx / (1024 * 1024)) * 10) / 10;
  }

  /**
   * Extract disk read in MB
   */
  extractDiskRead(stats) {
    if (!stats.blkio_stats || !stats.blkio_stats.io_service_bytes_recursive) {
      return 0;
    }

    let totalRead = 0;
    for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
      if (entry.op === "Read" || entry.op === "read") {
        totalRead += entry.value || 0;
      }
    }

    return Math.round((totalRead / (1024 * 1024)) * 10) / 10;
  }

  /**
   * Extract disk write in MB
   */
  extractDiskWrite(stats) {
    if (!stats.blkio_stats || !stats.blkio_stats.io_service_bytes_recursive) {
      return 0;
    }

    let totalWrite = 0;
    for (const entry of stats.blkio_stats.io_service_bytes_recursive) {
      if (entry.op === "Write" || entry.op === "write") {
        totalWrite += entry.value || 0;
      }
    }

    return Math.round((totalWrite / (1024 * 1024)) * 10) / 10;
  }

  /**
   * Calculate summary metrics from samples
   */
  getSummary() {
    if (this.samples.length === 0) {
      return this.getEmptySummary();
    }

    const memoryValues = this.samples.map((s) => s.memory_mb);
    const cpuValues = this.samples.map((s) => s.cpu_percent);

    // Get final values (cumulative metrics)
    const finalSample = this.samples[this.samples.length - 1];

    const executionTimeSeconds =
      this.startTime && this.endTime
        ? (this.endTime - this.startTime) / 1000
        : 0;

    return {
      memory_peak_mb: Math.max(...memoryValues),
      memory_avg_mb:
        Math.round(
          (memoryValues.reduce((a, b) => a + b, 0) / memoryValues.length) * 10
        ) / 10,
      cpu_avg_percent:
        Math.round(
          (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length) * 10
        ) / 10,
      cpu_time_seconds:
        Math.round(
          ((executionTimeSeconds *
            (cpuValues.reduce((a, b) => a + b, 0) / cpuValues.length)) /
            100) *
            10
        ) / 10,
      network_rx_mb: finalSample.network_rx_mb || 0,
      network_tx_mb: finalSample.network_tx_mb || 0,
      disk_read_mb: finalSample.disk_read_mb || 0,
      disk_write_mb: finalSample.disk_write_mb || 0,
      execution_time_seconds: Math.round(executionTimeSeconds * 10) / 10,
    };
  }

  /**
   * Get empty summary for containers with no samples
   */
  getEmptySummary() {
    return {
      memory_peak_mb: 0,
      memory_avg_mb: 0,
      cpu_avg_percent: 0,
      cpu_time_seconds: 0,
      network_rx_mb: 0,
      network_tx_mb: 0,
      disk_read_mb: 0,
      disk_write_mb: 0,
      execution_time_seconds: 0,
    };
  }

  /**
   * Get time-series data
   */
  getTimeSeries() {
    return {
      container_id: this.containerId,
      container_name: this.containerName,
      samples: this.samples,
    };
  }

  /**
   * Get chart-ready format
   */
  getChartData() {
    const labels = this.samples.map((s) => `${s.elapsed_seconds}s`);
    const memoryValues = this.samples.map((s) => s.memory_mb);
    const cpuValues = this.samples.map((s) => s.cpu_percent);

    return {
      container_id: this.containerId,
      container_name: this.containerName,
      metrics: {
        memory: {
          labels,
          values: memoryValues,
        },
        cpu: {
          labels,
          values: cpuValues,
        },
      },
    };
  }
}

/**
 * Multi-container metrics orchestrator
 */
class MetricsOrchestrator {
  constructor() {
    this.collectors = new Map();
    this.submissionId = null;
    this.problemId = null;
    this.overallStartTime = null;
    this.overallEndTime = null;
  }

  /**
   * Initialize metrics collection for multiple containers
   */
  initialize(submissionId, problemId, containerGroup) {
    this.submissionId = submissionId;
    this.problemId = problemId;
    this.overallStartTime = new Date();

    logger.info(
      `Initializing metrics collection for ${containerGroup.containers.length} containers`
    );

    for (const containerInfo of containerGroup.containers) {
      const collector = new ContainerMetricsCollector(
        containerInfo.dockerContainer,
        containerInfo.id,
        containerInfo.name
      );
      this.collectors.set(containerInfo.id, collector);
    }
  }

  /**
   * Start metrics collection for all containers
   */
  async startAll(intervalMs = DEFAULT_SAMPLE_INTERVAL_MS) {
    logger.info(`Starting metrics collection for all containers`);

    const startPromises = Array.from(this.collectors.values()).map(
      (collector) => collector.start(intervalMs)
    );

    await Promise.all(startPromises);
  }

  /**
   * Start metrics collection for a specific container
   */
  async startContainer(containerId, intervalMs = DEFAULT_SAMPLE_INTERVAL_MS) {
    const collector = this.collectors.get(containerId);
    if (collector) {
      await collector.start(intervalMs);
    } else {
      logger.warn(`No collector found for container ${containerId}`);
    }
  }

  /**
   * Stop metrics collection for all containers
   */
  async stopAll() {
    this.overallEndTime = new Date();
    logger.info(`Stopping metrics collection for all containers`);

    const stopPromises = Array.from(this.collectors.values()).map((collector) =>
      collector.stop()
    );

    await Promise.all(stopPromises);
  }

  /**
   * Stop metrics collection for a specific container
   */
  async stopContainer(containerId) {
    const collector = this.collectors.get(containerId);
    if (collector) {
      await collector.stop();
    } else {
      logger.warn(`No collector found for container ${containerId}`);
    }
  }

  /**
   * Generate complete metrics report
   */
  generateReport() {
    const containersSummary = [];
    const totalResourceUsage = {
      memory_peak_mb: 0,
      memory_avg_mb: 0,
      cpu_avg_percent: 0,
      cpu_time_seconds: 0,
      network_rx_mb: 0,
      network_tx_mb: 0,
      disk_read_mb: 0,
      disk_write_mb: 0,
    };

    // Collect summaries from each container
    for (const [containerId, collector] of this.collectors.entries()) {
      const summary = collector.getSummary();

      containersSummary.push({
        container_id: containerId,
        container_name: collector.containerName,
        status: "success", // This should come from execution results
        execution_time_seconds: summary.execution_time_seconds,
        resource_usage: {
          memory_peak_mb: summary.memory_peak_mb,
          memory_avg_mb: summary.memory_avg_mb,
          cpu_avg_percent: summary.cpu_avg_percent,
          cpu_time_seconds: summary.cpu_time_seconds,
          network_rx_mb: summary.network_rx_mb,
          network_tx_mb: summary.network_tx_mb,
          disk_read_mb: summary.disk_read_mb,
          disk_write_mb: summary.disk_write_mb,
        },
      });

      // Aggregate totals
      totalResourceUsage.memory_peak_mb = Math.max(
        totalResourceUsage.memory_peak_mb,
        summary.memory_peak_mb
      );
      totalResourceUsage.memory_avg_mb += summary.memory_avg_mb;
      totalResourceUsage.cpu_avg_percent += summary.cpu_avg_percent;
      totalResourceUsage.cpu_time_seconds += summary.cpu_time_seconds;
      totalResourceUsage.network_rx_mb += summary.network_rx_mb;
      totalResourceUsage.network_tx_mb += summary.network_tx_mb;
      totalResourceUsage.disk_read_mb += summary.disk_read_mb;
      totalResourceUsage.disk_write_mb += summary.disk_write_mb;
    }

    // Round aggregated values
    totalResourceUsage.memory_avg_mb =
      Math.round(totalResourceUsage.memory_avg_mb * 10) / 10;
    totalResourceUsage.cpu_avg_percent =
      Math.round(totalResourceUsage.cpu_avg_percent * 10) / 10;
    totalResourceUsage.cpu_time_seconds =
      Math.round(totalResourceUsage.cpu_time_seconds * 10) / 10;
    totalResourceUsage.network_rx_mb =
      Math.round(totalResourceUsage.network_rx_mb * 10) / 10;
    totalResourceUsage.network_tx_mb =
      Math.round(totalResourceUsage.network_tx_mb * 10) / 10;
    totalResourceUsage.disk_read_mb =
      Math.round(totalResourceUsage.disk_read_mb * 10) / 10;
    totalResourceUsage.disk_write_mb =
      Math.round(totalResourceUsage.disk_write_mb * 10) / 10;

    const executionTimeSeconds =
      this.overallStartTime && this.overallEndTime
        ? (this.overallEndTime - this.overallStartTime) / 1000
        : 0;

    return {
      submission_id: this.submissionId,
      problem_id: this.problemId,
      execution_time_seconds: Math.round(executionTimeSeconds * 10) / 10,
      containers_summary: containersSummary,
      total_resource_usage: totalResourceUsage,
    };
  }

  /**
   * Get time-series data for all containers
   */
  getTimeSeriesData() {
    const timeSeriesData = [];

    for (const collector of this.collectors.values()) {
      timeSeriesData.push(collector.getTimeSeries());
    }

    return {
      submission_id: this.submissionId,
      problem_id: this.problemId,
      containers: timeSeriesData,
    };
  }

  /**
   * Get chart-ready data for all containers
   */
  getChartData() {
    const chartData = [];

    for (const collector of this.collectors.values()) {
      chartData.push(collector.getChartData());
    }

    return {
      submission_id: this.submissionId,
      problem_id: this.problemId,
      containers: chartData,
    };
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(resultsDir) {
    try {
      const report = this.generateReport();
      const metricsPath = path.join(resultsDir, "metrics.json");

      await fs.writeFile(metricsPath, JSON.stringify(report, null, 2), "utf8");

      logger.info(`Metrics saved to ${metricsPath}`);
      return metricsPath;
    } catch (error) {
      logger.error("Failed to save metrics:", error);
      throw error;
    }
  }

  /**
   * Save time-series data to file
   */
  async saveTimeSeries(resultsDir) {
    try {
      const timeSeries = this.getTimeSeriesData();
      const timeSeriesPath = path.join(resultsDir, "metrics_timeseries.json");

      await fs.writeFile(
        timeSeriesPath,
        JSON.stringify(timeSeries, null, 2),
        "utf8"
      );

      logger.info(`Time-series metrics saved to ${timeSeriesPath}`);
      return timeSeriesPath;
    } catch (error) {
      logger.error("Failed to save time-series metrics:", error);
      throw error;
    }
  }
}

/**
 * Create a new metrics orchestrator
 */
function createMetricsOrchestrator() {
  return new MetricsOrchestrator();
}

module.exports = {
  ContainerMetricsCollector,
  MetricsOrchestrator,
  createMetricsOrchestrator,
  DEFAULT_SAMPLE_INTERVAL_MS,
};
