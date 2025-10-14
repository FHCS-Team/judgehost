/**
 * Post-execution hook step
 * Runs after the main container execution
 */

/**
 * Execute post-execution hook
 * @param {Object} step - Step configuration
 * @param {string} step.script - Script path to execute
 * @param {Object} step.environment - Additional environment variables
 * @param {number} [step.timeout] - Timeout in seconds
 * @param {Object} container - Docker container instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Execution result
 */
async function executePostHook(step, container, logger) {
  if (!step.script) {
    throw new Error("Post-hook step requires 'script' property");
  }

  logger.info(`Executing post-hook: ${step.script}`);

  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", step.script],
    AttachStdout: true,
    AttachStderr: true,
    Env: step.environment
      ? Object.entries(step.environment).map(([k, v]) => `${k}=${v}`)
      : [],
  });

  const stream = await exec.start();

  // Collect output
  let output = "";
  stream.on("data", (chunk) => {
    output += chunk.toString();
  });

  return new Promise((resolve, reject) => {
    const timeout = step.timeout || 60;
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Post-hook timeout after ${timeout}s`));
    }, timeout * 1000);

    stream.on("end", async () => {
      clearTimeout(timeoutHandle);
      const inspectData = await exec.inspect();

      resolve({
        exitCode: inspectData.ExitCode,
        output,
        success: inspectData.ExitCode === 0,
      });
    });

    stream.on("error", (err) => {
      clearTimeout(timeoutHandle);
      reject(err);
    });
  });
}

module.exports = { executePostHook };
