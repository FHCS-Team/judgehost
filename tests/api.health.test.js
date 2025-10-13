/**
 * Tests for API routes
 */

const request = require("supertest");
const express = require("express");
const healthRouter = require("../src/server/routes/health");

// Create test app
function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/health", healthRouter);
  return app;
}

describe("Health API", () => {
  let app;

  beforeEach(() => {
    app = createTestApp();
  });

  describe("GET /api/health", () => {
    it("should return 200 and health status", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.status).toBeDefined();
      expect(["healthy", "degraded", "unhealthy"]).toContain(
        response.body.status
      );
    });

    it("should return version information", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.version).toBeDefined();
    });

    it("should return uptime", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.uptime_seconds).toBeDefined();
      expect(typeof response.body.uptime_seconds).toBe("number");
      expect(response.body.uptime_seconds).toBeGreaterThanOrEqual(0);
    });

    it("should return queue information", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.queue).toBeDefined();
      expect(response.body.queue.size).toBeDefined();
      expect(response.body.queue.running).toBeDefined();
      expect(response.body.queue.available_workers).toBeDefined();
    });

    it("should return system resources", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.system).toBeDefined();
      expect(response.body.system.memory).toBeDefined();
    });

    it("should return config information", async () => {
      const response = await request(app).get("/api/health").expect(200);

      expect(response.body.config).toBeDefined();
      expect(response.body.config.max_workers).toBeDefined();
    });
  });
});
