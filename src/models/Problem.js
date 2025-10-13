/**
 * @file Problem model - Type definitions for problem packages
 */

/**
 * Problem configuration from config.json
 * @typedef {Object} ProblemConfig
 * @property {string} problem_id - Unique identifier for the problem
 * @property {string} problem_name - Human-readable name
 * @property {string} [description] - Problem description
 * @property {string} project_type - Type of project (e.g., 'web', 'cli', 'api')
 * @property {Object} [resource_limits] - Container resource limits
 * @property {string} [resource_limits.memory] - Memory limit (e.g., '4g')
 * @property {number} [resource_limits.cpus] - CPU count
 * @property {number} [resource_limits.timeout] - Execution timeout in seconds
 * @property {Array<RubricConfig>} rubrics - Evaluation rubrics
 * @property {Object} [metadata] - Additional problem metadata
 */

/**
 * Rubric configuration
 * @typedef {Object} RubricConfig
 * @property {string} rubric_id - Unique rubric identifier
 * @property {string} rubric_name - Human-readable rubric name
 * @property {string} rubric_type - Type: 'binary', 'numeric', 'percentage', 'custom'
 * @property {number} max_score - Maximum possible score
 * @property {number} [weight] - Weight in total score calculation (default: 1)
 * @property {string} [description] - Rubric description
 * @property {Object} [criteria] - Evaluation criteria details
 */

/**
 * Problem package structure
 * @typedef {Object} ProblemPackage
 * @property {string} problemId - Unique problem identifier
 * @property {string} problemName - Human-readable name
 * @property {string} imageName - Built Docker image name
 * @property {ProblemConfig} config - Problem configuration
 * @property {string} packagePath - Path to problem package directory
 * @property {Date} registeredAt - Registration timestamp
 * @property {Date} [lastUpdated] - Last update timestamp
 * @property {Object} [metadata] - Additional metadata
 */

/**
 * Problem registration request
 * @typedef {Object} ProblemRegistrationRequest
 * @property {string} package_source - Source type: 'file', 'url', 'git'
 * @property {string} [package_url] - URL for 'url' source type
 * @property {string} [git_url] - Git repository URL for 'git' source
 * @property {string} [git_branch] - Git branch name (default: main)
 * @property {string} [git_commit] - Specific commit SHA
 * @property {Object} [file] - Multer file object for 'file' source
 * @property {string} [checksum] - SHA256 checksum for verification
 */

/**
 * Problem info response
 * @typedef {Object} ProblemInfo
 * @property {string} problem_id - Unique identifier
 * @property {string} problem_name - Human-readable name
 * @property {string} image_name - Docker image name
 * @property {string} project_type - Project type
 * @property {Array<RubricConfig>} rubrics - Evaluation rubrics
 * @property {Object} resource_limits - Resource limits
 * @property {Date} registered_at - Registration timestamp
 * @property {Object} [metadata] - Additional metadata
 */

module.exports = {};
