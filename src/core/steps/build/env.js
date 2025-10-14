/**
 * ENV build step - Set environment variables
 */

/**
 * Generate Dockerfile ENV instruction
 * @param {Object} step - Step configuration
 * @param {Object} step.env - Environment variables as key-value pairs
 * @returns {string} Dockerfile instruction
 */
function generateEnv(step) {
  if (!step.env || typeof step.env !== "object") {
    throw new Error("ENV step requires 'env' property as object");
  }

  const entries = Object.entries(step.env);

  if (entries.length === 0) {
    return "";
  }

  // Use multi-line format for better readability
  return entries.map(([key, value]) => `ENV ${key}="${value}"`).join("\n");
}

module.exports = { generateEnv };
