const Docker = require("dockerode");
const fs = require("fs/promises");
const path = require("path");
const logger = require("../utils/logger");
const config = require("../config");

// Create docker client once
const docker = new Docker(config.dockerOptions);

// Pure function to build a problem image
const buildProblemImage = async (problemId, problemPackagePath) => {
  logger.info(`Building problem image for ${problemId}`);

  // Extract tar stream from problem package
  const tarStream = await fs.createReadStream(problemPackagePath);

  // Build image
  const stream = await docker.buildImage(tarStream, {
    t: `problem-${problemId}`,
    dockerfile: "Dockerfile",
  });

  // Process stream
  return new Promise((resolve, reject) => {
    docker.modem.followProgress(
      stream,
      (err, res) => (err ? reject(err) : resolve(`problem-${problemId}`)),
      (progress) => logger.debug("Build progress:", progress)
    );
  });
};

// Create container for evaluation
const createEvaluationContainer = async (imageId, submissionId) => {
  const container = await docker.createContainer({
    Image: imageId,
    name: `eval-${submissionId}`,
    Env: [
      `SUBMISSION_ID=${submissionId}`,
      `EVAL_TIMESTAMP=${new Date().toISOString()}`,
    ],
    HostConfig: {
      NetworkMode: "none",
      Memory: config.docker.memoryLimit,
      CpuQuota: config.docker.cpuQuota,
      Binds: [
        `${path.join(config.paths.submissions, submissionId)}:/submission:ro`,
        `${path.join(config.paths.results, submissionId)}:/out:rw`,
      ],
    },
  });

  return container.id;
};

// Execute container with timeout
const executeContainer = async (containerId, options = {}) => {
  const container = docker.getContainer(containerId);

  // Start container
  await container.start();

  // Create timeout promise
  const timeout = new Promise((_, reject) =>
    setTimeout(
      () => reject(new Error("Container execution timeout")),
      options.timeout || config.docker.defaultTimeout
    )
  );

  // Wait for container to finish or timeout
  const result = await Promise.race([container.wait(), timeout]);

  // Get logs
  const logs = await container.logs({
    stdout: true,
    stderr: true,
  });

  return {
    statusCode: result.StatusCode,
    logs: logs.toString("utf8"),
  };
};

// Cleanup container
const cleanup = async (containerId, removeImage = false) => {
  const container = docker.getContainer(containerId);

  try {
    // Check if running
    const info = await container.inspect();
    if (info.State.Running) {
      await container.stop();
    }

    // Remove container
    await container.remove();

    // Optionally remove image
    if (removeImage) {
      const imageId = info.Image;
      const image = docker.getImage(imageId);
      await image.remove();
    }

    return true;
  } catch (error) {
    logger.error(`Error cleaning up container ${containerId}:`, error);
    return false;
  }
};

module.exports = {
  buildProblemImage,
  createEvaluationContainer,
  executeContainer,
  cleanup,
};
