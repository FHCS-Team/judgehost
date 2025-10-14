/**
 * Two Sum - Partially Correct Solution (Brute Force)
 * This solution works but has poor code quality
 * and will fail on some edge cases
 */
function twoSum(nums, target) {
  // Brute force approach - O(n²)
  for (var i = 0; i < nums.length; i++) {
    for (var j = i + 1; j < nums.length; j++) {
      if (nums[i] + nums[j] === target) {
        return [i, j];
      }
    }
  }

  // Bug: doesn't handle case where no solution exists properly
  return null;
}

// Unused variable (will be caught by code quality check)
var unusedVar = "this is not used";

module.exports = { twoSum };
