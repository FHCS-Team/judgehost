"use strict";

/**
 * Reverse String Function
 * Takes a string and returns it reversed
 * @param {string} str - The input string to reverse
 * @returns {string} The reversed string
 */
function reverseString(str) {
  // Handle empty string
  if (!str) {
    return str;
  }

  // Use array reverse method for efficiency
  return str.split("").reverse().join("");
}

// Export the function
module.exports = { reverseString };
