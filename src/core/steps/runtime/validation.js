/**
 * Validation step
 * Validates container state or output
 */

/**
 * Execute validation check
 * @param {Object} step - Step configuration
 * @param {string} step.type - Validation type: 'http', 'tcp', 'command', 'file'
 * @param {Object} step.config - Type-specific configuration
 * @param {Object} container - Docker container instance
 * @param {Object} logger - Logger instance
 * @returns {Promise<Object>} Validation result
 */
async function executeValidation(step, container, logger) {
  if (!step.validation_type) {
    throw new Error("Validation step requires 'validation_type' property");
  }

  logger.info(`Executing validation: ${step.validation_type}`);

  switch (step.validation_type) {
    case "http":
      return await validateHttp(step, container, logger);

    case "tcp":
      return await validateTcp(step, container, logger);

    case "command":
      return await validateCommand(step, container, logger);

    case "file":
      return await validateFile(step, container, logger);

    default:
      throw new Error(`Unknown validation type: ${step.validation_type}`);
  }
}

/**
 * Validate HTTP endpoint
 */
async function validateHttp(step, container, logger) {
  const { url, expected_status, timeout = 10 } = step.config || {};

  if (!url) {
    throw new Error("HTTP validation requires 'url' in config");
  }

  const command = `wget --spider --timeout=${timeout} -O /dev/null ${url} 2>&1`;

  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start();
  let output = "";

  stream.on("data", (chunk) => {
    output += chunk.toString();
  });

  return new Promise((resolve) => {
    stream.on("end", async () => {
      const inspectData = await exec.inspect();
      const success = inspectData.ExitCode === 0;

      resolve({
        type: "http",
        success,
        message: success
          ? `HTTP endpoint ${url} is accessible`
          : `HTTP endpoint ${url} failed`,
        output,
      });
    });
  });
}

/**
 * Validate TCP port
 */
async function validateTcp(step, container, logger) {
  const { host, port, timeout = 5 } = step.config || {};

  if (!host || !port) {
    throw new Error("TCP validation requires 'host' and 'port' in config");
  }

  const command = `timeout ${timeout} nc -zv ${host} ${port} 2>&1`;

  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start();
  let output = "";

  stream.on("data", (chunk) => {
    output += chunk.toString();
  });

  return new Promise((resolve) => {
    stream.on("end", async () => {
      const inspectData = await exec.inspect();
      const success = inspectData.ExitCode === 0;

      resolve({
        type: "tcp",
        success,
        message: success
          ? `TCP port ${host}:${port} is open`
          : `TCP port ${host}:${port} is not accessible`,
        output,
      });
    });
  });
}

/**
 * Validate using custom command
 */
async function validateCommand(step, container, logger) {
  const { command, expected_exit_code = 0 } = step.config || {};

  if (!command) {
    throw new Error("Command validation requires 'command' in config");
  }

  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start();
  let output = "";

  stream.on("data", (chunk) => {
    output += chunk.toString();
  });

  return new Promise((resolve) => {
    stream.on("end", async () => {
      const inspectData = await exec.inspect();
      const success = inspectData.ExitCode === expected_exit_code;

      resolve({
        type: "command",
        success,
        message: success
          ? "Command validation passed"
          : `Command exited with code ${inspectData.ExitCode}, expected ${expected_exit_code}`,
        output,
        exitCode: inspectData.ExitCode,
      });
    });
  });
}

/**
 * Validate file exists
 */
async function validateFile(step, container, logger) {
  const { path, content_check } = step.config || {};

  if (!path) {
    throw new Error("File validation requires 'path' in config");
  }

  let command = `test -f ${path}`;
  if (content_check) {
    command += ` && cat ${path} | grep -q "${content_check}"`;
  }

  const exec = await container.exec({
    Cmd: ["/bin/sh", "-c", command],
    AttachStdout: true,
    AttachStderr: true,
  });

  const stream = await exec.start();

  return new Promise((resolve) => {
    stream.on("end", async () => {
      const inspectData = await exec.inspect();
      const success = inspectData.ExitCode === 0;

      resolve({
        type: "file",
        success,
        message: success
          ? `File ${path} exists${
              content_check ? " with expected content" : ""
            }`
          : `File ${path} validation failed`,
      });
    });
  });
}

module.exports = { executeValidation };
