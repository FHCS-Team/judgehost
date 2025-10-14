const logger = require("../../utils/logger");
const docker = require("./client");

/**
 * Create an isolated Docker network for a submission.
 * @param {string} submissionId
 * @returns {Promise<string>} network id
 */
async function createNetwork(submissionId) {
  const networkName = `judgehost-eval-${submissionId}`;

  try {
    logger.info(`Creating network ${networkName}`);

    const network = await docker.createNetwork({
      Name: networkName,
      Driver: "bridge",
      Internal: true,
      Attachable: false,
      Labels: {
        "judgehost.submission_id": submissionId,
        "judgehost.created_at": new Date().toISOString(),
      },
      Options: {
        "com.docker.network.bridge.enable_icc": "true",
        "com.docker.network.bridge.enable_ip_masquerade": "false",
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
