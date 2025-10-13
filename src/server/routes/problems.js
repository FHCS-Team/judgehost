/**
 * API Routes for Problem Management
 * Handles problem package registration, retrieval, and deletion
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const logger = require("../../utils/logger");
const config = require("../../config");
const {
  processProblemPackage,
  getProblemInfo,
  listProblems,
  deleteProblem,
} = require("../../core/processor");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(config.paths.workDir, "uploads"),
  limits: {
    fileSize: config.api.maxUploadSizeMB * 1024 * 1024, // Convert MB to bytes
  },
});

/**
 * POST /api/problems
 * Register a new problem package
 */
router.post("/", upload.single("problem_package"), async (req, res) => {
  try {
    const {
      problem_id,
      problem_name,
      package_type,
      package_url,
      archive_checksum,
      git_url,
      git_branch,
      git_commit,
      project_type,
      force_rebuild,
      timeout,
    } = req.body;

    // Validate required fields
    if (!problem_id || !problem_name || !package_type) {
      return res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Missing required fields",
        details: {
          required: ["problem_id", "problem_name", "package_type"],
        },
      });
    }

    let packagePath;

    // Handle different package types
    switch (package_type) {
      case "file":
        if (!req.file) {
          return res.status(400).json({
            success: false,
            error: "validation_error",
            message: "problem_package file is required when package_type=file",
          });
        }
        packagePath = req.file.path;
        break;

      case "url":
        if (!package_url) {
          return res.status(400).json({
            success: false,
            error: "validation_error",
            message: "package_url is required when package_type=url",
          });
        }
        // Download from URL
        const downloader = require("../../utils/downloader");
        const tempPath = path.join(
          config.paths.workDir,
          `problem-${problem_id}-${Date.now()}.tar.gz`
        );

        if (archive_checksum) {
          await downloader.downloadToFile(
            package_url,
            tempPath,
            archive_checksum
          );
        } else {
          await downloader.downloadToFile(package_url, tempPath);
        }
        packagePath = tempPath;
        break;

      case "git":
        if (!git_url) {
          return res.status(400).json({
            success: false,
            error: "validation_error",
            message: "git_url is required when package_type=git",
          });
        }
        // Clone Git repository
        const simpleGit = require("simple-git");
        const git = simpleGit();
        const gitTempDir = path.join(
          config.paths.workDir,
          `problem-${problem_id}-${Date.now()}`
        );

        const cloneOptions = [];
        if (config.git.shallowClone) cloneOptions.push("--depth=1");
        if (git_branch) cloneOptions.push("--branch", git_branch);

        await git.clone(git_url, gitTempDir, cloneOptions);

        if (git_commit) {
          const repoGit = simpleGit(gitTempDir);
          await repoGit.checkout(git_commit);
        }

        packagePath = gitTempDir;
        break;

      default:
        return res.status(400).json({
          success: false,
          error: "invalid_package_type",
          message: `Invalid package_type: ${package_type}`,
          details: {
            valid_types: ["file", "url", "git"],
          },
        });
    }

    // Check if problem already exists
    const existingProblem = await getProblemInfo(problem_id);
    if (existingProblem && !force_rebuild) {
      return res.status(409).json({
        success: false,
        error: "problem_exists",
        message: `Problem ${problem_id} already exists`,
        details: {
          problem_id,
          use_force_rebuild: true,
        },
      });
    }

    // Process problem package
    logger.info(`Registering problem: ${problem_id}`);
    const result = await processProblemPackage(problem_id, packagePath, {
      projectType: project_type,
      forceRebuild: force_rebuild === "true",
      buildTimeout: timeout ? parseInt(timeout, 10) : undefined,
    });

    // Cleanup temporary files
    await fs.rm(packagePath, { recursive: true, force: true }).catch(() => {});

    res.status(201).json({
      success: true,
      message: `Problem ${problem_id} registered successfully`,
      data: {
        problem_id: result.problemId,
        problem_name,
        image_name: result.imageName,
        registered_at: result.registeredAt,
      },
    });
  } catch (error) {
    logger.error("Error registering problem:", error);

    res.status(500).json({
      success: false,
      error: "registration_failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/problems
 * List all registered problems
 */
router.get("/", async (req, res) => {
  try {
    const problems = await listProblems();

    res.json({
      success: true,
      data: {
        problems: problems.map((p) => ({
          problem_id: p.problemId,
          problem_name: p.problemName || p.problemId,
          project_type: p.projectType,
          rubrics: p.rubrics || [],
        })),
        total: problems.length,
      },
    });
  } catch (error) {
    logger.error("Error listing problems:", error);

    res.status(500).json({
      success: false,
      error: "list_failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/problems/:problem_id
 * Get problem information
 */
router.get("/:problem_id", async (req, res) => {
  try {
    const { problem_id } = req.params;

    const problem = await getProblemInfo(problem_id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "problem_not_found",
        message: `Problem ${problem_id} not found`,
      });
    }

    res.json({
      success: true,
      data: problem,
    });
  } catch (error) {
    logger.error("Error getting problem:", error);

    res.status(500).json({
      success: false,
      error: "get_failed",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/problems/:problem_id
 * Delete a problem
 */
router.delete("/:problem_id", async (req, res) => {
  try {
    const { problem_id } = req.params;

    const problem = await getProblemInfo(problem_id);

    if (!problem) {
      return res.status(404).json({
        success: false,
        error: "problem_not_found",
        message: `Problem ${problem_id} not found`,
      });
    }

    const deleted = await deleteProblem(problem_id);

    if (!deleted) {
      throw new Error("Failed to delete problem");
    }

    res.json({
      success: true,
      message: `Problem ${problem_id} deleted successfully`,
    });
  } catch (error) {
    logger.error("Error deleting problem:", error);

    res.status(500).json({
      success: false,
      error: "delete_failed",
      message: error.message,
    });
  }
});

module.exports = router;
