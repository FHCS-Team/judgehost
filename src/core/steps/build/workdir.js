/**
 * WORKDIR build step - Set working directory
 */

/**
 * Generate Dockerfile WORKDIR instruction
 * @param {Object} step - Step configuration
 * @param {string} step.path - Working directory path
 * @returns {string} Dockerfile instruction
 */
function generateWorkdir(step) {
  if (!step.path) {
    throw new Error("WORKDIR step requires 'path' property");
  }

  return `WORKDIR ${step.path}`;
}

module.exports = { generateWorkdir };
