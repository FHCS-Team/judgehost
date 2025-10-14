/**
 * Pre-execution hook step
 * Runs before the main container execution
 */

/**
 * Execute pre-execution hook
 * @param {Object} step - Step configuration
 * @param {string} step.script - Script path to execute
 * @param {Object} step.environment - Additional environment variables
 * @param {number} [step.timeout] - Timeout in seconds
 * @param {Object} container - Docker container instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Execution result
 */
async function executePreHook(step, container, logger) {
  if (!step.script) {
    throw new Error("Pre-hook step requires 'script' property");
  }

  logger.info(`Executing pre-hook: ${step.script}`);

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
    const timeout = step.timeout || 30;
    const timeoutHandle = setTimeout(() => {
      reject(new Error(`Pre-hook timeout after ${timeout}s`));
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

module.exports = { executePreHook };
