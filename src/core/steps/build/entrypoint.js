/**
 * ENTRYPOINT build step - Container entrypoint
 */

/**
 * Generate Dockerfile ENTRYPOINT instruction
 * @param {Object} step - Step configuration
 * @param {Array<string>|string} step.command - Command in exec or shell form
 * @param {boolean} [step.shell_form] - Use shell form instead of exec form
 * @returns {string} Dockerfile instruction
 */
function generateEntrypoint(step) {
  if (!step.command) {
    throw new Error("ENTRYPOINT step requires 'command' property");
  }

  if (step.shell_form && typeof step.command === "string") {
    // Shell form
    return `ENTRYPOINT ${step.command}`;
  }

  // Exec form (preferred)
  const cmdArray = Array.isArray(step.command) ? step.command : [step.command];
  return `ENTRYPOINT [${cmdArray.map((c) => `"${c}"`).join(", ")}]`;
}

module.exports = { generateEntrypoint };
