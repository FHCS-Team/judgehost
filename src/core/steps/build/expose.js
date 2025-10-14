/**
 * EXPOSE build step - Expose ports
 */

/**
 * Generate Dockerfile EXPOSE instruction
 * @param {Object} step - Step configuration
 * @param {number|Array<number>} step.ports - Port(s) to expose
 * @param {string} [step.protocol] - Protocol (tcp/udp), defaults to tcp
 * @returns {string} Dockerfile instruction
 */
function generateExpose(step) {
  if (!step.ports) {
    throw new Error("EXPOSE step requires 'ports' property");
  }

  const ports = Array.isArray(step.ports) ? step.ports : [step.ports];
  const protocol = step.protocol || "tcp";

  return ports.map((port) => `EXPOSE ${port}/${protocol}`).join("\n");
}

module.exports = { generateExpose };
