# Two Sum Problem

Given an array of integers `nums` and an integer `target`, return the **indices** of the two numbers such that they add up to `target`.

## Problem Statement

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

- 2 <= nums.length <= 10^4
- -10^9 <= nums[i] <= 10^9
- -10^9 <= target <= 10^9
- Only one valid answer exists

## Your Task

Implement a function/program that:

1. Reads input from stdin in the format: `<target> <num1> <num2> ... <numN>`
2. Finds the two indices that sum to the target
3. Outputs the indices to stdout in the format: `<index1> <index2>`

## Example Input/Output

**Input:**

```
9 2 7 11 15
```

**Output:**

```
0 1
```

## Performance Considerations

- **Brute Force**: O(n²) time, O(1) space - Checks all pairs
- **Optimal**: O(n) time, O(n) space - Use hash table to store complements

Your solution will be evaluated on both correctness and performance.

## Submission Format

Your submission should contain a file named `solution.py` (or `solution.js`, `solution.cpp`, etc.) that:

- Reads from stdin
- Processes the input
- Writes the result to stdout

**Python Example:**

```python
def two_sum(nums, target):
    # Your implementation here
    pass

if __name__ == "__main__":
    line = input().strip().split()
    target = int(line[0])
    nums = [int(x) for x in line[1:]]
    result = two_sum(nums, target)
    print(result[0], result[1])
```

## Evaluation

Your submission will be tested against multiple test cases:

- **Basic cases**: Small arrays, simple targets
- **Edge cases**: Negative numbers, zero, duplicate values
- **Performance cases**: Large arrays (up to 10,000 elements)

### Scoring Rubrics

1. **Correctness (40 points)**

   - All test cases pass: 40 points
   - Partial credit based on passing percentage

2. **Performance (10 points)**
   - O(n) solution: 10 points
   - O(n log n) solution: 7 points
   - O(n²) solution: 3 points
   - Timeout: 0 points
