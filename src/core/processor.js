/**
 * Processor module - Orchestrates submission evaluation workflow
 *
 * This module coordinates the entire evaluation process:
 * 1. Download/extract submission
 * 2. Build evaluation image
 * 3. Create and run container
 * 4. Execute hooks (pre, post, periodic)
 * 5. Collect results and scores
 * 6. Cleanup resources
 */

const fs = require("fs/promises");
const path = require("path");
const EventEmitter = require("events");
const logger = require("../utils/logger");
const config = require("../config");
const downloader = require("../utils/downloader");
const docker = require("./docker");
const { completeJob, failJob, queueEvents } = require("./queue");

/**
 * Evaluation states
 */
const EvaluationState = {
  DOWNLOADING: "downloading",
  BUILDING: "building",
  STARTING: "starting",
  RUNNING_PRE_HOOKS: "running_pre_hooks",
  DEPLOYING: "deploying",
  RUNNING_POST_HOOKS: "running_post_hooks",
  COLLECTING_RESULTS: "collecting_results",
  COMPLETED: "completed",
  FAILED: "failed",
};

/**
 * Processor class manages evaluation workflow
 */
class Processor extends EventEmitter {
  constructor() {
    super();
    this.activeEvaluations = new Map(); // jobId -> evaluation state

    // Listen for queue events
    queueEvents.on("job:started", (job) => this.handleJobStarted(job));
  }

  /**
   * Handle job started event from queue
   */
  async handleJobStarted(job) {
    logger.info(`Processing job ${job.id} for problem ${job.problemId}`);

    try {
      await this.processSubmission(job);
    } catch (error) {
      logger.error(`Job ${job.id} processing failed:`, error);
      failJob(job.id, {
        message: error.message,
        stack: error.stack,
        phase: this.activeEvaluations.get(job.id)?.state || "unknown",
      });
    } finally {
      this.activeEvaluations.delete(job.id);
    }
  }

  /**
   * Process a submission through the entire evaluation workflow
   */
  async processSubmission(job) {
    const evaluationState = {
      jobId: job.id,
      submissionId: job.submissionId,
      problemId: job.problemId,
      state: EvaluationState.DOWNLOADING,
      startTime: Date.now(),
      containerId: null,
      imageId: null,
    };

    this.activeEvaluations.set(job.id, evaluationState);

    try {
      // Step 1: Load problem configuration
      logger.info(`Loading problem ${job.problemId}`);
      const problem = await this.loadProblem(job.problemId);

      // Step 2: Download and prepare submission
      logger.info(`Downloading submission ${job.submissionId}`);
      this.updateState(evaluationState, EvaluationState.DOWNLOADING);
      const submissionPath = await this.downloadSubmission(job);

      // Step 3: Build evaluation image
      logger.info(`Building evaluation image for ${job.submissionId}`);
      this.updateState(evaluationState, EvaluationState.BUILDING);
      const problemImage = `judgehost-problem-${job.problemId}:latest`;
      const evalImage = await docker.buildEvaluationImage(
        problemImage,
        job.submissionId,
        submissionPath
      );
      evaluationState.imageId = evalImage;

      // Step 4: Prepare results directory
      const resultsDir = path.join(config.paths.resultsDir, job.submissionId);
      await fs.mkdir(resultsDir, { recursive: true });
      await fs.mkdir(path.join(resultsDir, "logs"), { recursive: true });

      // Step 5: Create container
      logger.info(`Creating evaluation container for ${job.submissionId}`);
      this.updateState(evaluationState, EvaluationState.STARTING);
      const containerId = await docker.createEvaluationContainer(
        evalImage,
        job.submissionId,
        problem,
        {
          memoryMB: job.timeoutOverride || problem.memoryMB,
        }
      );
      evaluationState.containerId = containerId;

      // Step 6: Execute container (runs entrypoint which executes hooks)
      logger.info(`Executing evaluation for ${job.submissionId}`);
      this.updateState(evaluationState, EvaluationState.RUNNING_PRE_HOOKS);

      const timeoutMs =
        (job.timeoutOverride ||
          problem.timeoutSeconds ||
          config.docker.defaultTimeout / 1000) * 1000;
      const executionResult = await docker.executeContainer(containerId, {
        timeout: timeoutMs,
      });

      // Step 7: Extract results from container before cleanup
      logger.info(`Extracting results from container for ${job.submissionId}`);
      await this.extractContainerResults(containerId, resultsDir);

      // Step 8: Collect results
      logger.info(`Collecting results for ${job.submissionId}`);
      this.updateState(evaluationState, EvaluationState.COLLECTING_RESULTS);
      const results = await this.collectResults(
        job,
        problem,
        resultsDir,
        executionResult
      );

      // Step 9: Cleanup container
      if (config.docker.cleanupContainersAfterEval) {
        await docker.cleanup(containerId, false);
      }

      // Step 10: Mark job as completed
      this.updateState(evaluationState, EvaluationState.COMPLETED);
      completeJob(job.id, results);

      logger.info(`Job ${job.id} completed successfully`);

      // Send notification if configured
      if (job.notificationUrl) {
        this.sendNotification(job.notificationUrl, job.id, results).catch(
          (err) => {
            logger.warn(
              `Failed to send notification for job ${job.id}:`,
              err.message
            );
          }
        );
      }
    } catch (error) {
      logger.error(`Error processing submission ${job.submissionId}:`, error);

      // Cleanup on failure
      if (evaluationState.containerId) {
        await docker
          .cleanup(evaluationState.containerId, false)
          .catch(() => {});
      }

      throw error;
    }
  }

  /**
   * Update evaluation state and emit event
   */
  updateState(evaluationState, newState) {
    evaluationState.state = newState;
    this.emit("evaluation:state", {
      jobId: evaluationState.jobId,
      submissionId: evaluationState.submissionId,
      state: newState,
    });
  }

  /**
   * Load problem configuration
   */
  async loadProblem(problemId) {
    const problemDir = path.join(config.paths.problemsDir, problemId);
    const configPath = path.join(problemDir, "config.json");

    try {
      const configContent = await fs.readFile(configPath, "utf8");
      const problemConfig = JSON.parse(configContent);

      return {
        problemId,
        ...problemConfig,
      };
    } catch (error) {
      throw new Error(`Failed to load problem ${problemId}: ${error.message}`);
    }
  }

  /**
   * Download submission based on package type
   */
  async downloadSubmission(job) {
    const submissionDir = path.join(
      config.paths.submissionsDir,
      job.submissionId
    );
    await fs.mkdir(submissionDir, { recursive: true });

    try {
      switch (job.packageType) {
        case "git":
          return await this.downloadGitSubmission(job, submissionDir);

        case "url":
          return await this.downloadUrlSubmission(job, submissionDir);

        case "file":
          // File should already be uploaded to submissions directory
          return submissionDir;

        default:
          throw new Error(`Unknown package type: ${job.packageType}`);
      }
    } catch (error) {
      throw new Error(`Failed to download submission: ${error.message}`);
    }
  }

  /**
   * Download submission from Git repository
   */
  async downloadGitSubmission(job, submissionDir) {
    if (!job.gitUrl) {
      throw new Error("Git URL not provided");
    }

    const simpleGit = require("simple-git");
    const git = simpleGit();

    const cloneOptions = [];

    // Shallow clone if enabled
    if (config.git.shallowClone) {
      cloneOptions.push("--depth=1");
    }

    // Clone specific branch
    if (job.gitBranch) {
      cloneOptions.push("--branch", job.gitBranch);
    }

    logger.info(`Cloning Git repository: ${job.gitUrl}`);

    try {
      await git.clone(job.gitUrl, submissionDir, cloneOptions);

      // Checkout specific commit if provided
      if (job.gitCommit) {
        const repoGit = simpleGit(submissionDir);
        await repoGit.checkout(job.gitCommit);
      }

      // Remove .git directory to save space
      const gitDir = path.join(submissionDir, ".git");
      await fs.rm(gitDir, { recursive: true, force: true }).catch(() => {});

      logger.info(`Successfully cloned Git repository to ${submissionDir}`);
      return submissionDir;
    } catch (error) {
      throw new Error(`Git clone failed: ${error.message}`);
    }
  }

  /**
   * Download submission from URL (archive)
   */
  async downloadUrlSubmission(job, submissionDir) {
    if (!job.packageUrl) {
      throw new Error("Package URL not provided");
    }

    logger.info(`Downloading archive from: ${job.packageUrl}`);

    try {
      let archiveBuffer;

      if (job.archiveChecksum) {
        archiveBuffer = await downloader.downloadVerified(
          job.packageUrl,
          job.archiveChecksum
        );
      } else {
        archiveBuffer = await downloader.download(job.packageUrl);
      }

      // Extract archive to submission directory
      await downloader.extractBuffer(archiveBuffer, submissionDir);

      logger.info(
        `Successfully downloaded and extracted archive to ${submissionDir}`
      );
      return submissionDir;
    } catch (error) {
      throw new Error(`Archive download failed: ${error.message}`);
    }
  }

  /**
   * Extract results from container to results directory
   */
  async extractContainerResults(containerId, resultsDir) {
    try {
      // Copy /out directory from container to host
      await docker.copyFromContainer(containerId, "/out/", resultsDir);

      logger.info(`Extracted results from container ${containerId}`);
      return true;
    } catch (error) {
      logger.error(`Failed to extract container results:`, error);
      return false;
    }
  }

  /**
   * Collect evaluation results from output directory
   */
  async collectResults(job, problem, resultsDir, executionResult) {
    const rubricUtils = require("../utils/rubrics");

    const results = {
      submissionId: job.submissionId,
      problemId: job.problemId,
      teamId: job.teamId,
      evaluatedAt: new Date().toISOString(),
      evaluation_status:
        executionResult.statusCode === 0 ? "success" : "failed",
      executionStatus: executionResult.statusCode === 0 ? "success" : "failed", // Alias
      timedOut: executionResult.timedOut || false,
      rubricScores: [],
      totalScore: 0,
      maxScore: 0,
      percentage: 0,
      logs: executionResult.logs || "",
      metadata: {},
    };

    try {
      // Find all rubric JSON files
      const allFiles = await fs.readdir(resultsDir);
      const rubricFiles = allFiles
        .filter((f) => f.startsWith("rubric_") && f.endsWith(".json"))
        .map((f) => path.join(resultsDir, f));

      logger.info(`Found ${rubricFiles.length} rubric result file(s)`);

      if (rubricFiles.length > 0) {
        // Process rubric files with validation
        const { rubrics, errors } = await rubricUtils.processRubricFiles(
          rubricFiles,
          problem
        );

        if (errors.length > 0) {
          logger.warn(`Rubric processing had ${errors.length} error(s)`);
          results.rubric_errors = errors;
        }

        // Aggregate results
        const overall = rubricUtils.aggregateRubrics(rubrics, problem);

        results.rubricScores = overall.rubric_scores;
        results.totalScore = overall.total_score;
        results.maxScore = overall.max_score;
        results.percentage = overall.percentage;
        results.overall_result = {
          passed: overall.passed,
          total_score: overall.total_score,
          max_score: overall.max_score,
          percentage: overall.percentage,
          grade: overall.grade,
          verdict: overall.verdict,
        };
      } else {
        logger.warn("No rubric results found");
        results.warning = "No rubric results generated by evaluation";
      }

      // Collect execution metadata
      const metadataFiles = [
        "execution_metadata.json",
        "performance_metrics.json",
        "summary.json",
      ];

      for (const metaFile of metadataFiles) {
        const metaPath = path.join(resultsDir, metaFile);
        try {
          const metaContent = await fs.readFile(metaPath, "utf8");
          results.metadata[metaFile.replace(".json", "")] =
            JSON.parse(metaContent);
        } catch (err) {
          // Metadata file optional
        }
      }

      // Collect logs if available
      const logsDir = path.join(resultsDir, "logs");
      const logsExist = await fs
        .access(logsDir)
        .then(() => true)
        .catch(() => false);

      if (logsExist) {
        const logFiles = await fs.readdir(logsDir);
        results.log_files = logFiles;

        // Combine main logs
        const mainLogs = [];
        for (const logFile of [
          "entrypoint.log",
          "submission.log",
          "pre_hooks.log",
          "post_hooks.log",
        ]) {
          const logPath = path.join(logsDir, logFile);
          try {
            const logContent = await fs.readFile(logPath, "utf8");
            mainLogs.push(`\n=== ${logFile} ===\n${logContent}`);
          } catch (err) {
            // Log file optional
          }
        }

        if (mainLogs.length > 0) {
          results.logs = mainLogs.join("\n");
        }
      }

      // Save complete results
      const resultsPath = path.join(resultsDir, "results.json");
      await fs.writeFile(resultsPath, JSON.stringify(results, null, 2));

      logger.info(
        `Results collected: ${results.totalScore}/${results.maxScore} (${results.percentage}%)`
      );

      return results;
    } catch (error) {
      logger.error(`Error collecting results:`, error);

      // Return partial results on error
      return {
        ...results,
        error: error.message,
        evaluation_status: "error",
      };
    }
  }

  /**
   * Send notification webhook
   */
  async sendNotification(url, jobId, results) {
    const axios = require("axios");

    try {
      await axios.post(
        url,
        {
          event: "evaluation.completed",
          jobId,
          submissionId: results.submissionId,
          results: {
            totalScore: results.totalScore,
            maxScore: results.maxScore,
            percentage: results.percentage,
            executionStatus: results.executionStatus,
          },
        },
        {
          timeout: 5000,
        }
      );

      logger.info(`Notification sent to ${url} for job ${jobId}`);
    } catch (error) {
      logger.warn(`Failed to send notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get active evaluations
   */
  getActiveEvaluations() {
    return Array.from(this.activeEvaluations.values()).map((state) => ({
      jobId: state.jobId,
      submissionId: state.submissionId,
      problemId: state.problemId,
      state: state.state,
      duration: Date.now() - state.startTime,
    }));
  }

  /**
   * Get evaluation status
   */
  getEvaluationStatus(jobId) {
    const state = this.activeEvaluations.get(jobId);
    if (!state) {
      return null;
    }

    return {
      jobId: state.jobId,
      submissionId: state.submissionId,
      problemId: state.problemId,
      state: state.state,
      duration: Date.now() - state.startTime,
      containerId: state.containerId,
    };
  }
}

// Singleton instance
let processorInstance = null;

/**
 * Get processor instance (singleton)
 */
function getProcessor() {
  if (!processorInstance) {
    processorInstance = new Processor();
  }
  return processorInstance;
}

/**
 * Initialize processor (start listening to queue events)
 */
function initializeProcessor() {
  const processor = getProcessor();
  logger.info("Processor initialized and listening for jobs");
  return processor;
}

/**
 * Process a problem package (register problem)
 */
async function processProblemPackage(problemId, packagePath, options = {}) {
  logger.info(`Processing problem package: ${problemId}`, {
    problemId,
    packagePath,
    options,
  });

  const problemDir = path.join(config.paths.problemsDir, problemId);

  try {
    // Create problem directory
    await fs.mkdir(problemDir, { recursive: true });
    logger.debug(`Created problem directory: ${problemDir}`);

    // Extract package to problem directory
    logger.info(`Extracting package to: ${problemDir}`);
    if (packagePath.endsWith(".tar.gz") || packagePath.endsWith(".zip")) {
      try {
        const packageBuffer = await fs.readFile(packagePath);
        logger.debug(`Package buffer size: ${packageBuffer.length} bytes`);
        await downloader.extractBuffer(packageBuffer, problemDir);
        logger.info(`Successfully extracted package`);
      } catch (extractError) {
        logger.error(`Failed to extract package:`, {
          error: extractError.message,
          packagePath,
          problemDir,
        });
        throw new Error(`Failed to extract package: ${extractError.message}`);
      }
    } else {
      // Assume it's already a directory
      logger.info(`Copying directory from ${packagePath} to ${problemDir}`);
      await fs.cp(packagePath, problemDir, { recursive: true });
    }

    // Validate problem structure
    const configPath = path.join(problemDir, "config.json");
    const dockerfilePath = path.join(problemDir, "Dockerfile");

    logger.debug(`Validating problem structure in ${problemDir}`);

    const configExists = await fs
      .access(configPath)
      .then(() => true)
      .catch(() => false);
    const dockerfileExists = await fs
      .access(dockerfilePath)
      .then(() => true)
      .catch(() => false);

    // List directory contents for debugging
    try {
      const dirContents = await fs.readdir(problemDir);
      logger.debug(`Problem directory contents:`, {
        problemDir,
        files: dirContents,
      });
    } catch (readError) {
      logger.warn(`Could not read problem directory`, readError);
    }

    if (!configExists) {
      logger.error(`Missing config.json in problem package`, {
        problemId,
        expectedPath: configPath,
        problemDir,
      });
      throw new Error("Problem package must contain config.json");
    }

    if (!dockerfileExists) {
      logger.error(`Missing Dockerfile in problem package`, {
        problemId,
        expectedPath: dockerfilePath,
        problemDir,
      });
      throw new Error("Problem package must contain Dockerfile");
    }

    // Load and validate config
    logger.info(`Loading and validating config.json`);
    const configContent = await fs.readFile(configPath, "utf8");
    const config = JSON.parse(configContent);

    logger.debug(`Parsed config:`, { config });

    // Support both snake_case (problem_id) and camelCase (problemId)
    const configProblemId = config.problem_id || config.problemId;

    if (!configProblemId || configProblemId !== problemId) {
      logger.error(`Problem ID mismatch`, {
        expectedId: problemId,
        actualId: configProblemId,
        configPath,
        configKeys: Object.keys(config),
      });
      throw new Error("Problem ID in config.json does not match");
    }

    // Build problem image
    logger.info(`Building problem image for ${problemId}`);
    const imageName = await docker.buildProblemImage(
      problemId,
      problemDir,
      options
    );

    logger.info(`Problem ${problemId} registered successfully`, {
      problemId,
      imageName,
    });

    return {
      problemId,
      imageName,
      config,
      registeredAt: new Date().toISOString(),
    };
  } catch (error) {
    logger.error(`Failed to process problem package:`, {
      problemId,
      packagePath,
      problemDir,
      error: error.message,
      stack: error.stack,
    });

    // Cleanup on failure
    logger.info(`Cleaning up failed problem directory: ${problemDir}`);
    await fs.rm(problemDir, { recursive: true, force: true }).catch(() => {});
    throw new Error(`Failed to process problem package: ${error.message}`);
  }
}

/**
 * Get problem information
 */
async function getProblemInfo(problemId) {
  const problemDir = path.join(config.paths.problemsDir, problemId);
  const configPath = path.join(problemDir, "config.json");

  try {
    const exists = await fs
      .access(problemDir)
      .then(() => true)
      .catch(() => false);
    if (!exists) {
      return null;
    }

    const configContent = await fs.readFile(configPath, "utf8");
    const problemConfig = JSON.parse(configContent);

    return {
      problemId,
      ...problemConfig,
      problemDir,
    };
  } catch (error) {
    logger.error(`Error loading problem ${problemId}:`, error);
    return null;
  }
}

/**
 * List all registered problems
 */
async function listProblems() {
  try {
    const problemsDir = config.paths.problemsDir;
    await fs.mkdir(problemsDir, { recursive: true });

    const entries = await fs.readdir(problemsDir, { withFileTypes: true });
    const problems = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const problemInfo = await getProblemInfo(entry.name);
        if (problemInfo) {
          problems.push(problemInfo);
        }
      }
    }

    return problems;
  } catch (error) {
    logger.error("Error listing problems:", error);
    return [];
  }
}

/**
 * Delete a problem
 */
async function deleteProblem(problemId) {
  const problemDir = path.join(config.paths.problemsDir, problemId);

  try {
    await fs.rm(problemDir, { recursive: true, force: true });

    // Try to remove problem image
    const imageName = `judgehost-problem-${problemId}:latest`;
    await docker.cleanup(null, true).catch(() => {}); // Best effort

    logger.info(`Problem ${problemId} deleted`);
    return true;
  } catch (error) {
    logger.error(`Error deleting problem ${problemId}:`, error);
    return false;
  }
}

module.exports = {
  Processor,
  EvaluationState,
  getProcessor,
  initializeProcessor,
  processProblemPackage,
  getProblemInfo,
  listProblems,
  deleteProblem,
};
