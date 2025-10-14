/**
 * Container Builder module - Handles parameterized container builds
 *
 * This module replaces hard-coded build logic (like npm install) with
 * a flexible, configuration-driven approach for building container images.
 */

const Docker = require("dockerode");
const fs = require("fs/promises");
const path = require("path");
const tar = require("tar-fs");
const logger = require("../utils/logger");
const config = require("../config");
const { BuildStepType, generateBuildStep } = require("./steps/build");

const docker = new Docker(config.getDockerOptions());

/**
 * Generate Dockerfile content from build steps
 * @param {string} baseImage - Base Docker image
 * @param {Array<Object>} buildSteps - Array of build step configurations
 * @param {Object} metadata - Additional metadata for labels
 * @returns {string} Dockerfile content
 */
function generateDockerfile(baseImage, buildSteps = [], metadata = {}) {
  let dockerfile = `FROM ${baseImage}\n\n`;

  // Add metadata labels
  if (metadata) {
    for (const [key, value] of Object.entries(metadata)) {
      dockerfile += `LABEL judgehost.${key}="${value}"\n`;
    }
    dockerfile += "\n";
  }

  // Process build steps using modular system
  for (const step of buildSteps) {
    try {
      const instruction = generateBuildStep(step);
      if (instruction) {
        dockerfile += instruction + "\n";
      }
    } catch (error) {
      logger.warn(`Failed to generate build step: ${error.message}`);
    }
  }

  return dockerfile;
}

/**
 * Build a container image from configuration
 * @param {Object} options - Build options
 * @param {string} options.imageName - Name for the built image
 * @param {string} options.baseImage - Base Docker image
 * @param {Array<Object>} options.buildSteps - Build step configurations
 * @param {string} options.contextPath - Build context directory
 * @param {Object} options.metadata - Metadata for labels
 * @param {Object} options.buildArgs - Docker build arguments
 * @param {number} options.timeout - Build timeout in seconds
 * @returns {Promise<string>} Built image name
 */
async function buildImage({
  imageName,
  baseImage = "alpine:latest",
  buildSteps = [],
  contextPath,
  metadata = {},
  buildArgs = {},
  timeout = 600,
}) {
  logger.info(`Building image ${imageName} from ${baseImage}`);

  try {
    // Generate Dockerfile
    const dockerfileContent = generateDockerfile(
      baseImage,
      buildSteps,
      metadata
    );
    logger.debug(`Generated Dockerfile:\n${dockerfileContent}`);

    // Create temporary directory for build context
    const tempDir = path.join(
      config.paths.workDir,
      `build-${Date.now()}-${Math.random().toString(36).substring(7)}`
    );
    await fs.mkdir(tempDir, { recursive: true });

    // Write Dockerfile
    await fs.writeFile(path.join(tempDir, "Dockerfile"), dockerfileContent);

    // Copy context if provided
    if (contextPath) {
      const contextExists = await fs.stat(contextPath).catch(() => null);
      if (contextExists?.isDirectory()) {
        await fs.cp(contextPath, tempDir, {
          recursive: true,
          filter: (src) => !src.includes("Dockerfile"), // Don't overwrite our Dockerfile
        });
      }
    }

    // Create tar stream from build context
    const tarStream = tar.pack(tempDir);

    // Build image
    const stream = await docker.buildImage(tarStream, {
      t: imageName,
      dockerfile: "Dockerfile",
      labels: {
        "judgehost.built_at": new Date().toISOString(),
        ...Object.fromEntries(
          Object.entries(metadata).map(([k, v]) => [`judgehost.${k}`, v])
        ),
      },
      buildargs: buildArgs,
    });

    // Process build stream with timeout
    return new Promise((resolve, reject) => {
      const timeoutHandle = setTimeout(() => {
        reject(new Error(`Build timeout after ${timeout} seconds`));
      }, timeout * 1000);

      docker.modem.followProgress(
        stream,
        async (err, res) => {
          clearTimeout(timeoutHandle);

          // Cleanup temp directory
          await fs
            .rm(tempDir, { recursive: true, force: true })
            .catch(() => {});

          if (err) {
            logger.error(`Failed to build image ${imageName}:`, err);
            reject(err);
          } else {
            logger.info(`Successfully built image ${imageName}`);
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
    logger.error(`Error building image ${imageName}:`, error);
    throw error;
  }
}

/**
 * Build a problem container image
 * @param {string} problemId - Problem identifier
 * @param {Object} containerConfig - Container configuration from problem config
 * @param {string} problemPackagePath - Path to problem package directory
 * @param {Object} options - Additional build options
 * @returns {Promise<string>} Built image name
 */
async function buildProblemContainer(
  problemId,
  containerConfig,
  problemPackagePath,
  options = {}
) {
  const containerId = containerConfig.container_id || "default";
  const imageName = `judgehost-problem-${problemId}-${containerId}:latest`;

  logger.info(`Building problem container ${containerId} for ${problemId}`);

  // Use configured base image or default
  const baseImage = containerConfig.base_image || "node:18-alpine";

  // Build steps from configuration
  const buildSteps = containerConfig.build_steps || [];

  return buildImage({
    imageName,
    baseImage,
    buildSteps,
    contextPath: problemPackagePath,
    metadata: {
      problem_id: problemId,
      container_id: containerId,
      role: containerConfig.role || "unknown",
    },
    buildArgs: options.buildArgs || {},
    timeout: options.buildTimeout || 600,
  });
}

/**
 * Build submission container on top of problem container
 * @param {string} problemImage - Base problem image
 * @param {string} submissionId - Submission identifier
 * @param {string} packageId - Submission package identifier
 * @param {string} submissionPath - Path to submission code
 * @param {Object} containerConfig - Container configuration
 * @returns {Promise<string>} Built image name
 */
async function buildSubmissionContainer(
  problemImage,
  submissionId,
  packageId,
  submissionPath,
  containerConfig = {}
) {
  const imageName = `judgehost-eval-${submissionId}-${packageId}:latest`;

  logger.info(`Building submission container for ${submissionId}/${packageId}`);

  // Default build steps for submission container
  const defaultBuildSteps = [
    {
      type: BuildStepType.COPY,
      source: ".",
      destination: containerConfig.mount_path || "/workspace/submission/",
    },
  ];

  // Merge with any additional build steps from config
  const buildSteps = [
    ...defaultBuildSteps,
    ...(containerConfig.build_steps || []),
  ];

  return buildImage({
    imageName,
    baseImage: problemImage,
    buildSteps,
    contextPath: submissionPath,
    metadata: {
      submission_id: submissionId,
      package_id: packageId,
    },
    timeout: 300,
  });
}

/**
 * Create default build steps for common scenarios
 */
const CommonBuildSteps = {
  /**
   * Node.js project build steps
   */
  nodejs: (workDir = "/workspace/problem") => [
    {
      type: BuildStepType.WORKDIR,
      path: workDir,
    },
    {
      type: BuildStepType.COPY,
      source: "package*.json",
      destination: "./",
    },
    {
      type: BuildStepType.RUN,
      command: "npm ci --only=production",
    },
    {
      type: BuildStepType.COPY,
      source: ".",
      destination: "./",
    },
  ],

  /**
   * Python project build steps
   */
  python: (workDir = "/workspace/problem") => [
    {
      type: BuildStepType.WORKDIR,
      path: workDir,
    },
    {
      type: BuildStepType.COPY,
      source: "requirements.txt",
      destination: "./",
    },
    {
      type: BuildStepType.RUN,
      command: "pip install --no-cache-dir -r requirements.txt",
    },
    {
      type: BuildStepType.COPY,
      source: ".",
      destination: "./",
    },
  ],

  /**
   * Generic copy-only build steps
   */
  copyOnly: (workDir = "/workspace/problem") => [
    {
      type: BuildStepType.WORKDIR,
      path: workDir,
    },
    {
      type: BuildStepType.COPY,
      source: ".",
      destination: "./",
    },
  ],
};

module.exports = {
  BuildStepType,
  buildImage,
  buildProblemContainer,
  buildSubmissionContainer,
  generateDockerfile,
  CommonBuildSteps,
};
