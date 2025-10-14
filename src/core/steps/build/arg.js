/**
 * ARG build step - Define build arguments
 */

/**
 * Generate Dockerfile ARG instruction
 * @param {Object} step - Step configuration
 * @param {Object} step.args - Build arguments as key-value pairs
 * @returns {string} Dockerfile instruction
 */
function generateArg(step) {
  if (!step.args || typeof step.args !== "object") {
    throw new Error("ARG step requires 'args' property as object");
  }

  const entries = Object.entries(step.args);

  if (entries.length === 0) {
    return "";
  }

  return entries
    .map(([key, value]) => {
      // If value is provided, include default
      if (value !== undefined && value !== null) {
        return `ARG ${key}="${value}"`;
      }
      return `ARG ${key}`;
    })
    .join("\n");
}

module.exports = { generateArg };
