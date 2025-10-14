/**
 * STOPSIGNAL build step - Set stop signal
 */

/**
 * Generate Dockerfile STOPSIGNAL instruction
 * @param {Object} step - Step configuration
 * @param {string} step.signal - Signal to send (e.g., "SIGTERM", "SIGKILL", "15")
 * @returns {string} Dockerfile instruction
 */
function generateStopsignal(step) {
  if (!step.signal) {
    throw new Error("STOPSIGNAL step requires 'signal' property");
  }

  return `STOPSIGNAL ${step.signal}`;
}

module.exports = { generateStopsignal };
