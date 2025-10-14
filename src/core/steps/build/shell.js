/**
 * SHELL build step - Override default shell
 */

/**
 * Generate Dockerfile SHELL instruction
 * @param {Object} step - Step configuration
 * @param {Array<string>} step.shell_form - Shell form as array (e.g., ["/bin/bash", "-c"])
 * @returns {string} Dockerfile instruction
 */
function generateShell(step) {
  if (!step.shell_form || !Array.isArray(step.shell_form)) {
    throw new Error("SHELL step requires 'shell_form' property as array");
  }

  if (step.shell_form.length === 0) {
    throw new Error("SHELL step requires at least one element in 'shell_form'");
  }

  // JSON array format
  return `SHELL [${step.shell_form.map((s) => `"${s}"`).join(", ")}]`;
}

module.exports = { generateShell };
