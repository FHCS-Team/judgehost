/**
 * CMD build step - Default command
 */

/**
 * Generate Dockerfile CMD instruction
 * @param {Object} step - Step configuration
 * @param {Array<string>|string} step.command - Command in exec or shell form
 * @param {boolean} [step.shell_form] - Use shell form instead of exec form
 * @returns {string} Dockerfile instruction
 */
function generateCmd(step) {
  if (!step.command) {
    throw new Error("CMD step requires 'command' property");
  }

  if (step.shell_form && typeof step.command === "string") {
    // Shell form
    return `CMD ${step.command}`;
  }

  // Exec form (preferred)
  const cmdArray = Array.isArray(step.command) ? step.command : [step.command];
  return `CMD [${cmdArray.map((c) => `"${c}"`).join(", ")}]`;
}

module.exports = { generateCmd };
