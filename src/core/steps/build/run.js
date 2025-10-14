/**
 * RUN build step - Execute shell commands during build
 */

/**
 * Generate Dockerfile RUN instruction
 * @param {Object} step - Step configuration
 * @param {string|Array<string>} step.command - Command(s) to execute
 * @returns {string} Dockerfile instruction
 */
function generateRun(step) {
  if (!step.command) {
    throw new Error("RUN step requires 'command' property");
  }

  const commands = Array.isArray(step.command) ? step.command : [step.command];

  if (commands.length === 1) {
    return `RUN ${commands[0]}`;
  }

  // Multi-line format with continuation
  return `RUN ${commands.join(" && \\\n    ")}`;
}

module.exports = { generateRun };
