/**
 * LABEL build step - Add metadata labels
 */

/**
 * Generate Dockerfile LABEL instruction
 * @param {Object} step - Step configuration
 * @param {Object} step.labels - Labels as key-value pairs
 * @returns {string} Dockerfile instruction
 */
function generateLabel(step) {
  if (!step.labels || typeof step.labels !== "object") {
    throw new Error("LABEL step requires 'labels' property as object");
  }

  const entries = Object.entries(step.labels);

  if (entries.length === 0) {
    return "";
  }

  // Multi-line format for readability
  return entries.map(([key, value]) => `LABEL ${key}="${value}"`).join("\n");
}

module.exports = { generateLabel };
