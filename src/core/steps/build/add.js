/**
 * ADD build step - Add files (with URL and tar extraction support)
 */

/**
 * Generate Dockerfile ADD instruction
 * @param {Object} step - Step configuration
 * @param {string} step.source - Source path or URL
 * @param {string} step.destination - Destination path
 * @param {string} [step.chown] - Optional ownership specification
 * @returns {string} Dockerfile instruction
 */
function generateAdd(step) {
  if (!step.source || !step.destination) {
    throw new Error("ADD step requires 'source' and 'destination' properties");
  }

  let instruction = "ADD";

  // Add --chown flag if specified
  if (step.chown) {
    instruction += ` --chown=${step.chown}`;
  }

  instruction += ` ${step.source} ${step.destination}`;

  return instruction;
}

module.exports = { generateAdd };
