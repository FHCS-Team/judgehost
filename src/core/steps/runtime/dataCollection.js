/**
 * Data collection step
 * Collects data from running containers
 */

/**
 * Execute data collection
 * @param {Object} step - Step configuration
 * @param {string} step.collection_type - Collection type: 'logs', 'files', 'metrics', 'artifacts'
 * @param {Object} step.config - Type-specific configuration
 * @param {Object} container - Docker container instance
 * @param {string} outputDir - Output directory for collected data
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Collection result
 */
async function executeDataCollection(step, container, outputDir, logger) {
  if (!step.collection_type) {
    throw new Error("Data collection step requires 'collection_type' property");
  }

  logger.info(`Collecting data: ${step.collection_type}`);

  switch (step.collection_type) {
    case "logs":
      return await collectLogs(step, container, outputDir, logger);

    case "files":
      return await collectFiles(step, container, outputDir, logger);

    case "metrics":
      return await collectMetrics(step, container, outputDir, logger);

    case "artifacts":
      return await collectArtifacts(step, container, outputDir, logger);

    default:
      throw new Error(`Unknown collection type: ${step.collection_type}`);
  }
}

/**
 * Collect container logs
 */
async function collectLogs(step, container, outputDir, logger) {
  const fs = require("fs/promises");
  const path = require("path");

  const { stdout = true, stderr = true, timestamps = true } = step.config || {};

  const logs = await container.logs({
    stdout,
    stderr,
    timestamps,
  });

  const logContent = logs.toString("utf8");
  const logFile = path.join(outputDir, "container_logs.txt");

  await fs.writeFile(logFile, logContent);

  return {
    type: "logs",
    success: true,
    filePath: logFile,
    size: logContent.length,
  };
}

/**
 * Collect specific files from container
 */
async function collectFiles(step, container, outputDir, logger) {
  const fs = require("fs/promises");
  const path = require("path");
  const tar = require("tar-fs");

  const { paths } = step.config || {};

  if (!paths || !Array.isArray(paths)) {
    throw new Error("File collection requires 'paths' array in config");
  }

  const collected = [];

  for (const filePath of paths) {
    try {
      const stream = await container.getArchive({ path: filePath });
      const extractPath = path.join(outputDir, "collected_files");

      await fs.mkdir(extractPath, { recursive: true });

      await new Promise((resolve, reject) => {
        stream
          .pipe(tar.extract(extractPath))
          .on("finish", resolve)
          .on("error", reject);
      });

      collected.push({
        path: filePath,
        success: true,
        extractedTo: extractPath,
      });
    } catch (error) {
      collected.push({
        path: filePath,
        success: false,
        error: error.message,
      });
    }
  }

  return {
    type: "files",
    success: collected.some((c) => c.success),
    collected,
  };
}

/**
 * Collect container metrics
 */
async function collectMetrics(step, container, outputDir, logger) {
  const fs = require("fs/promises");
  const path = require("path");

  const stats = await container.stats({ stream: false });

  const metrics = {
    timestamp: new Date().toISOString(),
    cpu: {
      usage: stats.cpu_stats.cpu_usage.total_usage,
      system_usage: stats.cpu_stats.system_cpu_usage,
      online_cpus: stats.cpu_stats.online_cpus,
    },
    memory: {
      usage: stats.memory_stats.usage,
      max_usage: stats.memory_stats.max_usage,
      limit: stats.memory_stats.limit,
      stats: stats.memory_stats.stats,
    },
    network: stats.networks,
    blkio: stats.blkio_stats,
  };

  const metricsFile = path.join(outputDir, "container_metrics.json");
  await fs.writeFile(metricsFile, JSON.stringify(metrics, null, 2));

  return {
    type: "metrics",
    success: true,
    filePath: metricsFile,
    metrics,
  };
}

/**
 * Collect test artifacts
 */
async function collectArtifacts(step, container, outputDir, logger) {
  const { artifact_paths, output_format = "json" } = step.config || {};

  if (!artifact_paths) {
    throw new Error("Artifact collection requires 'artifact_paths' in config");
  }

  // This is typically handled by volume mounts
  // Artifacts should be written to /out by the container
  return {
    type: "artifacts",
    success: true,
    message: "Artifacts collected via volume mount",
    paths: artifact_paths,
  };
}

module.exports = { executeDataCollection };
