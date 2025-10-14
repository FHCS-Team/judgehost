/**
 * ONBUILD build step - Add trigger instruction
 */

/**
 * Generate Dockerfile ONBUILD instruction
 * @param {Object} step - Step configuration
 * @param {string} step.instruction - Instruction to execute on child build
 * @returns {string} Dockerfile instruction
 */
function generateOnbuild(step) {
  if (!step.instruction) {
    throw new Error("ONBUILD step requires 'instruction' property");
  }

  return `ONBUILD ${step.instruction}`;
}

module.exports = { generateOnbuild };
