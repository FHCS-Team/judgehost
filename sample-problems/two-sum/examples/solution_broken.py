#!/usr/bin/env python3
"""
Two Sum - Broken Solution (for testing failure cases)
This solution has a bug and will fail some test cases
"""

def two_sum(nums, target):
    """
    Intentionally broken solution for testing.
    Always returns first two indices regardless of sum.
    """
    # BUG: Doesn't actually check if sum equals target
    if len(nums) >= 2:
        return [0, 1]
    return []

if __name__ == "__main__":
    # Read input: first number is target, rest are array elements
    line = input().strip().split()
    target = int(line[0])
    nums = [int(x) for x in line[1:]]
    
    # Find "solution" (broken)
    result = two_sum(nums, target)
    
    # Output indices
    if result:
        print(result[0], result[1])
    else:
        print("-1 -1")
