# Reverse String Problem

## Description

Write a JavaScript function that takes a string as input and returns the reversed version of that string.

## Requirements

- Function name: `reverseString`
- Input: A string (may be empty, contain spaces, numbers, or special characters)
- Output: The reversed string

## Example

```javascript
reverseString("hello"); // returns "olleh"
reverseString("world"); // returns "dlrow"
reverseString(""); // returns ""
```

## Test Cases

Your solution will be tested against 10 test cases:

- Basic strings
- Empty strings
- Strings with spaces
- Strings with numbers
- Special characters
- Unicode characters

## Scoring

- **Test Cases (80 points)**: Each test case passed awards points
- **Code Quality (20 points)**: Based on code style and best practices
  - Use of strict mode
  - Proper comments
  - Modern JavaScript syntax (const/let instead of var)

## Submission Format

Submit a single `index.js` file that exports the `reverseString` function:

```javascript
function reverseString(str) {
  // Your implementation here
}

module.exports = { reverseString };
```

Good luck!
