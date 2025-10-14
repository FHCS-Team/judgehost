/**
 * USER build step - Set user
 */

/**
 * Generate Dockerfile USER instruction
 * @param {Object} step - Step configuration
 * @param {string} step.user - User name or UID
 * @param {string} [step.group] - Optional group name or GID
 * @returns {string} Dockerfile instruction
 */
function generateUser(step) {
  if (!step.user) {
    throw new Error("USER step requires 'user' property");
  }

  let instruction = `USER ${step.user}`;

  if (step.group) {
    instruction += `:${step.group}`;
  }

  return instruction;
}

module.exports = { generateUser };
