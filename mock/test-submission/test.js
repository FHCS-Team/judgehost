// Simple local test file
const { reverseString } = require("./index.js");

console.log("Testing reverseString function locally...\n");

const tests = [
  { input: "hello", expected: "olleh" },
  { input: "", expected: "" },
  { input: "a", expected: "a" },
  { input: "hello world", expected: "dlrow olleh" },
];

let passed = 0;
tests.forEach((test, i) => {
  const result = reverseString(test.input);
  const success = result === test.expected;
  console.log(`Test ${i + 1}: ${success ? "✓ PASSED" : "✗ FAILED"}`);
  if (success) passed++;
  else console.log(`  Expected: "${test.expected}", Got: "${result}"`);
});

console.log(`\n${passed}/${tests.length} tests passed`);
process.exit(passed === tests.length ? 0 : 1);
