const logger = require("../../utils/logger");
const docker = require("./client");

/**
 * Create an isolated Docker network for a submission.
 * @param {string} networkName - Network name
 * @param {Object} options - Network options
 * @param {boolean} options.internal - Whether to isolate from external networks
 * @param {Object} options.labels - Labels to attach to the network
 * @returns {Promise<string>} network id
 */
async function createNetwork(networkName, options = {}) {
  const { internal = true, labels = {} } = options;

  try {
    logger.info(`Creating network ${networkName}`);

    const network = await docker.createNetwork({
      Name: networkName,
      Driver: "bridge",
      Internal: internal,
      Attachable: false,
      Labels: {
        "judgehost.created_at": new Date().toISOString(),
        ...labels,
      },
      Options: {
        "com.docker.network.bridge.enable_icc": "true",
        "com.docker.network.bridge.enable_ip_masquerade": internal
          ? "false"
          : "true",
      },
    });

    logger.info(`Created network ${networkName} (${network.id})`);
    return network.id;
  } catch (error) {
    logger.error(`Failed to create network ${networkName}:`, error);
    throw error;
  }
}

/**
 * Remove a network previously created for a submission.
 * @param {string} submissionId
 * @returns {Promise<boolean>} true on success
 */
async function removeNetwork(submissionId) {
  const networkName = `judgehost-eval-${submissionId}`;

  try {
    const network = docker.getNetwork(networkName);
    await network.remove();
    logger.info(`Removed network ${networkName}`);
    return true;
  } catch (error) {
    if (error.statusCode === 404) {
      logger.debug(`Network ${networkName} not found, already removed`);
      return true;
    }
    logger.error(`Failed to remove network ${networkName}:`, error);
    return false;
  }
}
module.exports = {
  createNetwork,
  removeNetwork,
};
