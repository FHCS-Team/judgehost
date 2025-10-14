/**
 * Core Processor Module
 * Handles problem package processing, submission evaluation, and result management
 */

const path = require("path");
const fs = require("fs/promises");
const logger = require("../utils/logger");
const config = require("../config");
const { getQueue, Priority } = require("./queue");
const dockerClient = require("./docker/client");
const { buildImage } = require("./docker/image");
const { extractArchive } = require("../utils/downloader");

// In-memory storage for problem metadata
const problemsRegistry = new Map();

// Active evaluations
const activeEvaluations = new Map();

/**
 * Initialize processor and start processing queue
 */
function initializeProcessor() {
  logger.info("Initializing processor...");

  // Load existing problems from disk
  loadProblemsFromDisk().catch((error) => {
    logger.error("Error loading problems from disk:", error);
  });

  // Start processing queue
  const queue = getQueue();
  queue.on("job-ready", async (job) => {
    try {
      logger.info(
        `Processing job ${job.id} for submission ${job.submissionId}`
      );
      await processSubmission(job);
    } catch (error) {
      logger.error(`Error processing job ${job.id}:`, error);
      job.fail(error);
    }
  });

  logger.info("Processor initialized");
}

/**
 * Load problems from disk storage
 */
async function loadProblemsFromDisk() {
  try {
    const problemsDir = config.paths.problemsDir;
    await fs.mkdir(problemsDir, { recursive: true });

    const entries = await fs.readdir(problemsDir, { withFileTypes: true });

    for (const entry of entries) {
      if (!entry.isDirectory()) continue;

      const problemId = entry.name;
      const configPath = path.join(problemsDir, problemId, "config.json");

      try {
        const configContent = await fs.readFile(configPath, "utf8");
        const config = JSON.parse(configContent);

        problemsRegistry.set(problemId, {
          problemId: config.problem_id,
          problemName: config.problem_name,
          projectType: config.project_type,
          config: config,
          packagePath: path.join(problemsDir, problemId),
          imageName: `problem-${problemId}:latest`,
          registeredAt: new Date(),
        });

        logger.info(`Loaded problem: ${problemId}`);
      } catch (error) {
        logger.warn(`Failed to load problem ${problemId}:`, error.message);
      }
    }

    logger.info(`Loaded ${problemsRegistry.size} problems from disk`);
  } catch (error) {
    logger.error("Error loading problems from disk:", error);
    throw error;
  }
}

/**
 * Process a problem package
 * @param {string} problemId - Problem identifier
 * @param {string} packagePath - Path to problem package (archive or directory)
 * @param {Object} options - Processing options
 * @returns {Promise<Object>} Processing result
 */
async function processProblemPackage(problemId, packagePath, options = {}) {
  const { projectType, forceRebuild = false, buildTimeout } = options;

  logger.info(`Processing problem package: ${problemId}`, {
    problemId,
    packagePath,
    options,
  });

  try {
    // Check if problem already exists
    if (problemsRegistry.has(problemId) && !forceRebuild) {
      throw new Error(
        `Problem ${problemId} already exists. Use force_rebuild to override.`
      );
    }

    // Create problem directory
    const problemDir = path.join(config.paths.problemsDir, problemId);
    await fs.mkdir(problemDir, { recursive: true });

    // Check if packagePath is a file or directory
    const stats = await fs.stat(packagePath);

    if (stats.isFile()) {
      // Extract archive
      logger.info(`Extracting problem package: ${problemId}`);
      const fileBuffer = await fs.readFile(packagePath);
      await extractArchive(fileBuffer, problemDir);
    } else {
      // Copy directory contents
      logger.info(`Copying problem package directory: ${problemId}`);
      await copyDirectory(packagePath, problemDir);
    }

    // Validate package structure
    const configPath = path.join(problemDir, "config.json");
    const dockerfilePath = path.join(problemDir, "Dockerfile");

    // Check for required files
    try {
      await fs.access(configPath);
    } catch (error) {
      throw new Error(`Problem package must contain config.json at root level`);
    }

    // Load and validate config
    const configContent = await fs.readFile(configPath, "utf8");
    const problemConfig = JSON.parse(configContent);

    // Validate config
    if (problemConfig.problem_id !== problemId) {
      throw new Error(
        `Problem ID in config.json (${problemConfig.problem_id}) does not match provided ID (${problemId})`
      );
    }

    if (!problemConfig.problem_name) {
      throw new Error("config.json must include problem_name");
    }

    if (!problemConfig.containers || !Array.isArray(problemConfig.containers)) {
      throw new Error(
        "config.json must include containers array (multi-container architecture required)"
      );
    }

    // Validate that all container Dockerfiles exist
    for (const container of problemConfig.containers) {
      if (!container.dockerfile_path) {
        throw new Error(
          `Container ${container.container_id} must specify dockerfile_path`
        );
      }
      const containerDockerfilePath = path.join(
        problemDir,
        container.dockerfile_path
      );
      try {
        await fs.access(containerDockerfilePath);
      } catch (error) {
        throw new Error(
          `Dockerfile not found for container ${container.container_id} at ${container.dockerfile_path}`
        );
      }
    }

    // Build Docker images for all containers
    const imageNames = {};
    for (const container of problemConfig.containers) {
      const containerId = container.container_id;
      const imageName =
        container.image_name || `judgehost-${problemId}-${containerId}:latest`;
      const dockerfilePath = container.dockerfile_path;

      logger.info(
        `Building Docker image for container ${containerId}: ${imageName}`
      );

      // Get the directory containing the Dockerfile
      const dockerfileDir = path.join(problemDir, path.dirname(dockerfilePath));
      const dockerfileName = path.basename(dockerfilePath);

      try {
        await buildImage(dockerfileDir, imageName, {
          buildTimeout: buildTimeout || config.docker.buildTimeout,
          dockerfile: dockerfileName,
        });
        imageNames[containerId] = imageName;
      } catch (error) {
        throw new Error(
          `Docker build failed for container ${containerId}: ${error.message}`
        );
      }
    }

    // Register problem
    const problemData = {
      problemId: problemConfig.problem_id,
      problemName: problemConfig.problem_name,
      projectType: projectType || problemConfig.project_type || "generic",
      config: problemConfig,
      packagePath: problemDir,
      imageNames: imageNames,
      registeredAt: new Date(),
    };

    problemsRegistry.set(problemId, problemData);

    logger.info(`Problem ${problemId} registered successfully`, {
      problemId,
      imageNames,
    });

    return {
      problemId: problemData.problemId,
      imageNames: problemData.imageNames,
      registeredAt: problemData.registeredAt,
    };
  } catch (error) {
    logger.error(`Error processing problem package ${problemId}:`, error);
    // Cleanup on error
    const problemDir = path.join(config.paths.problemsDir, problemId);
    await fs.rm(problemDir, { recursive: true, force: true }).catch(() => {});
    throw error;
  }
}

/**
 * Get problem information
 * @param {string} problemId - Problem identifier
 * @returns {Promise<Object|null>} Problem information or null if not found
 */
async function getProblemInfo(problemId) {
  const problem = problemsRegistry.get(problemId);

  if (!problem) {
    return null;
  }

  return {
    problem_id: problem.problemId,
    problem_name: problem.problemName,
    project_type: problem.projectType,
    version: problem.config.version || "1.0.0",
    description: problem.config.description || "",
    containers: problem.config.containers || [],
    rubrics: problem.config.rubrics || [],
    registered_at: problem.registeredAt.toISOString(),
  };
}

/**
 * List all registered problems
 * @returns {Promise<Array>} List of problems
 */
async function listProblems() {
  const problems = [];

  for (const [problemId, problem] of problemsRegistry.entries()) {
    problems.push({
      problemId: problem.problemId,
      problemName: problem.problemName,
      projectType: problem.projectType,
      rubrics: problem.config.rubrics || [],
      registeredAt: problem.registeredAt,
    });
  }

  return problems;
}

/**
 * Delete a problem
 * @param {string} problemId - Problem identifier
 * @returns {Promise<boolean>} True if deleted successfully
 */
async function deleteProblem(problemId) {
  const problem = problemsRegistry.get(problemId);

  if (!problem) {
    return false;
  }

  try {
    // Remove Docker image
    const docker = dockerClient.getClient();
    try {
      const image = docker.getImage(problem.imageName);
      await image.remove({ force: true });
      logger.info(`Removed Docker image: ${problem.imageName}`);
    } catch (error) {
      logger.warn(
        `Failed to remove Docker image ${problem.imageName}:`,
        error.message
      );
    }

    // Remove problem directory
    await fs.rm(problem.packagePath, { recursive: true, force: true });
    logger.info(`Removed problem directory: ${problem.packagePath}`);

    // Remove from registry
    problemsRegistry.delete(problemId);

    logger.info(`Problem ${problemId} deleted successfully`);
    return true;
  } catch (error) {
    logger.error(`Error deleting problem ${problemId}:`, error);
    throw error;
  }
}

/**
 * Process a submission
 * @param {Object} job - Job object from queue
 */
async function processSubmission(job) {
  const { submissionId, problemId } = job;

  logger.info(`Starting evaluation for submission ${submissionId}`);

  // Mark job as running
  job.start();

  // Create results directory
  const resultsDir = path.join(config.paths.resultsDir, submissionId);
  await fs.mkdir(resultsDir, { recursive: true });

  // Create artifacts directory
  const artifactsDir = path.join(resultsDir, "artifacts");
  await fs.mkdir(artifactsDir, { recursive: true });

  // Track evaluation status
  activeEvaluations.set(job.id, {
    submissionId,
    problemId,
    state: "preparing",
    startedAt: new Date(),
  });

  try {
    // Get problem configuration
    const problem = problemsRegistry.get(problemId);
    if (!problem) {
      throw new Error(`Problem ${problemId} not found`);
    }

    // Download/prepare submission code
    const submissionDir = await prepareSubmission(job);

    // Update evaluation status
    activeEvaluations.set(job.id, {
      ...activeEvaluations.get(job.id),
      state: "running",
      submissionDir,
    });

    // Run evaluation (this would integrate with the Docker container execution)
    const result = await runEvaluation(job, problem, submissionDir, resultsDir);

    // Save results
    const resultsPath = path.join(resultsDir, "results.json");
    await fs.writeFile(resultsPath, JSON.stringify(result, null, 2));

    // Mark job as complete
    job.complete(result);

    logger.info(`Submission ${submissionId} completed successfully`);
  } catch (error) {
    logger.error(`Submission ${submissionId} failed:`, error);
    job.fail(error);

    // Save error info
    const errorPath = path.join(resultsDir, "error.json");
    await fs.writeFile(
      errorPath,
      JSON.stringify(
        {
          submissionId,
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString(),
        },
        null,
        2
      )
    );
  } finally {
    // Cleanup evaluation state
    activeEvaluations.delete(job.id);
  }
}

/**
 * Prepare submission code
 * @param {Object} job - Job object
 * @returns {Promise<string>} Path to submission directory
 */
async function prepareSubmission(job) {
  const {
    submissionId,
    packageType,
    localPath,
    gitUrl,
    gitBranch,
    gitCommit,
    packageUrl,
    archiveChecksum,
  } = job;

  const submissionDir = path.join(config.paths.submissionsDir, submissionId);
  await fs.mkdir(submissionDir, { recursive: true });

  try {
    if (packageType === "file" && localPath) {
      // Already extracted during upload
      return localPath;
    } else if (packageType === "git") {
      // Clone Git repository
      const simpleGit = require("simple-git");
      const git = simpleGit();

      const cloneOptions = [];
      if (config.git.shallowClone) cloneOptions.push("--depth=1");
      if (gitBranch) cloneOptions.push("--branch", gitBranch);

      await git.clone(gitUrl, submissionDir, cloneOptions);

      if (gitCommit) {
        const repoGit = simpleGit(submissionDir);
        await repoGit.checkout(gitCommit);
      }

      return submissionDir;
    } else if (packageType === "url") {
      // Download from URL
      const downloader = require("../utils/downloader");
      const tempPath = path.join(submissionDir, "submission.tar.gz");

      if (archiveChecksum) {
        await downloader.downloadToFile(packageUrl, tempPath, archiveChecksum);
      } else {
        await downloader.downloadToFile(packageUrl, tempPath);
      }

      // Extract
      const fileBuffer = await fs.readFile(tempPath);
      await extractArchive(fileBuffer, submissionDir);
      await fs.rm(tempPath);

      return submissionDir;
    } else {
      throw new Error(`Unsupported package type: ${packageType}`);
    }
  } catch (error) {
    logger.error(`Error preparing submission ${submissionId}:`, error);
    throw error;
  }
}

/**
 * Run evaluation
 * @param {Object} job - Job object
 * @param {Object} problem - Problem data
 * @param {string} submissionDir - Submission directory path
 * @param {string} resultsDir - Results directory path
 * @returns {Promise<Object>} Evaluation results
 */
async function runEvaluation(job, problem, submissionDir, resultsDir) {
  const { submissionId } = job;

  logger.info(`Running evaluation for submission ${submissionId}`);

  // This is a placeholder for the actual evaluation logic
  // The real implementation would:
  // 1. Create containers based on problem.config.containers
  // 2. Mount submission code and problem resources
  // 3. Execute hooks (pre, post, periodic)
  // 4. Collect results from rubric files
  // 5. Calculate scores

  // For now, return a mock result
  const result = {
    submissionId,
    problemId: problem.problemId,
    status: "completed",
    evaluatedAt: new Date().toISOString(),
    executionStatus: "success",
    timedOut: false,
    totalScore: 0,
    maxScore: 100,
    percentage: 0,
    rubricScores: [],
    logs: "Evaluation completed",
    metadata: {
      executionTime: 0,
      memoryUsed: 0,
    },
  };

  // Calculate scores from rubrics
  if (problem.config.rubrics) {
    result.maxScore = problem.config.rubrics.reduce(
      (sum, r) => sum + (r.max_score || 0),
      0
    );

    // Mock rubric scores
    result.rubricScores = problem.config.rubrics.map((rubric) => ({
      rubric_id: rubric.rubric_id,
      rubric_name: rubric.rubric_name,
      rubric_type: rubric.rubric_type,
      score: 0,
      max_score: rubric.max_score,
      percentage: 0,
      status: "SKIPPED",
      message: "Evaluation not yet implemented",
    }));
  }

  return result;
}

/**
 * Get evaluation status
 * @param {number} jobId - Job ID
 * @returns {Object|null} Evaluation status or null if not found
 */
function getEvaluationStatus(jobId) {
  return activeEvaluations.get(jobId) || null;
}

/**
 * Get processor instance
 * @returns {Object} Processor interface
 */
function getProcessor() {
  return {
    getEvaluationStatus,
  };
}

/**
 * Copy directory recursively
 * @param {string} src - Source directory
 * @param {string} dest - Destination directory
 */
async function copyDirectory(src, dest) {
  await fs.mkdir(dest, { recursive: true });

  const entries = await fs.readdir(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      await fs.copyFile(srcPath, destPath);
    }
  }
}

module.exports = {
  initializeProcessor,
  processProblemPackage,
  getProblemInfo,
  listProblems,
  deleteProblem,
  getProcessor,
  processSubmission,
};
