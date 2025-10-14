/**
 * Runtime Steps Registry
 * Central registry for container execution/runtime steps
 */

const { executePreHook } = require("./preHook");
const { executePostHook } = require("./postHook");
const { executeValidation } = require("./validation");
const { executeDataCollection } = require("./dataCollection");

/**
 * Runtime step types enum
 */
const RuntimeStepType = {
  PRE_HOOK: "pre_hook",
  POST_HOOK: "post_hook",
  VALIDATION: "validation",
  DATA_COLLECTION: "data_collection",
};

/**
 * Map of step types to their executor functions
 */
const stepExecutors = {
  [RuntimeStepType.PRE_HOOK]: executePreHook,
  [RuntimeStepType.POST_HOOK]: executePostHook,
  [RuntimeStepType.VALIDATION]: executeValidation,
  [RuntimeStepType.DATA_COLLECTION]: executeDataCollection,
};

/**
 * Execute runtime step
 * @param {Object} step - Step configuration
 * @param {Object} context - Execution context (container, logger, outputDir, etc.)
 * @returns {Promise<Object>} Execution result
 */
async function executeRuntimeStep(step, context) {
  const executor = stepExecutors[step.type];

  if (!executor) {
    throw new Error(`Unknown runtime step type: ${step.type}`);
  }

  return await executor(
    step,
    context.container,
    context.outputDir || context.logger,
    context.logger
  );
}

module.exports = {
  RuntimeStepType,
  stepExecutors,
  executeRuntimeStep,
};
