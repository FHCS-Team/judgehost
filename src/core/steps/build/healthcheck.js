/**
 * HEALTHCHECK build step - Configure container health check
 */

/**
 * Generate Dockerfile HEALTHCHECK instruction
 * @param {Object} step - Step configuration
 * @param {string} step.command - Health check command
 * @param {number} [step.interval] - Interval between checks in seconds (default: 30)
 * @param {number} [step.timeout] - Timeout for each check in seconds (default: 30)
 * @param {number} [step.start_period] - Start period before checks begin in seconds (default: 0)
 * @param {number} [step.retries] - Number of consecutive failures needed to be unhealthy (default: 3)
 * @param {boolean} [step.disable] - Set to true to disable health checking
 * @returns {string} Dockerfile instruction
 */
function generateHealthcheck(step) {
  // Allow disabling health check
  if (step.disable) {
    return "HEALTHCHECK NONE";
  }

  if (!step.command) {
    throw new Error(
      "HEALTHCHECK step requires 'command' property or 'disable: true'"
    );
  }

  const options = [];

  if (step.interval) {
    options.push(`--interval=${step.interval}s`);
  }

  if (step.timeout) {
    options.push(`--timeout=${step.timeout}s`);
  }

  if (step.start_period) {
    options.push(`--start-period=${step.start_period}s`);
  }

  if (step.retries) {
    options.push(`--retries=${step.retries}`);
  }

  const optionsStr = options.length > 0 ? options.join(" ") + " " : "";

  return `HEALTHCHECK ${optionsStr}CMD ${step.command}`;
}

module.exports = { generateHealthcheck };
