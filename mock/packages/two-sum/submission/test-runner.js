#!/usr/bin/env node

/**
 * Test Runner for Two Sum Problem
 * This runs the test cases against the submitted solution
 */

const fs = require("fs");
const path = require("path");

// Load test cases
const testCasesPath = "/data/test_cases.json";
const testCases = JSON.parse(fs.readFileSync(testCasesPath, "utf8"));

// Find the submission file
const submissionPath = "/workspace";
let solutionFunction = null;
let submissionFile = null;

// Try to find .js or .py file
const files = fs.readdirSync(submissionPath);
const jsFile = files.find((f) => f.endsWith(".js"));
const pyFile = files.find((f) => f.endsWith(".py"));

if (jsFile) {
  submissionFile = path.join(submissionPath, jsFile);
  console.log(`Found JavaScript submission: ${jsFile}`);

  try {
    const solutionModule = require(submissionFile);
    solutionFunction =
      solutionModule.twoSum || solutionModule.default || solutionModule;
  } catch (error) {
    console.error("Error loading submission:", error.message);
    process.exit(1);
  }
} else if (pyFile) {
  submissionFile = path.join(submissionPath, pyFile);
  console.log(`Found Python submission: ${pyFile}`);
  console.log("Python submissions not yet supported in this runner");
  process.exit(1);
} else {
  console.error("No submission file found (.js or .py)");
  process.exit(1);
}

// Run test cases
const results = {
  passed: 0,
  failed: 0,
  errors: 0,
  total: testCases.length,
  test_results: [],
};

console.log(`\nRunning ${testCases.length} test cases...\n`);

for (const testCase of testCases) {
  const testId = testCase.id;
  const input = testCase.input;
  const expected = testCase.expected;

  try {
    console.log(`Test ${testId}: ${testCase.description}`);

    const startTime = Date.now();
    const result = solutionFunction(input.nums, input.target);
    const duration = Date.now() - startTime;

    // Check result
    const passed =
      JSON.stringify(result?.sort()) === JSON.stringify(expected?.sort());

    if (passed) {
      console.log(`  ✓ PASSED (${duration}ms)`);
      results.passed++;
      results.test_results.push({
        test_id: testId,
        status: "passed",
        message: `Correct output: [${result}]`,
        duration_ms: duration,
      });
    } else {
      console.log(`  ✗ FAILED`);
      console.log(`    Expected: [${expected}]`);
      console.log(`    Got: [${result}]`);
      results.failed++;
      results.test_results.push({
        test_id: testId,
        status: "failed",
        message: `Expected [${expected}], got [${result}]`,
        duration_ms: duration,
      });
    }
  } catch (error) {
    console.log(`  ✗ ERROR: ${error.message}`);
    results.errors++;
    results.test_results.push({
      test_id: testId,
      status: "error",
      message: error.message,
      duration_ms: 0,
    });
  }
}

// Calculate score
const score = Math.round((results.passed / results.total) * 80); // 80 points max

console.log(`\n========================================`);
console.log(`Test Results:`);
console.log(`  Passed: ${results.passed}/${results.total}`);
console.log(`  Failed: ${results.failed}`);
console.log(`  Errors: ${results.errors}`);
console.log(`  Score: ${score}/80`);
console.log(`========================================\n`);

// Write results to output directory for rubric collection
const outputDir = "/out";
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const rubricOutput = {
  rubric_id: "test_cases",
  status: "DONE",
  score: score,
  max_score: 80,
  feedback: `Passed ${results.passed}/${results.total} test cases`,
  details: results,
};

fs.writeFileSync(
  path.join(outputDir, "rubric_test_cases.json"),
  JSON.stringify(rubricOutput, null, 2)
);

console.log("Test results written to /out/rubric_test_cases.json");

// Exit with appropriate code
process.exit(results.errors > 0 ? 1 : 0);
