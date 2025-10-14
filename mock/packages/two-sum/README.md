# Two Sum Problem

## Problem Description

Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers such that they add up to `target`.

You may assume that each input would have **exactly one solution**, and you may not use the same element twice.

You can return the answer in any order.

## Examples

### Example 1:

```
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].
```

### Example 2:

```
Input: nums = [3,2,4], target = 6
Output: [1,2]
```

### Example 3:

```
Input: nums = [3,3], target = 6
Output: [0,1]
```

## Constraints

- `2 <= nums.length <= 10^4`
- `-10^9 <= nums[i] <= 10^9`
- `-10^9 <= target <= 10^9`
- Only one valid answer exists.

## Submission Format

### JavaScript

Create a file named `solution.js` with the following structure:

```javascript
/**
 * @param {number[]} nums
 * @param {number} target
 * @return {number[]}
 */
function twoSum(nums, target) {
  // Your implementation here
}

module.exports = { twoSum };
```

### Python

Create a file named `solution.py` with the following structure:

```python
def twoSum(nums: list[int], target: int) -> list[int]:
    # Your implementation here
    pass
```

## Evaluation Criteria

### Test Cases (80 points)

- 10 test cases covering various scenarios
- Basic cases, edge cases, large numbers, negative numbers
- Each test case is worth 8 points

### Code Quality (20 points)

- Code style and formatting
- Proper variable naming
- No unused variables
- Follows language best practices

**Total: 100 points**

## Time Limit

- 60 seconds per submission

## Memory Limit

- 512 MB

## Tips

1. **Brute Force**: O(n²) time complexity

   - Try all possible pairs
   - Simple but inefficient for large arrays

2. **Hash Map**: O(n) time complexity
   - Use a hash map to store seen numbers
   - Look up complement in O(1) time
   - More efficient solution

## Sample Solution (JavaScript)

```javascript
function twoSum(nums, target) {
  const map = new Map();

  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];

    if (map.has(complement)) {
      return [map.get(complement), i];
    }

    map.set(nums[i], i);
  }

  return [];
}

module.exports = { twoSum };
```

## Testing Locally

You can test your solution locally before submitting:

```bash
# JavaScript
node -e "const {twoSum} = require('./solution.js'); console.log(twoSum([2,7,11,15], 9));"

# Python
python3 -c "from solution import twoSum; print(twoSum([2,7,11,15], 9))"
```

Expected output: `[0, 1]`
