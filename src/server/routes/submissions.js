/**
 * API Routes for Submission Management
 * Handles submission creation, status tracking, and cancellation
 */

const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs/promises");
const logger = require("../../utils/logger");
const config = require("../../config");
const { enqueue, getJob, cancelJob, Priority } = require("../../core/queue");
const { getProcessor } = require("../../core/processor");

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  dest: path.join(config.paths.workDir, "uploads"),
  limits: {
    fileSize: config.api.maxUploadSizeMB * 1024 * 1024,
  },
});

/**
 * POST /api/submissions
 * Submit code for evaluation
 */
router.post("/", upload.single("submission_file"), async (req, res) => {
  try {
    const {
      problem_id,
      package_type,
      package_url,
      archive_checksum,
      git_url,
      git_branch,
      git_commit,
      team_id,
      submission_metadata,
      priority,
      notification_url,
      timeout_override,
    } = req.body;

    // Validate required fields
    if (!problem_id || !package_type) {
      return res.status(400).json({
        success: false,
        error: "validation_error",
        message: "Missing required fields",
        details: {
          required: ["problem_id", "package_type"],
        },
      });
    }

    // Validate package type specific requirements
    if (package_type === "file" && !req.file) {
      return res.status(400).json({
        success: false,
        error: "invalid_package_type",
        message: "Invalid package type configuration",
        details: {
          package_type: "file",
          error: "submission_file is required when package_type is 'file'",
          received_fields: Object.keys(req.body),
        },
      });
    }

    if (package_type === "url" && !package_url) {
      return res.status(400).json({
        success: false,
        error: "invalid_package_type",
        message: "Invalid package type configuration",
        details: {
          package_type: "url",
          error: "package_url is required when package_type is 'url'",
          received_fields: Object.keys(req.body),
        },
      });
    }

    if (package_type === "git" && !git_url) {
      return res.status(400).json({
        success: false,
        error: "invalid_package_type",
        message: "Invalid package type configuration",
        details: {
          package_type: "git",
          error: "git_url is required when package_type is 'git'",
          received_fields: Object.keys(req.body),
        },
      });
    }

    // Validate timeout_override if provided
    if (timeout_override) {
      const timeoutValue = parseInt(timeout_override, 10);
      if (isNaN(timeoutValue) || timeoutValue <= 0) {
        return res.status(400).json({
          success: false,
          error: "validation_error",
          message: "timeout_override must be a positive integer",
        });
      }

      // Check against problem's maximum timeout (will be validated later with problem config)
      const maxTimeout = config.docker.defaultTimeout / 1000; // Convert ms to seconds
      if (timeoutValue > maxTimeout) {
        return res.status(400).json({
          success: false,
          error: "validation_error",
          message: `timeout_override cannot exceed maximum timeout of ${maxTimeout} seconds`,
          details: {
            requested: timeoutValue,
            maximum: maxTimeout,
          },
        });
      }
    }

    // Check if problem exists before accepting submission
    const { getProblemInfo } = require("../../core/processor");
    const problemExists = await getProblemInfo(problem_id);

    if (!problemExists) {
      // Cleanup uploaded file if present
      if (req.file) {
        await fs.rm(req.file.path, { force: true }).catch(() => {});
      }

      return res.status(404).json({
        success: false,
        error: "problem_not_found",
        message: "Problem with the specified ID does not exist",
        details: {
          problem_id: problem_id,
          suggestion:
            "Check the problem ID or create the problem first using POST /problems",
        },
      });
    }

    // If file upload, save to submissions directory
    let submissionId = `sub_${Date.now()}${Math.random()
      .toString(36)
      .substring(2, 10)}`;

    if (package_type === "file") {
      const submissionDir = path.join(
        config.paths.submissionsDir,
        submissionId
      );
      await fs.mkdir(submissionDir, { recursive: true });

      // Move uploaded file to submission directory
      const targetPath = path.join(submissionDir, req.file.originalname);
      await fs.rename(req.file.path, targetPath);

      // Extract if archive
      if (
        req.file.originalname.endsWith(".zip") ||
        req.file.originalname.endsWith(".tar.gz")
      ) {
        const downloader = require("../../utils/downloader");
        const fileBuffer = await fs.readFile(targetPath);
        await downloader.extractBuffer(fileBuffer, submissionDir);
        await fs.rm(targetPath); // Remove archive after extraction
      }
    }

    // Parse priority
    const jobPriority = priority ? parseInt(priority, 10) : Priority.NORMAL;

    // Create submission object
    const submission = {
      submissionId,
      problemId: problem_id,
      packageType: package_type,
      packageUrl: package_url,
      archiveChecksum: archive_checksum,
      gitUrl: git_url,
      gitBranch: git_branch || "main",
      gitCommit: git_commit,
      teamId: team_id,
      metadata: submission_metadata ? JSON.parse(submission_metadata) : {},
      priority: jobPriority,
      notificationUrl: notification_url,
      timeoutOverride: timeout_override
        ? parseInt(timeout_override, 10)
        : undefined,
    };

    // Enqueue job
    const job = enqueue(submission);

    logger.info(`Submission ${submissionId} enqueued as job ${job.id}`);

    // Calculate estimated start time based on queue position
    const { getQueue } = require("../../core/queue");
    const queue = getQueue();
    const waitTimeSeconds = queue.estimateWaitTime(job.id) || 0;
    const estimatedStartTime = new Date(Date.now() + waitTimeSeconds * 1000);

    res.status(201).json({
      success: true,
      message: "Submission enqueued successfully",
      data: {
        job_id: job.id,
        submission_id: submissionId,
        problem_id: problem_id,
        status: job.state,
        priority: job.priority,
        enqueued_at: job.enqueuedAt,
        estimated_start_time: estimatedStartTime.toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error creating submission:", error);

    // Cleanup uploaded file on error
    if (req.file) {
      await fs.rm(req.file.path, { force: true }).catch(() => {});
    }

    res.status(500).json({
      success: false,
      error: "submission_failed",
      message: error.message,
    });
  }
});

/**
 * GET /api/submissions/:submission_id
 * Get submission status and details
 */
router.get("/:submission_id", async (req, res) => {
  try {
    const { submission_id } = req.params;

    // Find job by submission ID
    const { getQueue } = require("../../core/queue");
    const queue = getQueue();
    const jobs = queue.getJobs();
    const job = jobs.find((j) => j.submissionId === submission_id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "submission_not_found",
        message: `Submission ${submission_id} not found`,
      });
    }

    // Get evaluation status if running
    const processor = getProcessor();
    const evalStatus = processor.getEvaluationStatus(job.id);

    res.json({
      success: true,
      data: {
        submission_id: job.submissionId,
        job_id: job.id,
        problem_id: job.problemId,
        status: job.state,
        priority: job.priority,
        enqueued_at: job.enqueuedAt,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        evaluation_state: evalStatus?.state,
        result: job.result,
        error: job.error,
      },
    });
  } catch (error) {
    logger.error("Error getting submission:", error);

    res.status(500).json({
      success: false,
      error: "get_failed",
      message: error.message,
    });
  }
});

/**
 * DELETE /api/submissions/:submission_id
 * Cancel a submission
 */
router.delete("/:submission_id", async (req, res) => {
  try {
    const { submission_id } = req.params;

    // Find job by submission ID
    const { getQueue } = require("../../core/queue");
    const queue = getQueue();
    const jobs = queue.getJobs();
    const job = jobs.find((j) => j.submissionId === submission_id);

    if (!job) {
      return res.status(404).json({
        success: false,
        error: "submission_not_found",
        message: `Submission ${submission_id} not found`,
      });
    }

    // Cancel job
    const cancelledJob = cancelJob(job.id);

    res.json({
      success: true,
      message: `Submission ${submission_id} cancelled`,
      data: {
        submission_id: cancelledJob.submissionId,
        job_id: cancelledJob.id,
        status: cancelledJob.state,
      },
    });
  } catch (error) {
    logger.error("Error cancelling submission:", error);

    res.status(500).json({
      success: false,
      error: "cancel_failed",
      message: error.message,
    });
  }
});

module.exports = router;
