const Docker = require("dockerode");
const fs = require("fs/promises");
const path = require("path");
const tar = require("tar-fs");
const logger = require("../utils/logger");
const config = require("../config");

// Create docker client
const docker = new Docker(config.getDockerOptions());

/**
 * Build a problem image from problem package
 * @param {string} problemId - Problem identifier
 * @param {string} problemPackagePath - Path to extracted problem package directory
 * @param {object} options - Build options
 * @returns {Promise<string>} Image ID
 */
async function buildProblemImage(problemId, problemPackagePath, options = {}) {
  logger.info(`Building problem image for ${problemId}`);

  const imageName = `judgehost-problem-${problemId}:latest`;

  try {
    // Create tar stream from directory
    const tarStream = tar.pack(problemPackagePath);

    // Build image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
      dockerfile: options.dockerfile || "Dockerfile",
      labels: {
        "judgehost.problem_id": problemId,
        "judgehost.built_at": new Date().toISOString(),
      },
      buildargs: options.buildArgs || {},
    });

    // Process build stream
    return new Promise((resolve, reject) => {
      let timeoutHandle;

      // Set timeout if specified
      if (options.buildTimeout) {
        timeoutHandle = setTimeout(() => {
          reject(
            new Error(`Build timeout after ${options.buildTimeout} seconds`)
          );
        }, options.buildTimeout * 1000);
      }

      docker.modem.followProgress(
        stream,
        (err, res) => {
          if (timeoutHandle) clearTimeout(timeoutHandle);

          if (err) {
            logger.error(`Failed to build problem image ${problemId}:`, err);
            reject(err);
          } else {
            logger.info(`Successfully built problem image ${imageName}`);
            resolve(imageName);
          }
        },
        (event) => {
          if (event.stream) {
            logger.debug(`Build: ${event.stream.trim()}`);
          }
          if (event.error) {
            logger.error(`Build error: ${event.error}`);
          }
        }
      );
    });
  } catch (error) {
    logger.error(`Error building problem image ${problemId}:`, error);
    throw error;
  }
}

/**
 * Build evaluation image on top of problem image
 * @param {string} problemImage - Base problem image name
 * @param {string} submissionId - Submission identifier
 * @param {string} submissionPath - Path to submission code
 * @returns {Promise<string>} Evaluation image name
 */
async function buildEvaluationImage(
  problemImage,
  submissionId,
  submissionPath
) {
  logger.info(`Building evaluation image for submission ${submissionId}`);

  const imageName = `judgehost-eval-${submissionId}:latest`;

  try {
    // Create Dockerfile for evaluation image
    const dockerfile = `
FROM ${problemImage}

# Copy submission code
COPY . /workspace/

# Set working directory
WORKDIR /workspace

# Metadata
LABEL judgehost.submission_id="${submissionId}"
LABEL judgehost.built_at="${new Date().toISOString()}"
`;

    // Create temporary directory with Dockerfile
    const tempDir = path.join(config.paths.workDir, `build-${submissionId}`);
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, "Dockerfile"), dockerfile);

    // Copy submission files to temp dir
    await fs.cp(submissionPath, tempDir, {
      recursive: true,
      filter: (src) => {
        return !src.includes("Dockerfile"); // Don't copy our generated Dockerfile
      },
    });

    // Create tar stream
    const tarStream = tar.pack(tempDir);

    // Build evaluation image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
    });

    return new Promise((resolve, reject) => {
      docker.modem.followProgress(
        stream,
        async (err, res) => {
          // Cleanup temp directory
          await fs
            .rm(tempDir, { recursive: true, force: true })
            .catch(() => {});

          if (err) {
            logger.error(`Failed to build evaluation image:`, err);
            reject(err);
          } else {
            logger.info(`Successfully built evaluation image ${imageName}`);
            resolve(imageName);
          }
        },
        (event) => {
          if (event.stream) {
            logger.debug(`Build: ${event.stream.trim()}`);
          }
        }
      );
    });
  } catch (error) {
    logger.error(`Error building evaluation image:`, error);
    throw error;
  }
}

/**
 * Create container for evaluation
 * @param {string} imageId - Image to use
 * @param {string} submissionId - Submission identifier
 * @param {object} problem - Problem configuration
 * @param {object} options - Container options
 * @returns {Promise<string>} Container ID
 */
async function createEvaluationContainer(
  imageId,
  submissionId,
  problem,
  options = {}
) {
  logger.info(`Creating evaluation container for ${submissionId}`);

  const containerName = `eval-${submissionId}`;

  // Prepare environment variables
  const envVars = [
    `SUBMISSION_ID=${submissionId}`,
    `PROBLEM_ID=${problem.problemId}`,
    `PROBLEM_TYPE=${problem.projectType || "algorithm"}`,
    `EVAL_TIMESTAMP=${new Date().toISOString()}`,
    `WORKSPACE_DIR=/workspace`,
    `OUTPUT_DIR=/out`,
    `PROBLEM_DIR=/problem`,
    `HOOKS_DIR=/hooks`,
    `UTILS_DIR=/utils`,
    ...Object.entries(problem.environment || {}).map(([k, v]) => `${k}=${v}`),
  ];

  // Prepare resource limits
  const memoryMB =
    options.memoryMB || problem.memoryMB || config.docker.defaultMemoryMB;
  const cpuCores =
    options.cpuCores || problem.cpuCores || config.docker.defaultCpuCores;

  // Create container config
  const containerConfig = {
    Image: imageId,
    name: containerName,
    Env: envVars,
    WorkingDir: "/workspace",
    Cmd: options.cmd || ["/bin/bash", "/utils/universal_entrypoint.sh"],
    HostConfig: {
      // Network configuration
      NetworkMode: problem.networkEnabled ? "bridge" : "none",

      // Resource limits
      Memory: memoryMB * 1024 * 1024, // Convert MB to bytes
      MemorySwap: memoryMB * 1024 * 1024, // Same as memory (no swap)
      NanoCpus: Math.floor(cpuCores * 1e9), // Convert cores to nanocpus

      // Security
      ReadonlyRootfs: false,
      SecurityOpt:
        config.security.containerProfile === "restricted"
          ? ["no-new-privileges:true"]
          : [],

      // Bind mounts
      Binds: [`${path.join(config.paths.resultsDir, submissionId)}:/out:rw`],

      // Auto-remove (if configured)
      AutoRemove: false, // We'll handle cleanup manually
    },
    Labels: {
      "judgehost.submission_id": submissionId,
      "judgehost.problem_id": problem.problemId,
      "judgehost.created_at": new Date().toISOString(),
    },
  };

  try {
    const container = await docker.createContainer(containerConfig);
    logger.info(`Created container ${container.id} for ${submissionId}`);
    return container.id;
  } catch (error) {
    logger.error(`Failed to create container:`, error);
    throw error;
  }
}

/**
 * Execute container with timeout
 * @param {string} containerId - Container ID
 * @param {object} options - Execution options
 * @returns {Promise<object>} Execution result
 */
async function executeContainer(containerId, options = {}) {
  const container = docker.getContainer(containerId);

  logger.info(`Starting container ${containerId}`);

  try {
    // Start container
    await container.start();

    // Create timeout promise
    const timeoutMs = options.timeout || config.docker.defaultTimeout;
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(
        () =>
          reject(new Error(`Container execution timeout after ${timeoutMs}ms`)),
        timeoutMs
      )
    );

    // Wait for container to finish or timeout
    let timedOut = false;
    const result = await Promise.race([
      container.wait(),
      timeoutPromise.catch((err) => {
        timedOut = true;
        throw err;
      }),
    ]).catch(async (err) => {
      if (timedOut) {
        // Stop container on timeout
        logger.warn(`Container ${containerId} timed out, stopping...`);
        await container.stop().catch(() => {});
        await container.kill().catch(() => {});
      }
      throw err;
    });

    // Get logs
    const logsStream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
    });

    const logs = logsStream.toString("utf8");

    // Get container stats
    const stats = await container.stats({ stream: false });

    logger.info(
      `Container ${containerId} finished with status ${result.StatusCode}`
    );

    return {
      statusCode: result.StatusCode,
      logs,
      stats,
      timedOut: false,
    };
  } catch (error) {
    if (error.message.includes("timeout")) {
      return {
        statusCode: -1,
        logs: await container
          .logs({
            stdout: true,
            stderr: true,
          })
          .then((l) => l.toString("utf8"))
          .catch(() => ""),
        timedOut: true,
        error: error.message,
      };
    }

    logger.error(`Error executing container ${containerId}:`, error);
    throw error;
  }
}

/**
 * Get container logs
 * @param {string} containerId - Container ID
 * @returns {Promise<string>} Container logs
 */
async function getContainerLogs(containerId) {
  const container = docker.getContainer(containerId);

  try {
    const logsStream = await container.logs({
      stdout: true,
      stderr: true,
      timestamps: true,
    });

    return logsStream.toString("utf8");
  } catch (error) {
    logger.error(`Error getting logs for container ${containerId}:`, error);
    throw error;
  }
}

/**
 * Stop container
 * @param {string} containerId - Container ID
 * @param {number} timeout - Stop timeout in seconds
 */
async function stopContainer(containerId, timeout = 10) {
  const container = docker.getContainer(containerId);

  try {
    logger.info(`Stopping container ${containerId}`);
    await container.stop({ t: timeout });
    logger.info(`Stopped container ${containerId}`);
  } catch (error) {
    if (error.statusCode === 304) {
      // Container already stopped
      logger.debug(`Container ${containerId} already stopped`);
    } else {
      logger.error(`Error stopping container ${containerId}:`, error);
      throw error;
    }
  }
}

/**
 * Cleanup container and optionally image
 * @param {string} containerId - Container ID
 * @param {boolean} removeImage - Whether to remove the image
 * @returns {Promise<boolean>} Success status
 */
async function cleanup(containerId, removeImage = false) {
  const container = docker.getContainer(containerId);

  try {
    // Get container info
    const info = await container.inspect().catch(() => null);

    if (info) {
      // Stop if running
      if (info.State.Running) {
        await stopContainer(containerId);
      }

      // Remove container
      logger.info(`Removing container ${containerId}`);
      await container.remove({ force: true });

      // Optionally remove image
      if (removeImage && info.Image) {
        try {
          const image = docker.getImage(info.Image);
          logger.info(`Removing image ${info.Image}`);
          await image.remove({ force: true });
        } catch (err) {
          logger.warn(`Could not remove image ${info.Image}:`, err.message);
        }
      }
    }

    logger.info(`Cleaned up container ${containerId}`);
    return true;
  } catch (error) {
    logger.error(`Error cleaning up container ${containerId}:`, error);
    return false;
  }
}

/**
 * List all judgehost containers
 * @returns {Promise<Array>} List of containers
 */
async function listJudgehostContainers() {
  try {
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: ["judgehost.submission_id"],
      },
    });

    return containers;
  } catch (error) {
    logger.error("Error listing containers:", error);
    throw error;
  }
}

/**
 * Copy files from container to host
 * @param {string} containerId - Container ID
 * @param {string} containerPath - Path inside container
 * @param {string} hostPath - Destination path on host
 * @returns {Promise<boolean>} Success status
 */
async function copyFromContainer(containerId, containerPath, hostPath) {
  const fs = require("fs/promises");
  const stream = require("stream");
  const { promisify } = require("util");
  const pipeline = promisify(stream.pipeline);

  try {
    const container = docker.getContainer(containerId);

    // Get archive stream from container
    const tarStream = await container.getArchive({ path: containerPath });

    // Create extraction stream
    const extract = tar.extract(hostPath);

    // Pipe tar stream to extraction
    await pipeline(tarStream, extract);

    logger.info(
      `Copied ${containerPath} from container ${containerId} to ${hostPath}`
    );
    return true;
  } catch (error) {
    logger.error(`Error copying from container ${containerId}:`, error.message);
    return false;
  }
}

/**
 * Cleanup old containers (older than specified days)
 * @param {number} days - Age threshold in days
 * @returns {Promise<number>} Number of containers cleaned up
 */
async function cleanupOldContainers(days = 7) {
  try {
    const containers = await listJudgehostContainers();
    const threshold = Date.now() - days * 24 * 60 * 60 * 1000;

    let cleaned = 0;

    for (const containerInfo of containers) {
      const createdAt = new Date(containerInfo.Created * 1000).getTime();

      if (createdAt < threshold) {
        logger.info(`Cleaning up old container ${containerInfo.Id}`);
        await cleanup(containerInfo.Id, true);
        cleaned++;
      }
    }

    logger.info(`Cleaned up ${cleaned} old containers`);
    return cleaned;
  } catch (error) {
    logger.error("Error cleaning up old containers:", error);
    throw error;
  }
}

module.exports = {
  buildProblemImage,
  buildEvaluationImage,
  createEvaluationContainer,
  executeContainer,
  getContainerLogs,
  stopContainer,
  cleanup,
  copyFromContainer,
  listJudgehostContainers,
  cleanupOldContainers,
};
