// Test runner for reverse-string problem
const fs = require("fs");
const path = require("path");

// Load test cases
const testCasesPath = "/data/test_cases.json";
const testCases = JSON.parse(fs.readFileSync(testCasesPath, "utf8"));

// Load the submission
let reverseString;
try {
  const submission = require("/workspace/index.js");
  reverseString = submission.reverseString || submission.default || submission;
} catch (error) {
  console.error("Failed to load submission:", error.message);
  process.exit(1);
}

// Run tests
let passed = 0;
let failed = 0;
const failures = [];

console.log("Running test cases...\n");

testCases.tests.forEach((test, index) => {
  const testNum = index + 1;
  try {
    const result = reverseString(test.input);
    if (result === test.expected) {
      console.log(`✓ Test ${testNum}: PASSED`);
      passed++;
    } else {
      console.log(`✗ Test ${testNum}: FAILED`);
      console.log(`  Input: "${test.input}"`);
      console.log(`  Expected: "${test.expected}"`);
      console.log(`  Got: "${result}"`);
      failed++;
      failures.push({
        test: testNum,
        name: test.name,
        input: test.input,
        expected: test.expected,
        actual: result,
      });
    }
  } catch (error) {
    console.log(`✗ Test ${testNum}: ERROR - ${error.message}`);
    failed++;
    failures.push({
      test: testNum,
      name: test.name,
      input: test.input,
      error: error.message,
    });
  }
});

console.log(
  `\nResults: ${passed} passed, ${failed} failed, ${passed + failed} total`
);

// Calculate score
const totalTests = testCases.tests.length;
const score = Math.round((passed / totalTests) * 80);

// Write rubric output
const rubricOutput = {
  rubric_id: "rubric_1_test_cases",
  score: score,
  max_score: 80,
  status: "DONE",
  feedback: `Passed ${passed} out of ${totalTests} test cases`,
  details: {
    passed: passed,
    failed: failed,
    total: totalTests,
    failures: failures,
  },
};

fs.writeFileSync(
  "/out/rubric_rubric_1_test_cases.json",
  JSON.stringify(rubricOutput, null, 2)
);

// Exit with appropriate code
process.exit(failed > 0 ? 1 : 0);
