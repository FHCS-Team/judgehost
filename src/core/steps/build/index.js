/**
 * Build Steps Registry
 * Central registry for all Dockerfile build step generators
 */

const { generateRun } = require("./run");
const { generateCopy } = require("./copy");
const { generateEnv } = require("./env");
const { generateWorkdir } = require("./workdir");
const { generateExpose } = require("./expose");
const { generateVolume } = require("./volume");
const { generateUser } = require("./user");
const { generateLabel } = require("./label");
const { generateArg } = require("./arg");
const { generateHealthcheck } = require("./healthcheck");
const { generateShell } = require("./shell");
const { generateOnbuild } = require("./onbuild");
const { generateStopsignal } = require("./stopsignal");
const { generateAdd } = require("./add");
const { generateCmd } = require("./cmd");
const { generateEntrypoint } = require("./entrypoint");

/**
 * Build step types enum
 */
const BuildStepType = {
  RUN: "run",
  COPY: "copy",
  ENV: "env",
  WORKDIR: "workdir",
  EXPOSE: "expose",
  VOLUME: "volume",
  USER: "user",
  LABEL: "label",
  ARG: "arg",
  HEALTHCHECK: "healthcheck",
  SHELL: "shell",
  ONBUILD: "onbuild",
  STOPSIGNAL: "stopsignal",
  ADD: "add",
  CMD: "cmd",
  ENTRYPOINT: "entrypoint",
};

/**
 * Map of step types to their generator functions
 */
const stepGenerators = {
  [BuildStepType.RUN]: generateRun,
  [BuildStepType.COPY]: generateCopy,
  [BuildStepType.ENV]: generateEnv,
  [BuildStepType.WORKDIR]: generateWorkdir,
  [BuildStepType.EXPOSE]: generateExpose,
  [BuildStepType.VOLUME]: generateVolume,
  [BuildStepType.USER]: generateUser,
  [BuildStepType.LABEL]: generateLabel,
  [BuildStepType.ARG]: generateArg,
  [BuildStepType.HEALTHCHECK]: generateHealthcheck,
  [BuildStepType.SHELL]: generateShell,
  [BuildStepType.ONBUILD]: generateOnbuild,
  [BuildStepType.STOPSIGNAL]: generateStopsignal,
  [BuildStepType.ADD]: generateAdd,
  [BuildStepType.CMD]: generateCmd,
  [BuildStepType.ENTRYPOINT]: generateEntrypoint,
};

/**
 * Generate Dockerfile instruction from step configuration
 * @param {Object} step - Step configuration
 * @returns {string} Dockerfile instruction
 */
function generateBuildStep(step) {
  const generator = stepGenerators[step.type];

  if (!generator) {
    throw new Error(`Unknown build step type: ${step.type}`);
  }

  return generator(step);
}

module.exports = {
  BuildStepType,
  stepGenerators,
  generateBuildStep,
};
