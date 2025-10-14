/**
 * Hook Execution Orchestrator
 * Manages execution of pre, post, and periodic hooks for evaluation containers
 *
 * Hooks are executed via docker exec (from host), not inside containers.
 * Hooks write rubric outputs to /out/rubric_<rubric_id>.json
 */

const fs = require("fs/promises");
const path = require("path");
const logger = require("../utils/logger");

/**
 * Hook types
 */
const HookType = {
  PRE: "pre",
  POST: "post",
  PERIODIC: "periodic",
};

/**
 * Execute all pre-hooks for a container sequentially
 * Pre-hooks run before the submission application starts
 *
 * @param {Object} dockerContainer - Docker container instance
 * @param {Array<string>} hookScripts - Array of hook script paths
 * @param {Object} options - Execution options
 * @returns {Promise<Array<Object>>} Array of hook results
 */
async function executePreHooks(dockerContainer, hookScripts, options = {}) {
  const { timeout = 60, environment = {} } = options;
  const results = [];

  logger.info(`Executing ${hookScripts.length} pre-hooks sequentially`);

  for (const hookScript of hookScripts) {
    try {
      logger.info(`Executing pre-hook: ${hookScript}`);

      const result = await executeHook(dockerContainer, hookScript, {
        timeout,
        environment,
        hookType: HookType.PRE,
      });

      results.push({
        hook: hookScript,
        success: result.exitCode === 0,
        exitCode: result.exitCode,
        output: result.output,
        error: result.error,
        duration: result.duration,
      });

      // If pre-hook fails, stop execution
      if (result.exitCode !== 0) {
        logger.error(
          `Pre-hook ${hookScript} failed with exit code ${result.exitCode}`
        );
        throw new Error(`Pre-hook failed: ${hookScript}`);
      }
    } catch (error) {
      logger.error(`Error executing pre-hook ${hookScript}:`, error);
      results.push({
        hook: hookScript,
        success: false,
        exitCode: -1,
        error: error.message,
      });
      throw error; // Stop on first failure
    }
  }

  return results;
}

/**
 * Execute all post-hooks for a container
 * Post-hooks may run concurrently if they don't have dependencies
 *
 * @param {Object} dockerContainer - Docker container instance
 * @param {Array<string>} hookScripts - Array of hook script paths
 * @param {Object} options - Execution options
 * @returns {Promise<Array<Object>>} Array of hook results
 */
async function executePostHooks(dockerContainer, hookScripts, options = {}) {
  const { timeout = 300, environment = {}, concurrent = false } = options;
  const results = [];

  logger.info(
    `Executing ${hookScripts.length} post-hooks ${
      concurrent ? "concurrently" : "sequentially"
    }`
  );

  if (concurrent) {
    // Execute all hooks in parallel
    const promises = hookScripts.map((hookScript) =>
      executeHook(dockerContainer, hookScript, {
        timeout,
        environment,
        hookType: HookType.POST,
      })
        .then((result) => ({
          hook: hookScript,
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          output: result.output,
          error: result.error,
          duration: result.duration,
        }))
        .catch((error) => ({
          hook: hookScript,
          success: false,
          exitCode: -1,
          error: error.message,
        }))
    );

    return await Promise.all(promises);
  } else {
    // Execute sequentially (default for safety)
    for (const hookScript of hookScripts) {
      try {
        logger.info(`Executing post-hook: ${hookScript}`);

        const result = await executeHook(dockerContainer, hookScript, {
          timeout,
          environment,
          hookType: HookType.POST,
        });

        results.push({
          hook: hookScript,
          success: result.exitCode === 0,
          exitCode: result.exitCode,
          output: result.output,
          error: result.error,
          duration: result.duration,
        });

        // Post-hooks can fail without stopping evaluation
        if (result.exitCode !== 0) {
          logger.warn(
            `Post-hook ${hookScript} failed with exit code ${result.exitCode}`
          );
        }
      } catch (error) {
        logger.error(`Error executing post-hook ${hookScript}:`, error);
        results.push({
          hook: hookScript,
          success: false,
          exitCode: -1,
          error: error.message,
        });
        // Continue with other post-hooks even if one fails
      }
    }

    return results;
  }
}

/**
 * Start periodic hooks that run continuously during evaluation
 *
 * @param {Object} dockerContainer - Docker container instance
 * @param {Array<Object>} periodicHooks - Array of periodic hook configurations
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Control object with stop function
 */
async function startPeriodicHooks(
  dockerContainer,
  periodicHooks,
  options = {}
) {
  const { environment = {} } = options;
  const activeHooks = [];

  logger.info(`Starting ${periodicHooks.length} periodic hooks`);

  for (const hookConfig of periodicHooks) {
    const { script, interval = 10 } = hookConfig;
    let running = true;
    let iterationCount = 0;

    const intervalId = setInterval(async () => {
      if (!running) {
        clearInterval(intervalId);
        return;
      }

      try {
        iterationCount++;
        logger.debug(
          `Executing periodic hook: ${script} (iteration ${iterationCount})`
        );

        await executeHook(dockerContainer, script, {
          timeout: Math.min(interval - 1, 30), // Timeout less than interval
          environment,
          hookType: HookType.PERIODIC,
        });
      } catch (error) {
        logger.warn(
          `Periodic hook ${script} iteration ${iterationCount} failed:`,
          error.message
        );
        // Don't stop on failure, continue monitoring
      }
    }, interval * 1000);

    activeHooks.push({
      script,
      interval,
      intervalId,
      stop: () => {
        running = false;
        clearInterval(intervalId);
      },
    });
  }

  return {
    hooks: activeHooks,
    stop: () => {
      logger.info(`Stopping ${activeHooks.length} periodic hooks`);
      activeHooks.forEach((hook) => hook.stop());
    },
  };
}

/**
 * Execute a single hook via docker exec
 *
 * @param {Object} dockerContainer - Docker container instance
 * @param {string} hookScript - Hook script path (e.g., /hooks/post/01_test_api.sh)
 * @param {Object} options - Execution options
 * @returns {Promise<Object>} Execution result
 */
async function executeHook(dockerContainer, hookScript, options = {}) {
  const { timeout = 60, environment = {}, hookType = "unknown" } = options;
  const startTime = Date.now();

  try {
    // Create exec instance
    const exec = await dockerContainer.exec({
      Cmd: ["/bin/sh", "-c", hookScript],
      AttachStdout: true,
      AttachStderr: true,
      Env: Object.entries(environment).map(([k, v]) => `${k}=${v}`),
    });

    // Start execution
    const stream = await exec.start();

    // Collect output
    let stdout = "";
    let stderr = "";

    stream.on("data", (chunk) => {
      const str = chunk.toString();
      stdout += str;

      // Log output in real-time for debugging
      if (process.env.LOG_HOOK_OUTPUT === "true") {
        logger.debug(
          `[${hookType}:${path.basename(hookScript)}] ${str.trim()}`
        );
      }
    });

    // Wait for completion with timeout
    return await Promise.race([
      new Promise((resolve, reject) => {
        stream.on("end", async () => {
          try {
            const inspectData = await exec.inspect();
            const duration = Date.now() - startTime;

            resolve({
              exitCode: inspectData.ExitCode,
              output: stdout,
              error: stderr || (inspectData.ExitCode !== 0 ? stdout : null),
              duration,
            });
          } catch (error) {
            reject(error);
          }
        });

        stream.on("error", (err) => {
          reject(err);
        });
      }),
      new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Hook timeout after ${timeout}s`));
        }, timeout * 1000);
      }),
    ]);
  } catch (error) {
    const duration = Date.now() - startTime;
    throw {
      exitCode: -1,
      error: error.message,
      duration,
    };
  }
}

/**
 * Discover hooks in a container's hooks directory
 *
 * @param {string} problemDir - Problem directory path
 * @param {string} containerId - Container ID
 * @param {string} hookType - Hook type (pre, post, periodic)
 * @returns {Promise<Array<string>>} Array of hook script paths
 */
async function discoverHooks(problemDir, containerId, hookType) {
  const hooksDir = path.join(problemDir, containerId, "hooks", hookType);

  try {
    const files = await fs.readdir(hooksDir);

    // Filter executable scripts and sort lexicographically
    const hookScripts = files
      .filter(
        (file) =>
          file.endsWith(".sh") || file.endsWith(".py") || file.endsWith(".js")
      )
      .sort()
      .map((file) => `/hooks/${hookType}/${file}`); // Path inside container

    logger.info(
      `Discovered ${hookScripts.length} ${hookType} hooks for container ${containerId}`
    );
    return hookScripts;
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.debug(
        `No ${hookType} hooks directory found for container ${containerId}`
      );
      return [];
    }
    throw error;
  }
}

/**
 * Discover periodic hooks from configuration
 *
 * @param {Object} containerConfig - Container configuration
 * @returns {Array<Object>} Array of periodic hook configurations
 */
function discoverPeriodicHooks(containerConfig) {
  if (
    !containerConfig.periodic_hooks ||
    !Array.isArray(containerConfig.periodic_hooks)
  ) {
    return [];
  }

  return containerConfig.periodic_hooks.map((hook) => ({
    script: hook.script || `/hooks/periodic/${hook.name}`,
    interval: hook.interval || 10,
    name: hook.name,
  }));
}

/**
 * Collect rubric outputs from container's /out directory
 *
 * @param {Object} dockerContainer - Docker container instance
 * @param {string} outputDir - Local output directory
 * @returns {Promise<Array<Object>>} Array of rubric results
 */
async function collectRubricOutputs(dockerContainer, outputDir) {
  try {
    // Copy /out directory from container
    const tarStream = await dockerContainer.getArchive({ path: "/out" });

    // Extract tar stream to output directory
    const tar = require("tar-fs");
    const { Readable } = require("stream");

    await new Promise((resolve, reject) => {
      Readable.from(tarStream)
        .pipe(tar.extract(outputDir))
        .on("finish", resolve)
        .on("error", reject);
    });

    // Read all rubric_*.json files
    const outDir = path.join(outputDir, "out");
    const files = await fs.readdir(outDir);

    const rubricFiles = files.filter(
      (file) => file.startsWith("rubric_") && file.endsWith(".json")
    );

    const rubrics = [];
    for (const file of rubricFiles) {
      try {
        const content = await fs.readFile(path.join(outDir, file), "utf-8");
        const rubricData = JSON.parse(content);
        rubrics.push(rubricData);
        logger.info(`Collected rubric output: ${rubricData.rubric_id}`);
      } catch (error) {
        logger.error(`Failed to parse rubric file ${file}:`, error);
      }
    }

    return rubrics;
  } catch (error) {
    logger.error("Failed to collect rubric outputs:", error);
    return [];
  }
}

module.exports = {
  HookType,
  executePreHooks,
  executePostHooks,
  startPeriodicHooks,
  executeHook,
  discoverHooks,
  discoverPeriodicHooks,
  collectRubricOutputs,
};
