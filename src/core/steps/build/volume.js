/**
 * VOLUME build step - Define volumes
 */

/**
 * Generate Dockerfile VOLUME instruction
 * @param {Object} step - Step configuration
 * @param {string|Array<string>} step.paths - Volume path(s)
 * @returns {string} Dockerfile instruction
 */
function generateVolume(step) {
  if (!step.paths) {
    throw new Error("VOLUME step requires 'paths' property");
  }

  const paths = Array.isArray(step.paths) ? step.paths : [step.paths];

  // JSON array format
  return `VOLUME [${paths.map((p) => `"${p}"`).join(", ")}]`;
}

module.exports = { generateVolume };
