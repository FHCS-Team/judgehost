/**
 * Rubric Evaluation System
 * Parses and processes rubric outputs from hook execution
 * Supports all rubric types from docs/data-models/rubric_types.md
 */

const fs = require("fs/promises");
const path = require("path");
const logger = require("../utils/logger");

/**
 * Rubric status values as per documentation
 */
const RubricStatus = {
  DONE: "DONE", // Evaluation completed successfully
  SKIPPED: "SKIPPED", // Not evaluated (manual rubrics)
  ERROR: "ERROR", // Evaluation failed due to system error
};

/**
 * Supported rubric types
 */
const RubricType = {
  TEST_CASES: "test_cases",
  API_ENDPOINTS: "api_endpoints",
  PERFORMANCE_BENCHMARK: "performance_benchmark",
  CODE_QUALITY: "code_quality",
  SECURITY_SCAN: "security_scan",
  UI_TEST: "ui_test",
  RESOURCE_USAGE: "resource_usage",
  INTEGRATION_TEST: "integration_test",
  ML_METRICS: "ml_metrics",
  MANUAL: "manual",
  CUSTOM: "custom",
};

/**
 * Collect and process rubric evaluations from all containers
 *
 * @param {string} resultsDir - Results directory path
 * @param {Array<Object>} containers - Container information
 * @param {Object} problem - Problem configuration
 * @returns {Promise<Object>} Processed rubric results
 */
async function collectRubricEvaluations(resultsDir, containers, problem) {
  logger.info(
    `Collecting rubric evaluations from ${containers.length} containers`
  );

  const rubricResults = [];
  const rubricsByContainer = new Map();
  const errors = [];

  try {
    // Get rubric-to-container mapping
    const rubricMapping = buildRubricMapping(problem);

    // Collect outputs from each container
    for (const containerInfo of containers) {
      const { containerId } = containerInfo;
      const containerOutDir = path.join(
        resultsDir,
        "containers",
        containerId,
        "out"
      );

      try {
        const containerRubrics = await collectContainerRubrics(
          containerOutDir,
          containerId
        );

        rubricsByContainer.set(containerId, containerRubrics);
        logger.info(
          `Collected ${containerRubrics.length} rubric outputs from container ${containerId}`
        );
      } catch (error) {
        logger.error(
          `Failed to collect rubrics from container ${containerId}:`,
          error
        );
        errors.push({
          container: containerId,
          error: error.message,
        });
      }
    }

    // Process each rubric from problem configuration
    for (const rubricConfig of problem.rubrics || []) {
      try {
        const processedRubric = await processRubric(
          rubricConfig,
          rubricsByContainer,
          rubricMapping
        );
        rubricResults.push(processedRubric);
      } catch (error) {
        logger.error(
          `Failed to process rubric ${rubricConfig.rubric_id}:`,
          error
        );

        // Add error rubric result
        rubricResults.push({
          rubric_id: rubricConfig.rubric_id,
          rubric_name: rubricConfig.rubric_name,
          rubric_type: rubricConfig.rubric_type,
          max_score: rubricConfig.max_score,
          score: 0,
          status: RubricStatus.ERROR,
          message: `Failed to process rubric: ${error.message}`,
          evaluated_by_container:
            rubricMapping.get(rubricConfig.rubric_id) || "unknown",
        });
      }
    }

    // Calculate total score
    const totalScore = rubricResults.reduce(
      (sum, r) => sum + (r.score || 0),
      0
    );
    const maxTotalScore = rubricResults.reduce(
      (sum, r) => sum + (r.max_score || 0),
      0
    );
    const percentage =
      maxTotalScore > 0 ? (totalScore / maxTotalScore) * 100 : 0;

    return {
      rubric_results: rubricResults,
      total_score: totalScore,
      max_score: maxTotalScore,
      percentage: Math.round(percentage * 100) / 100,
      rubrics_by_container: Object.fromEntries(rubricsByContainer),
      evaluation_errors: errors,
    };
  } catch (error) {
    logger.error("Failed to collect rubric evaluations:", error);
    throw error;
  }
}

/**
 * Build rubric-to-container mapping from problem configuration
 *
 * @param {Object} problem - Problem configuration
 * @returns {Map<string, string>} Map of rubric_id to container_id
 */
function buildRubricMapping(problem) {
  const mapping = new Map();

  // Get default submission container (first one with accepts_submission: true)
  const defaultContainer = problem.containers.find((c) => c.accepts_submission);
  const defaultContainerId =
    defaultContainer?.container_id || problem.containers[0]?.container_id;

  for (const rubric of problem.rubrics || []) {
    const containerId = rubric.evaluated_by_container || defaultContainerId;
    mapping.set(rubric.rubric_id, containerId);
  }

  return mapping;
}

/**
 * Collect rubric outputs from a single container
 *
 * @param {string} containerOutDir - Container output directory
 * @param {string} containerId - Container identifier
 * @returns {Promise<Array<Object>>} Array of rubric outputs
 */
async function collectContainerRubrics(containerOutDir, containerId) {
  const rubrics = [];

  try {
    // Check if directory exists
    await fs.access(containerOutDir);

    // Read all rubric_*.json files
    const files = await fs.readdir(containerOutDir);
    const rubricFiles = files.filter(
      (file) => file.startsWith("rubric_") && file.endsWith(".json")
    );

    logger.debug(
      `Found ${rubricFiles.length} rubric files in ${containerOutDir}`
    );

    for (const file of rubricFiles) {
      try {
        const filePath = path.join(containerOutDir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const rubricData = JSON.parse(content);

        // Validate rubric output format
        validateRubricOutput(rubricData, file);

        rubrics.push({
          ...rubricData,
          source_file: file,
          container_id: containerId,
        });

        logger.debug(`Parsed rubric output: ${rubricData.rubric_id}`);
      } catch (error) {
        logger.error(`Failed to parse rubric file ${file}:`, error);
        // Continue processing other files
      }
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      logger.debug(`Output directory not found: ${containerOutDir}`);
      return [];
    }
    throw error;
  }

  return rubrics;
}

/**
 * Process a rubric configuration and match it with collected outputs
 *
 * @param {Object} rubricConfig - Rubric configuration from problem
 * @param {Map} rubricsByContainer - Collected rubrics by container
 * @param {Map} rubricMapping - Rubric-to-container mapping
 * @returns {Promise<Object>} Processed rubric result
 */
async function processRubric(rubricConfig, rubricsByContainer, rubricMapping) {
  const rubricId = rubricConfig.rubric_id;
  const expectedContainer = rubricMapping.get(rubricId);

  // Handle manual rubrics (auto-skip)
  if (rubricConfig.rubric_type === RubricType.MANUAL) {
    return {
      rubric_id: rubricId,
      rubric_name: rubricConfig.rubric_name,
      rubric_type: rubricConfig.rubric_type,
      max_score: rubricConfig.max_score,
      score: 0,
      status: RubricStatus.SKIPPED,
      message: "Manual rubric - requires instructor evaluation",
      evaluated_by_container: expectedContainer,
      weight: rubricConfig.weight || 1.0,
    };
  }

  // Find rubric output from expected container
  const containerRubrics = rubricsByContainer.get(expectedContainer) || [];
  const rubricOutput = containerRubrics.find((r) => r.rubric_id === rubricId);

  if (!rubricOutput) {
    logger.warn(
      `Rubric output not found for ${rubricId} in container ${expectedContainer}`
    );

    return {
      rubric_id: rubricId,
      rubric_name: rubricConfig.rubric_name,
      rubric_type: rubricConfig.rubric_type,
      max_score: rubricConfig.max_score,
      score: 0,
      status: RubricStatus.ERROR,
      message: `Rubric output file not found in container ${expectedContainer}`,
      evaluated_by_container: expectedContainer,
      weight: rubricConfig.weight || 1.0,
    };
  }

  // Process rubric based on type
  const processed = await processRubricByType(rubricOutput, rubricConfig);

  return {
    ...processed,
    evaluated_by_container: expectedContainer,
    weight: rubricConfig.weight || 1.0,
  };
}

/**
 * Process rubric output based on its type
 *
 * @param {Object} rubricOutput - Raw rubric output from container
 * @param {Object} rubricConfig - Rubric configuration
 * @returns {Promise<Object>} Processed rubric result
 */
async function processRubricByType(rubricOutput, rubricConfig) {
  const rubricType = rubricConfig.rubric_type;

  // Base result from output
  const result = {
    rubric_id: rubricOutput.rubric_id,
    rubric_name: rubricConfig.rubric_name,
    rubric_type: rubricType,
    max_score: rubricConfig.max_score,
    score: rubricOutput.score || 0,
    status: rubricOutput.status || RubricStatus.DONE,
    message: rubricOutput.message,
    timestamp: rubricOutput.timestamp,
  };

  // Add type-specific details
  switch (rubricType) {
    case RubricType.TEST_CASES:
      result.details = processTestCasesDetails(rubricOutput.details);
      break;

    case RubricType.API_ENDPOINTS:
      result.details = processApiEndpointsDetails(rubricOutput.details);
      break;

    case RubricType.PERFORMANCE_BENCHMARK:
      result.details = processPerformanceDetails(rubricOutput.details);
      break;

    case RubricType.CODE_QUALITY:
      result.details = processCodeQualityDetails(rubricOutput.details);
      break;

    case RubricType.SECURITY_SCAN:
      result.details = processSecurityScanDetails(rubricOutput.details);
      break;

    case RubricType.RESOURCE_USAGE:
      result.details = processResourceUsageDetails(rubricOutput.details);
      break;

    default:
      // For custom and other types, pass through details as-is
      result.details = rubricOutput.details;
  }

  return result;
}

/**
 * Process test cases rubric details
 */
function processTestCasesDetails(details) {
  if (!details) return null;

  return {
    total: details.total || 0,
    passed: details.passed || 0,
    failed: details.failed || 0,
    skipped: details.skipped || 0,
    test_results: details.test_results || [],
  };
}

/**
 * Process API endpoints rubric details
 */
function processApiEndpointsDetails(details) {
  if (!details) return null;

  return {
    total: details.total || 0,
    passed: details.passed || 0,
    failed: details.failed || 0,
    endpoints: details.endpoints || [],
  };
}

/**
 * Process performance benchmark details
 */
function processPerformanceDetails(details) {
  if (!details) return null;

  return {
    benchmarks: details.benchmarks || [],
    average_time_ms: details.average_time_ms,
    max_time_ms: details.max_time_ms,
    min_time_ms: details.min_time_ms,
  };
}

/**
 * Process code quality details
 */
function processCodeQualityDetails(details) {
  if (!details) return null;

  return {
    issues: details.issues || [],
    total_issues: details.total_issues || 0,
    by_severity: details.by_severity || {},
  };
}

/**
 * Process security scan details
 */
function processSecurityScanDetails(details) {
  if (!details) return null;

  return {
    vulnerabilities: details.vulnerabilities || [],
    total_vulnerabilities: details.total_vulnerabilities || 0,
    by_severity: details.by_severity || {},
  };
}

/**
 * Process resource usage details
 */
function processResourceUsageDetails(details) {
  if (!details) return null;

  return {
    cpu_usage_percent: details.cpu_usage_percent,
    memory_usage_mb: details.memory_usage_mb,
    execution_time_ms: details.execution_time_ms,
  };
}

/**
 * Validate rubric output format
 *
 * @param {Object} rubricData - Rubric output data
 * @param {string} filename - Source filename for error messages
 * @throws {Error} If validation fails
 */
function validateRubricOutput(rubricData, filename) {
  const required = ["rubric_id", "rubric_type", "max_score", "score", "status"];

  for (const field of required) {
    if (!(field in rubricData)) {
      throw new Error(
        `Missing required field '${field}' in rubric output ${filename}`
      );
    }
  }

  // Validate status value
  const validStatuses = Object.values(RubricStatus);
  if (!validStatuses.includes(rubricData.status)) {
    throw new Error(
      `Invalid status '${
        rubricData.status
      }' in ${filename}. Must be one of: ${validStatuses.join(", ")}`
    );
  }

  // Validate score range
  if (rubricData.score < 0 || rubricData.score > rubricData.max_score) {
    throw new Error(
      `Score ${rubricData.score} out of range [0, ${rubricData.max_score}] in ${filename}`
    );
  }
}

/**
 * Generate feedback summary for rubric results
 *
 * @param {Array<Object>} rubricResults - Processed rubric results
 * @returns {string} Feedback summary
 */
function generateFeedbackSummary(rubricResults) {
  const lines = [];

  for (const rubric of rubricResults) {
    const percentage =
      rubric.max_score > 0
        ? Math.round((rubric.score / rubric.max_score) * 100)
        : 0;

    let status_icon = "✓";
    if (rubric.status === RubricStatus.ERROR) status_icon = "✗";
    if (rubric.status === RubricStatus.SKIPPED) status_icon = "○";

    lines.push(
      `${status_icon} ${rubric.rubric_name}: ${rubric.score}/${rubric.max_score} (${percentage}%)`
    );

    if (rubric.message) {
      lines.push(`  ${rubric.message}`);
    }
  }

  return lines.join("\n");
}

module.exports = {
  RubricStatus,
  RubricType,
  collectRubricEvaluations,
  buildRubricMapping,
  collectContainerRubrics,
  processRubric,
  validateRubricOutput,
  generateFeedbackSummary,
};
