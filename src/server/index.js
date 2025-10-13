const express = require("express");
const { compose } = require("../utils/functional");
const { enqueue, getQueueStatus, queueEvents } = require("../core/queue");
const config = require("../config");
const logger = require("../utils/logger");

// Create express app
const app = express();
app.use(express.json());

// Functional middleware pattern
const withLogging = (handler) => (req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  return handler(req, res, next);
};

const withErrorHandling = (handler) => async (req, res, next) => {
  try {
    await handler(req, res, next);
  } catch (error) {
    logger.error("Error:", error);
    res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

// Submission endpoints
const submissionHandlers = {
  // Get submission status
  getStatus: async (req, res) => {
    const { id } = req.params;
    // Implementation
    res.json({ id, status: "pending" });
  },

  // Submit new job
  createSubmission: async (req, res) => {
    const submission = req.body;
    const job = enqueue(submission);
    res.status(201).json({ id: job.id, status: job.status });
  },

  // Get queue status
  getQueueStatus: async (req, res) => {
    res.json(getQueueStatus());
  },
};

// Apply middleware composition
const withMiddleware = compose(withErrorHandling, withLogging);

// Setup routes
app.get("/api/submissions/:id", withMiddleware(submissionHandlers.getStatus));
app.post(
  "/api/submissions",
  withMiddleware(submissionHandlers.createSubmission)
);
app.get("/api/queue", withMiddleware(submissionHandlers.getQueueStatus));

// Health check
app.get("/api/health", (req, res) => res.json({ status: "ok" }));

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Judgehost server running on port ${PORT}`);
});

module.exports = app;
