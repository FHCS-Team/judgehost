#!/usr/bin/env node

/**
 * API Test Runner for REST API Users Problem
 * Tests CRUD operations on the /api/users endpoint
 */

const axios = require("axios");
const fs = require("fs");
const path = require("path");

const API_BASE_URL = process.env.API_BASE_URL || "http://submission:3000";
const TEST_TIMEOUT = parseInt(process.env.TEST_TIMEOUT || "5000");
const OUTPUT_DIR = "/out";

// Test cases definition
const testCases = [
  {
    id: "test_1",
    name: "Health Check",
    weight: 5,
    test: async () => {
      const response = await axios.get(`${API_BASE_URL}/health`, {
        timeout: TEST_TIMEOUT,
      });
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      return "Health check passed";
    },
  },
  {
    id: "test_2",
    name: "GET /api/users - List all users",
    weight: 10,
    test: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users`, {
        timeout: TEST_TIMEOUT,
      });
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      if (!Array.isArray(response.data)) {
        throw new Error("Expected array response");
      }
      if (response.data.length < 3) {
        throw new Error(
          `Expected at least 3 users, got ${response.data.length}`
        );
      }
      return `Found ${response.data.length} users`;
    },
  },
  {
    id: "test_3",
    name: "GET /api/users/:id - Get specific user",
    weight: 10,
    test: async () => {
      const response = await axios.get(`${API_BASE_URL}/api/users/1`, {
        timeout: TEST_TIMEOUT,
      });
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      const user = response.data;
      if (!user.id || !user.name || !user.email) {
        throw new Error("User missing required fields");
      }
      return `User retrieved: ${user.name}`;
    },
  },
  {
    id: "test_4",
    name: "POST /api/users - Create new user",
    weight: 15,
    test: async () => {
      const newUser = {
        name: "Test User",
        email: `test${Date.now()}@example.com`,
        age: 30,
      };
      const response = await axios.post(`${API_BASE_URL}/api/users`, newUser, {
        timeout: TEST_TIMEOUT,
      });
      if (response.status !== 201 && response.status !== 200) {
        throw new Error(`Expected status 201 or 200, got ${response.status}`);
      }
      const user = response.data;
      if (!user.id) {
        throw new Error("Created user missing ID");
      }
      return `User created with ID: ${user.id}`;
    },
  },
  {
    id: "test_5",
    name: "PUT /api/users/:id - Update user",
    weight: 10,
    test: async () => {
      const updateData = {
        name: "Updated Name",
        email: "updated@example.com",
        age: 35,
      };
      const response = await axios.put(
        `${API_BASE_URL}/api/users/1`,
        updateData,
        { timeout: TEST_TIMEOUT }
      );
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      return "User updated successfully";
    },
  },
  {
    id: "test_6",
    name: "DELETE /api/users/:id - Delete user",
    weight: 10,
    test: async () => {
      // First create a user to delete
      const newUser = {
        name: "To Delete",
        email: `delete${Date.now()}@example.com`,
        age: 25,
      };
      const createResponse = await axios.post(
        `${API_BASE_URL}/api/users`,
        newUser,
        { timeout: TEST_TIMEOUT }
      );
      const userId = createResponse.data.id;

      // Now delete it
      const deleteResponse = await axios.delete(
        `${API_BASE_URL}/api/users/${userId}`,
        { timeout: TEST_TIMEOUT }
      );
      if (deleteResponse.status !== 200 && deleteResponse.status !== 204) {
        throw new Error(
          `Expected status 200 or 204, got ${deleteResponse.status}`
        );
      }

      // Verify it's deleted
      try {
        await axios.get(`${API_BASE_URL}/api/users/${userId}`, {
          timeout: TEST_TIMEOUT,
        });
        throw new Error("User still exists after deletion");
      } catch (error) {
        if (error.response && error.response.status === 404) {
          return "User deleted and verified";
        }
        throw error;
      }
    },
  },
];

// Run tests
async function runTests() {
  console.log(`\n========================================`);
  console.log(`API Testing: ${API_BASE_URL}`);
  console.log(`========================================\n`);

  const results = {
    passed: 0,
    failed: 0,
    errors: 0,
    total: testCases.length,
    total_score: 0,
    max_score: 60,
    test_results: [],
  };

  // Wait for API to be ready
  console.log("Waiting for API to be ready...");
  let retries = 10;
  while (retries > 0) {
    try {
      await axios.get(`${API_BASE_URL}/health`, { timeout: 2000 });
      console.log("✓ API is ready\n");
      break;
    } catch (error) {
      retries--;
      if (retries === 0) {
        console.error("✗ API failed to start");
        results.errors = testCases.length;
        results.test_results = testCases.map((tc) => ({
          test_id: tc.id,
          test_name: tc.name,
          status: "error",
          message: "API failed to start",
          score: 0,
          max_score: tc.weight,
        }));
        return results;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Run each test
  for (const testCase of testCases) {
    console.log(`Running: ${testCase.name}`);
    const startTime = Date.now();

    try {
      const message = await testCase.test();
      const duration = Date.now() - startTime;

      console.log(`  ✓ PASSED (${duration}ms): ${message}`);
      results.passed++;
      results.total_score += testCase.weight;
      results.test_results.push({
        test_id: testCase.id,
        test_name: testCase.name,
        status: "passed",
        message: message,
        duration_ms: duration,
        score: testCase.weight,
        max_score: testCase.weight,
      });
    } catch (error) {
      const duration = Date.now() - startTime;

      if (error.response) {
        console.log(
          `  ✗ FAILED: HTTP ${error.response.status} - ${error.message}`
        );
        results.failed++;
        results.test_results.push({
          test_id: testCase.id,
          test_name: testCase.name,
          status: "failed",
          message: `HTTP ${error.response.status}: ${error.message}`,
          duration_ms: duration,
          score: 0,
          max_score: testCase.weight,
        });
      } else if (error.code === "ECONNREFUSED" || error.code === "ETIMEDOUT") {
        console.log(`  ✗ ERROR: Connection failed - ${error.message}`);
        results.errors++;
        results.test_results.push({
          test_id: testCase.id,
          test_name: testCase.name,
          status: "error",
          message: `Connection error: ${error.message}`,
          duration_ms: duration,
          score: 0,
          max_score: testCase.weight,
        });
      } else {
        console.log(`  ✗ ERROR: ${error.message}`);
        results.errors++;
        results.test_results.push({
          test_id: testCase.id,
          test_name: testCase.name,
          status: "error",
          message: error.message,
          duration_ms: duration,
          score: 0,
          max_score: testCase.weight,
        });
      }
    }
  }

  return results;
}

// Main execution
(async () => {
  try {
    const results = await runTests();

    console.log(`\n========================================`);
    console.log(`Test Results:`);
    console.log(`  Passed: ${results.passed}/${results.total}`);
    console.log(`  Failed: ${results.failed}`);
    console.log(`  Errors: ${results.errors}`);
    console.log(`  Score: ${results.total_score}/${results.max_score}`);
    console.log(`========================================\n`);

    // Write results to output directory
    if (!fs.existsSync(OUTPUT_DIR)) {
      fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }

    const rubricOutput = {
      rubric_id: "api_endpoints",
      status: "DONE",
      score: results.total_score,
      max_score: results.max_score,
      feedback: `Passed ${results.passed}/${results.total} API tests`,
      details: results,
    };

    fs.writeFileSync(
      path.join(OUTPUT_DIR, "rubric_api_endpoints.json"),
      JSON.stringify(rubricOutput, null, 2)
    );

    console.log("API test results written to /out/rubric_api_endpoints.json");

    // Exit with appropriate code
    process.exit(results.errors > 0 ? 1 : 0);
  } catch (error) {
    console.error("Fatal error:", error);
    process.exit(1);
  }
})();
