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
 * Build a container image for a specific container in a multi-container problem
 * @param {string} problemId - Problem identifier
 * @param {string} containerId - Container identifier
 * @param {string} containerPath - Path to container directory (containing Dockerfile)
 * @param {object} options - Build options
 * @returns {Promise<string>} Image name
 */
async function buildContainerImage(
  problemId,
  containerId,
  containerPath,
  options = {}
) {
  logger.info(`Building container image for ${problemId}/${containerId}`);

  const imageName = `judgehost-${problemId}-${containerId}:latest`;

  try {
    // Create tar stream from container directory
    const tarStream = tar.pack(containerPath);

    // Build image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
      dockerfile: options.dockerfile || "Dockerfile",
      labels: {
        "judgehost.problem_id": problemId,
        "judgehost.container_id": containerId,
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
            logger.error(
              `Failed to build container image ${problemId}/${containerId}:`,
              err
            );
            reject(err);
          } else {
            logger.info(`Successfully built container image ${imageName}`);
            resolve(imageName);
          }
        },
        (event) => {
          if (event.stream) {
            logger.debug(`Build [${containerId}]: ${event.stream.trim()}`);
          }
          if (event.error) {
            logger.error(`Build error [${containerId}]: ${event.error}`);
          }
        }
      );
    });
  } catch (error) {
    logger.error(
      `Error building container image ${problemId}/${containerId}:`,
      error
    );
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
    // NOTE: Dependencies are pre-installed in problem image
    // Submissions cannot install additional packages (security/control)
    const dockerfile = `
FROM ${problemImage}

# Copy submission code to submission directory
COPY . /workspace/submission/

# Create symlink so submission can use problem's node_modules
# This allows submissions to require('express') etc. without installing
RUN if [ -d /workspace/problem/node_modules ]; then \\
      ln -s /workspace/problem/node_modules /workspace/submission/node_modules || true; \\
    fi

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
    `PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin`,
    `SUBMISSION_ID=${submissionId}`,
    `PROBLEM_ID=${problem.problemId}`,
    `PROBLEM_TYPE=${
      problem.projectType || problem.project_type || "algorithm"
    }`,
    `EVAL_TIMESTAMP=${new Date().toISOString()}`,
    `WORKSPACE_DIR=/workspace`,
    `OUT_DIR=/out`,
    `PROBLEM_DIR=/workspace/problem`,
    `SUBMISSION_DIR=/workspace/submission`,
    `HOOKS_DIR=/hooks`,
    `UTILS_DIR=/utils`,
    `TOOLS_DIR=/utils`,
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
    Cmd: options.cmd || cmd,
    HostConfig: {
      // Network configuration
      NetworkMode: problem.network_enabled ? "bridge" : "none",

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
      Binds: [
        `${path.join(config.paths.resultsDir, submissionId)}:/out:rw`,
        `${path.join(__dirname, "../../docker")}:/utils:ro`,
        `${path.join(
          config.paths.problemsDir,
          problem.problemId,
          "hooks"
        )}:/hooks:ro`,
      ],

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

// ============================================================================
// SIDECAR ARCHITECTURE FUNCTIONS
// ============================================================================

/**
 * Create an isolated Docker network for sidecar evaluation
 * @param {string} submissionId - Submission identifier
 * @returns {Promise<string>} Network ID
 */
async function createNetwork(submissionId) {
  const networkName = `judgehost-eval-${submissionId}`;

  try {
    logger.info(`Creating network ${networkName}`);

    const network = await docker.createNetwork({
      Name: networkName,
      Driver: "bridge",
      Internal: true, // No external network access
      Attachable: false,
      Labels: {
        "judgehost.submission_id": submissionId,
        "judgehost.created_at": new Date().toISOString(),
      },
      Options: {
        "com.docker.network.bridge.enable_icc": "true", // Allow inter-container communication
        "com.docker.network.bridge.enable_ip_masquerade": "false", // No external masquerading
      },
    });

    logger.info(`Created network ${networkName} (${network.id})`);
    return network.id;
  } catch (error) {
    logger.error(`Failed to create network ${networkName}:`, error);
    throw error;
  }
}

/**
 * Remove an isolated Docker network
 * @param {string} submissionId - Submission identifier
 * @returns {Promise<boolean>} Success status
 */
async function removeNetwork(submissionId) {
  const networkName = `judgehost-eval-${submissionId}`;

  try {
    const network = docker.getNetwork(networkName);
    await network.remove();
    logger.info(`Removed network ${networkName}`);
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug(`Network ${networkName} not found, already removed`);
      return true;
    }
    logger.error(`Failed to remove network ${networkName}:`, error);
    return false;
  }
}

/**
 * Build submission image from problem image (no dependency installation)
 * @param {string} problemImage - Base problem image name
 * @param {string} submissionId - Submission identifier
 * @param {string} submissionPath - Path to submission code
 * @returns {Promise<string>} Submission image name
 */
async function buildSubmissionImage(
  problemImage,
  submissionId,
  submissionPath
) {
  logger.info(
    `Building submission image for ${submissionId} from ${problemImage}`
  );

  const imageName = `judgehost-submission-${submissionId}:latest`;

  try {
    // Create minimal Dockerfile that only copies submission code
    // Dependencies are already in the problem image
    const dockerfile = `
FROM ${problemImage}

# Copy submission code to workspace
COPY . /workspace/submission/

# Set working directory
WORKDIR /workspace/submission

# Metadata
LABEL judgehost.submission_id="${submissionId}"
LABEL judgehost.type="submission"
LABEL judgehost.built_at="${new Date().toISOString()}"
`;

    // Create temporary directory with Dockerfile
    const tempDir = path.join(
      config.paths.workDir,
      `build-sub-${submissionId}`
    );
    await fs.mkdir(tempDir, { recursive: true });
    await fs.writeFile(path.join(tempDir, "Dockerfile"), dockerfile);

    // Copy submission files to temp dir
    await fs.cp(submissionPath, tempDir, {
      recursive: true,
      filter: (src) => {
        const basename = path.basename(src);
        // Exclude common non-essential files
        return !["Dockerfile", ".git", "node_modules", ".DS_Store"].includes(
          basename
        );
      },
    });

    // Create tar stream
    const tarStream = tar.pack(tempDir);

    // Build submission image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
      networkmode: "none", // No network during build
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
            logger.error(`Failed to build submission image:`, err);
            reject(err);
          } else {
            logger.info(`Successfully built submission image ${imageName}`);
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
    logger.error(`Error building submission image:`, error);
    throw error;
  }
}

/**
 * Create submission container (runs submission code)
 * @param {string} submissionImage - Submission image name
 * @param {string} submissionId - Submission identifier
 * @param {string} networkName - Network name to attach to
 * @param {object} problem - Problem configuration
 * @param {object} options - Container options
 * @returns {Promise<string>} Container ID
 */
async function createSubmissionContainer(
  submissionImage,
  submissionId,
  networkName,
  problem,
  options = {}
) {
  logger.info(`Creating submission container for ${submissionId}`);

  const containerName = `submission-${submissionId}`;

  // Prepare environment variables
  const envVars = [
    `SUBMISSION_ID=${submissionId}`,
    `PROBLEM_ID=${problem.problemId}`,
    `PROBLEM_TYPE=${problem.projectType || problem.project_type || "api"}`,
    `NODE_ENV=production`,
    ...Object.entries(problem.environment || {}).map(([k, v]) => `${k}=${v}`),
  ];

  // Resource limits
  const memoryMB =
    options.memoryMB || problem.memoryMB || config.docker.defaultMemoryMB;
  const cpuCores =
    options.cpuCores || problem.cpuCores || config.docker.defaultCpuCores;

  // Get command from problem config or use default
  const cmd = problem.submission_container?.command ||
    options.cmd || ["npm", "start"];

  // Get exposed ports
  const exposedPorts = {};
  const ports = problem.submission_container?.expose || [3000];
  ports.forEach((port) => {
    exposedPorts[`${port}/tcp`] = {};
  });

  const containerConfig = {
    Image: submissionImage,
    name: containerName,
    Hostname: containerName, // Allow sidecar to reference by name
    Env: envVars,
    WorkingDir: "/workspace/submission",
    Cmd: cmd,
    ExposedPorts: exposedPorts,
    HostConfig: {
      NetworkMode: networkName, // Attach to isolated network
      Memory: memoryMB * 1024 * 1024,
      MemorySwap: memoryMB * 1024 * 1024,
      NanoCpus: Math.floor(cpuCores * 1e9),
      ReadonlyRootfs: false,
      SecurityOpt: ["no-new-privileges:true"],
    },
    Labels: {
      "judgehost.submission_id": submissionId,
      "judgehost.problem_id": problem.problemId,
      "judgehost.type": "submission",
      "judgehost.created_at": new Date().toISOString(),
    },
  };

  try {
    const container = await docker.createContainer(containerConfig);
    logger.info(
      `Created submission container ${container.id} for ${submissionId}`
    );
    return container.id;
  } catch (error) {
    logger.error(`Failed to create submission container:`, error);
    throw error;
  }
}

/**
 * Create sidecar container (runs tests against submission)
 * @param {string} problemImage - Problem image name
 * @param {string} submissionId - Submission identifier
 * @param {string} networkName - Network name to attach to
 * @param {string} submissionContainerName - Name of submission container to test
 * @param {object} problem - Problem configuration
 * @param {string} resultsDir - Path to results directory on host
 * @returns {Promise<string>} Container ID
 */
async function createSidecarContainer(
  problemImage,
  submissionId,
  networkName,
  submissionContainerName,
  problem,
  resultsDir
) {
  logger.info(`Creating sidecar container for ${submissionId}`);

  const containerName = `sidecar-${submissionId}`;

  // Prepare environment variables
  const envVars = [
    `SUBMISSION_ID=${submissionId}`,
    `PROBLEM_ID=${problem.problemId}`,
    `SUBMISSION_URL=http://${submissionContainerName}:3000`, // Default port
    `SUBMISSION_HOST=${submissionContainerName}`,
    `OUT_DIR=/out`,
    `HOOKS_DIR=/hooks`,
    ...Object.entries(problem.environment || {}).map(([k, v]) => `${k}=${v}`),
  ];

  // Get test script from problem config
  const testScript =
    problem.sidecar_container?.test_script || "/hooks/sidecar/run_tests.sh";

  const containerConfig = {
    Image: problemImage,
    name: containerName,
    Hostname: containerName,
    Env: envVars,
    WorkingDir: "/workspace",
    Cmd: ["/bin/bash", testScript],
    HostConfig: {
      NetworkMode: networkName, // Attach to isolated network
      Memory: 512 * 1024 * 1024, // Sidecar gets fixed 512MB
      MemorySwap: 512 * 1024 * 1024,
      NanoCpus: Math.floor(1.0 * 1e9), // 1 CPU core
      ReadonlyRootfs: false,
      SecurityOpt: ["no-new-privileges:true"],
      Binds: [
        `${resultsDir}:/out:rw`, // Mount results directory
        `${path.join(
          config.paths.problemsDir,
          problem.problemId,
          "hooks"
        )}:/hooks:ro`, // Mount test scripts
        `${path.join(
          config.paths.problemsDir,
          problem.problemId,
          "data"
        )}:/data:ro`, // Mount test data
      ],
    },
    Labels: {
      "judgehost.submission_id": submissionId,
      "judgehost.problem_id": problem.problemId,
      "judgehost.type": "sidecar",
      "judgehost.created_at": new Date().toISOString(),
    },
  };

  try {
    const container = await docker.createContainer(containerConfig);
    logger.info(
      `Created sidecar container ${container.id} for ${submissionId}`
    );
    return container.id;
  } catch (error) {
    logger.error(`Failed to create sidecar container:`, error);
    throw error;
  }
}

/**
 * Wait for container to be healthy/ready
 * @param {string} containerId - Container ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @param {number} intervalMs - Check interval in milliseconds
 * @returns {Promise<boolean>} True if ready, false if timeout
 */
async function waitForContainer(
  containerId,
  timeoutMs = 30000,
  intervalMs = 1000
) {
  const container = docker.getContainer(containerId);
  const startTime = Date.now();

  logger.info(`Waiting for container ${containerId} to be ready...`);

  while (Date.now() - startTime < timeoutMs) {
    try {
      const info = await container.inspect();

      if (info.State.Running) {
        // Container is running, give it a moment to initialize
        await new Promise((resolve) => setTimeout(resolve, 2000));
        logger.info(`Container ${containerId} is ready`);
        return true;
      }

      if (info.State.Status === "exited") {
        logger.warn(`Container ${containerId} exited prematurely`);
        return false;
      }
    } catch (error) {
      logger.warn(`Error checking container status:`, error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  logger.warn(`Timeout waiting for container ${containerId}`);
  return false;
}

// ============================================================================
// MULTI-CONTAINER ORCHESTRATION
// ============================================================================

/**
 * Create a container group for multi-container problems
 * @param {string} submissionId - Submission identifier
 * @param {Object} problem - Problem configuration
 * @param {Object} submissionPackages - Map of packageId -> extracted path
 * @param {string} resultsDir - Results directory path
 * @returns {Promise<Object>} Container group info
 */
async function createContainerGroup(
  submissionId,
  problem,
  submissionPackages,
  resultsDir
) {
  logger.info(
    `Creating container group for multi-container submission ${submissionId}`
  );

  const containerBuilder = require("./containerBuilder");
  const resourceMounting = require("../utils/resourceMounting");
  const networkName = `judgehost-eval-${submissionId}`;

  try {
    // 0. Ensure results directory structure exists
    const containerIds = problem.containers.map((c) => c.container_id);
    await resourceMounting.ensureResultsDirectories(resultsDir, containerIds);
    logger.info(
      `Results directory structure created for ${containerIds.length} containers`
    );

    // 1. Create isolated network
    logger.info(`Creating network ${networkName}`);
    const networkId = await createNetwork(submissionId);

    // 2. Build and create containers
    const containers = [];
    const containerImages = new Map();

    // Sort containers by dependencies (topological sort)
    const sortedContainers = topologicalSort(problem.containers || []);

    for (const containerConfig of sortedContainers) {
      const containerId = containerConfig.container_id;
      const role = containerConfig.role || "unknown";

      logger.info(`Processing container: ${containerId} (${role})`);

      let imageName;

      // Build container image
      if (containerConfig.accepts_submission) {
        // This container accepts submission code
        const packageId = containerConfig.submission_package_id;
        const submissionPath = submissionPackages[packageId];

        if (!submissionPath) {
          throw new Error(
            `Submission package ${packageId} not found for container ${containerId}`
          );
        }

        // Check if problem image already exists (built during registration)
        const problemImageName = `judgehost-${problem.problemId}-${containerId}:latest`;
        let baseImage = containerConfig.base_image || "alpine:latest";

        try {
          // Try to get the problem image
          const problemImage = docker.getImage(problemImageName);
          await problemImage.inspect();
          // Image exists, use it
          baseImage = problemImageName;
          logger.info(`Using pre-built problem image: ${problemImageName}`);
        } catch (error) {
          // Image doesn't exist, build it if we have build steps
          logger.info(
            `Problem image ${problemImageName} not found, checking for build steps`
          );

          if (
            containerConfig.build_steps &&
            containerConfig.build_steps.length > 0
          ) {
            await containerBuilder.buildProblemContainer(
              problem.problemId,
              containerConfig,
              path.join(config.paths.problemsDir, problem.problemId),
              {}
            );
            baseImage = problemImageName;
          }
        }

        // Then build submission on top
        imageName = await containerBuilder.buildSubmissionContainer(
          baseImage,
          submissionId,
          packageId,
          submissionPath,
          containerConfig
        );
      } else {
        // This is a sidecar/support container (no submission code)
        imageName = await containerBuilder.buildProblemContainer(
          problem.problemId,
          containerConfig,
          path.join(config.paths.problemsDir, problem.problemId),
          {}
        );
      }

      containerImages.set(containerId, imageName);

      // Get submission path if this container accepts submission
      const containerSubmissionPath = containerConfig.accepts_submission
        ? submissionPackages[containerConfig.submission_package_id]
        : null;

      // Create container with proper mounts
      const dockerContainerId = await createMultiContainer(
        imageName,
        submissionId,
        containerId,
        networkName,
        problem,
        containerConfig,
        resultsDir,
        containerSubmissionPath
      );

      containers.push({
        containerId,
        role,
        dockerContainerId,
        imageName,
        config: containerConfig,
      });

      logger.info(
        `Created container ${containerId}: ${dockerContainerId.substring(
          0,
          12
        )}`
      );
    }

    return {
      networkId,
      networkName,
      containers,
      submissionId,
    };
  } catch (error) {
    logger.error(
      `Failed to create container group for ${submissionId}:`,
      error
    );
    // Cleanup on failure
    await cleanupContainerGroup(submissionId).catch(() => {});
    throw error;
  }
}

/**
 * Create a single container in a multi-container setup
 * @param {string} imageName - Docker image name
 * @param {string} submissionId - Submission identifier
 * @param {string} containerId - Container identifier from problem config
 * @param {string} networkName - Network name
 * @param {Object} problem - Problem configuration
 * @param {Object} containerConfig - Container-specific configuration
 * @param {string} resultsDir - Results directory path
 * @param {string} [submissionPath] - Path to submission code (if accepts_submission)
 * @returns {Promise<string>} Docker container ID
 */
async function createMultiContainer(
  imageName,
  submissionId,
  containerId,
  networkName,
  problem,
  containerConfig,
  resultsDir,
  submissionPath = null
) {
  const containerName = `${containerId}-${submissionId}`;

  // Prepare environment variables
  const envVars = [
    `SUBMISSION_ID=${submissionId}`,
    `PROBLEM_ID=${problem.problemId}`,
    `CONTAINER_ID=${containerId}`,
    `CONTAINER_ROLE=${containerConfig.role || "unknown"}`,
    ...Object.entries(containerConfig.environment || {}).map(
      ([k, v]) => `${k}=${v}`
    ),
    ...Object.entries(problem.environment || {}).map(([k, v]) => `${k}=${v}`),
  ];

  // Resource limits
  const resourceLimits = containerConfig.resource_limits || {};
  const memoryMB = parseMemory(
    resourceLimits.memory || problem.resource_limits?.memory || "512m"
  );
  const cpuCores = resourceLimits.cpus || problem.resource_limits?.cpus || 1.0;

  // Exposed ports
  const exposedPorts = {};
  const ports = containerConfig.ports || [];
  ports.forEach((port) => {
    exposedPorts[`${port}/tcp`] = {};
  });

  // Prepare resource mounts using the new mounting utility
  const resourceMounting = require("../utils/resourceMounting");
  const mounts = await resourceMounting.prepareMounts({
    submissionId,
    problemId: problem.problemId,
    containerId,
    containerConfig,
    submissionPath,
    resultsDir,
  });

  // Log mount statistics
  const mountStats = resourceMounting.getMountStatistics(mounts);
  logger.debug(`Mount statistics for ${containerId}:`, mountStats);

  const { binds, volumes } = mounts;

  // Determine network mode
  const networkMode =
    containerConfig.network_mode === "none"
      ? "none"
      : containerConfig.network_mode === "bridge"
      ? "bridge"
      : networkName; // Default to internal network

  const dockerContainerConfig = {
    Image: imageName,
    name: containerName,
    Hostname: containerName,
    Env: envVars,
    WorkingDir: containerConfig.workdir || "/workspace",
    ExposedPorts: exposedPorts,
    Volumes: volumes, // Anonymous volumes for /workspace, /tmp, etc.
    HostConfig: {
      NetworkMode: networkMode,
      Memory: memoryMB * 1024 * 1024,
      MemorySwap: memoryMB * 1024 * 1024,
      NanoCpus: Math.floor(cpuCores * 1e9),
      ReadonlyRootfs: false,
      SecurityOpt: ["no-new-privileges:true"],
      Binds: binds,
    },
    Labels: {
      "judgehost.submission_id": submissionId,
      "judgehost.problem_id": problem.problemId,
      "judgehost.container_id": containerId,
      "judgehost.role": containerConfig.role || "unknown",
      "judgehost.created_at": new Date().toISOString(),
    },
    Healthcheck: containerConfig.health_check
      ? {
          Test: ["CMD-SHELL", containerConfig.health_check.command],
          Interval: (containerConfig.health_check.interval || 10) * 1e9,
          Timeout: (containerConfig.health_check.timeout || 5) * 1e9,
          Retries: containerConfig.health_check.retries || 3,
        }
      : undefined,
  };

  const container = await docker.createContainer(dockerContainerConfig);

  return container.id;
}

/**
 * Start containers in dependency order
 * @param {Object} containerGroup - Container group info
 * @returns {Promise<void>}
 */
async function startContainerGroup(containerGroup) {
  logger.info(`Starting container group for ${containerGroup.submissionId}`);

  for (const containerInfo of containerGroup.containers) {
    const { dockerContainerId, containerId, config } = containerInfo;

    logger.info(`Starting container ${containerId}`);
    const container = docker.getContainer(dockerContainerId);
    await container.start();

    // Wait for health check if configured
    if (config.health_check) {
      logger.info(`Waiting for health check on ${containerId}`);
      const healthy = await waitForContainerHealth(
        dockerContainerId,
        config.health_check.timeout * 1000 || 30000
      );

      if (!healthy) {
        throw new Error(`Container ${containerId} failed health check`);
      }
    }

    // Wait for container to be ready if it's a dependency
    const dependents = containerGroup.containers.filter((c) =>
      (c.config.depends_on || []).includes(containerId)
    );

    if (dependents.length > 0) {
      logger.info(`Waiting for ${containerId} to be ready for dependents`);
      await waitForContainer(dockerContainerId, 30000);
    }
  }

  logger.info(`All containers started for ${containerGroup.submissionId}`);
}

/**
 * Wait for all containers to complete
 * @param {Object} containerGroup - Container group info
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<Object>} Execution results
 */
async function waitForContainerGroup(containerGroup, timeoutMs) {
  logger.info(`Waiting for container group ${containerGroup.submissionId}`);

  const results = {};
  const startTime = Date.now();

  // Find the main execution container (usually the tester/sidecar)
  const executionContainers = containerGroup.containers.filter(
    (c) => c.role === "sidecar" || c.role === "tester"
  );

  if (executionContainers.length === 0) {
    throw new Error("No execution container found in group");
  }

  // Wait for execution containers to complete
  for (const containerInfo of executionContainers) {
    const remainingTime = timeoutMs - (Date.now() - startTime);

    if (remainingTime <= 0) {
      throw new Error("Container group execution timeout");
    }

    const container = docker.getContainer(containerInfo.dockerContainerId);

    try {
      const result = await Promise.race([
        container.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), remainingTime)
        ),
      ]);

      results[containerInfo.containerId] = {
        statusCode: result.StatusCode,
        exitCode: result.StatusCode,
      };
    } catch (error) {
      results[containerInfo.containerId] = {
        statusCode: -1,
        error: error.message,
        timedOut: true,
      };
    }
  }

  return results;
}

/**
 * Cleanup container group (all containers and network)
 * @param {string} submissionId - Submission identifier
 * @returns {Promise<boolean>} Success status
 */
async function cleanupContainerGroup(submissionId) {
  logger.info(`Cleaning up container group for ${submissionId}`);

  try {
    // Find all containers for this submission
    const containers = await docker.listContainers({
      all: true,
      filters: {
        label: [`judgehost.submission_id=${submissionId}`],
      },
    });

    // Stop and remove all containers
    for (const containerInfo of containers) {
      try {
        const container = docker.getContainer(containerInfo.Id);
        await container.stop({ t: 10 }).catch(() => {});
        await container.remove({ force: true }).catch(() => {});
        logger.debug(`Removed container ${containerInfo.Id}`);
      } catch (err) {
        logger.warn(
          `Failed to remove container ${containerInfo.Id}:`,
          err.message
        );
      }
    }

    // Remove network
    await removeNetwork(submissionId);

    logger.info(`Cleaned up container group for ${submissionId}`);
    return true;
  } catch (error) {
    logger.error(`Error cleaning up container group:`, error);
    return false;
  }
}

/**
 * Get logs from all containers in group
 * @param {Object} containerGroup - Container group info
 * @returns {Promise<Object>} Map of containerId -> logs
 */
async function getContainerGroupLogs(containerGroup) {
  const logs = {};

  for (const containerInfo of containerGroup.containers) {
    try {
      const containerLogs = await getContainerLogs(
        containerInfo.dockerContainerId
      );
      logs[containerInfo.containerId] = containerLogs;
    } catch (error) {
      logs[containerInfo.containerId] = `Error getting logs: ${error.message}`;
    }
  }

  return logs;
}

/**
 * Wait for container health check
 * @param {string} containerId - Container ID
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise<boolean>} True if healthy
 */
async function waitForContainerHealth(containerId, timeoutMs = 30000) {
  const container = docker.getContainer(containerId);
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    try {
      const info = await container.inspect();

      if (info.State.Health) {
        if (info.State.Health.Status === "healthy") {
          return true;
        }
        if (info.State.Health.Status === "unhealthy") {
          return false;
        }
      } else {
        // No health check defined, just check if running
        return info.State.Running;
      }
    } catch (error) {
      logger.warn(`Error checking health:`, error.message);
    }

    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  return false;
}

/**
 * Topological sort of containers based on dependencies
 * @param {Array<Object>} containers - Array of container configs
 * @returns {Array<Object>} Sorted containers
 */
function topologicalSort(containers) {
  const sorted = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(container) {
    if (visited.has(container.container_id)) return;
    if (visiting.has(container.container_id)) {
      throw new Error(
        `Circular dependency detected: ${container.container_id}`
      );
    }

    visiting.add(container.container_id);

    // Visit dependencies first
    const deps = container.depends_on || [];
    for (const depId of deps) {
      const depContainer = containers.find((c) => c.container_id === depId);
      if (depContainer) {
        visit(depContainer);
      }
    }

    visiting.delete(container.container_id);
    visited.add(container.container_id);
    sorted.push(container);
  }

  // Visit all containers
  for (const container of containers) {
    visit(container);
  }

  return sorted;
}

/**
 * Parse memory string to MB
 * @param {string} memory - Memory string (e.g., '512m', '2g')
 * @returns {number} Memory in MB
 */
function parseMemory(memory) {
  if (typeof memory === "number") return memory;

  const match = memory.match(/^(\d+)([kmg]?)$/i);
  if (!match) return 512; // Default

  const value = parseInt(match[1]);
  const unit = match[2].toLowerCase();

  switch (unit) {
    case "k":
      return Math.ceil(value / 1024);
    case "g":
      return value * 1024;
    case "m":
    default:
      return value;
  }
}

module.exports = {
  buildProblemImage,
  buildContainerImage,
  buildEvaluationImage,
  createEvaluationContainer,
  executeContainer,
  getContainerLogs,
  getDockerContainer: (containerId) => docker.getContainer(containerId),
  stopContainer,
  cleanup,
  copyFromContainer,
  listJudgehostContainers,
  cleanupOldContainers,
  // Sidecar architecture functions
  createNetwork,
  removeNetwork,
  buildSubmissionImage,
  createSubmissionContainer,
  createSidecarContainer,
  waitForContainer,
  // Multi-container orchestration
  createContainerGroup,
  createMultiContainer,
  startContainerGroup,
  waitForContainerGroup,
  cleanupContainerGroup,
  getContainerGroupLogs,
  waitForContainerHealth,
  topologicalSort,
  parseMemory,
};
