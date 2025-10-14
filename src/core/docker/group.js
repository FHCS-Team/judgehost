const logger = require("../../utils/logger");
const docker = require("./client");
const { waitForDependency } = require("./dependency");

/**
 * Start containers in a group, waiting for their declared dependencies.
 * This function only starts containers and tracks statuses in a map.
 * @param {Object} containerGroup
 * @returns {Promise<Map>} map of containerId -> start metadata
 */
async function startContainerGroup(containerGroup) {
  logger.info(`Starting container group for ${containerGroup.submissionId}`);

  const startedContainers = new Map();

  for (const containerInfo of containerGroup.containers) {
    const { dockerContainerId, containerId, config } = containerInfo;

    if (config.depends_on && Array.isArray(config.depends_on)) {
      logger.info(
        `Container ${containerId} has ${config.depends_on.length} dependencies`
      );
      for (const dependency of config.depends_on) {
        await waitForDependency(containerGroup, dependency, startedContainers);
      }
    }

    logger.info(`Starting container ${containerId}`);
    const container = docker.getContainer(dockerContainerId);
    await container.start();

    startedContainers.set(containerId, {
      dockerContainerId,
      status: "starting",
      startedAt: Date.now(),
    });
  }

  logger.info(`All containers started for ${containerGroup.submissionId}`);
  return startedContainers;
}

/**
 * Monitor containers which, when finished, should trigger termination of other containers.
 * @param {Object} containerGroup
 * @param {Function} [onTerminate]
 * @returns {Promise<void>}
 */
async function monitorContainerTerminations(containerGroup, onTerminate) {
  logger.info(
    `Starting termination monitoring for ${containerGroup.submissionId}`
  );

  const terminationPromises = [];

  for (const containerInfo of containerGroup.containers) {
    const { dockerContainerId, containerId, config } = containerInfo;
    const terminates = config.terminates || config.terminate_on_finish || [];

    if (terminates.length === 0) continue;

    const monitorPromise = (async () => {
      try {
        const container = docker.getContainer(dockerContainerId);
        const result = await container.wait();

        logger.info(
          `Container ${containerId} finished with status ${result.StatusCode}`
        );

        for (const targetContainerId of terminates) {
          await terminateContainer(containerGroup, targetContainerId);
        }

        if (onTerminate) await onTerminate(containerId, terminates);
      } catch (error) {
        logger.error(
          `Error monitoring container ${containerId}:`,
          error.message
        );
      }
    })();

    terminationPromises.push(monitorPromise);
  }

  if (terminationPromises.length > 0) await Promise.all(terminationPromises);
}

/**
 * Terminate a container in the group either gracefully (stop) or forcefully (kill).
 * @param {Object} containerGroup
 * @param {string} containerId
 * @param {boolean} [graceful=true]
 * @returns {Promise<void>}
 */
async function terminateContainer(
  containerGroup,
  containerId,
  graceful = true
) {
  const containerInfo = containerGroup.containers.find(
    (c) => c.containerId === containerId
  );
  if (!containerInfo) {
    logger.warn(`Container ${containerId} not found in group`);
    return;
  }

  logger.info(
    `Terminating container ${containerId} ${
      graceful ? "(graceful)" : "(forced)"
    }`
  );

  try {
    const container = docker.getContainer(containerInfo.dockerContainerId);
    const info = await container.inspect().catch(() => null);
    if (!info || !info.State || !info.State.Running) return;

    if (graceful) {
      try {
        await container.stop({ t: 10 });
        logger.info(`Container ${containerId} stopped gracefully`);
      } catch (error) {
        if (error.statusCode === 304) {
          logger.debug(`Container ${containerId} already stopped`);
        } else {
          throw error;
        }
      }
    } else {
      await container.kill();
      logger.info(`Container ${containerId} forcefully killed`);
    }
  } catch (error) {
    logger.error(`Error terminating container ${containerId}:`, error.message);
    throw error;
  }
}

/**
 * Wait for the group's primary execution containers (sidecar/tester) to finish.
 * @param {Object} containerGroup
 * @param {number} timeoutMs - milliseconds to wait in total
 * @returns {Promise<Object>} results mapping containerId -> { statusCode, exitCode }
 */
async function waitForContainerGroup(containerGroup, timeoutMs) {
  logger.info(`Waiting for container group ${containerGroup.submissionId}`);

  const results = {};
  const startTime = Date.now();

  const executionContainers = containerGroup.containers.filter(
    (c) => c.role === "sidecar" || c.role === "tester"
  );
  if (executionContainers.length === 0)
    throw new Error("No execution container found in group");

  for (const containerInfo of executionContainers) {
    const remainingTime = timeoutMs - (Date.now() - startTime);
    if (remainingTime <= 0)
      throw new Error("Container group execution timeout");

    const container = docker.getContainer(containerInfo.dockerContainerId);

    try {
      const result = await Promise.race([
        container.wait(),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Timeout")), remainingTime)
        ),
      ]);

      results[containerInfo.containerId] = {
        statusCode: result.StatusCode,
        exitCode: result.StatusCode,
      };
    } catch (error) {
      results[containerInfo.containerId] = {
        statusCode: -1,
        error: error.message,
        timedOut: true,
      };
    }
  }

  return results;
}

module.exports = {
  startContainerGroup,
  monitorContainerTerminations,
  terminateContainer,
  waitForContainerGroup,
};
