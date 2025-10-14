/**
 * COPY build step - Copy files into image
 */

/**
 * Generate Dockerfile COPY instruction
 * @param {Object} step - Step configuration
 * @param {string} step.source - Source path
 * @param {string} step.destination - Destination path
 * @param {string} [step.chown] - Optional ownership specification
 * @param {string} [step.from] - Optional stage to copy from (multi-stage builds)
 * @returns {string} Dockerfile instruction
 */
function generateCopy(step) {
  if (!step.source || !step.destination) {
    throw new Error("COPY step requires 'source' and 'destination' properties");
  }

  let instruction = "COPY";

  // Add --from flag for multi-stage builds
  if (step.from) {
    instruction += ` --from=${step.from}`;
  }

  // Add --chown flag if specified
  if (step.chown) {
    instruction += ` --chown=${step.chown}`;
  }

  instruction += ` ${step.source} ${step.destination}`;

  return instruction;
}

module.exports = { generateCopy };
