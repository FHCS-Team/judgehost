#!/usr/bin/env python3
"""
Two Sum - Brute Force O(n²) Solution
Checks all pairs of numbers
"""

def two_sum(nums, target):
    """
    Find two numbers that add up to target using brute force.
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices [i, j] where nums[i] + nums[j] == target
    """
    n = len(nums)
    
    # Check all pairs
    for i in range(n):
        for j in range(i + 1, n):
            if nums[i] + nums[j] == target:
                return [i, j]
    
    return []  # No solution found

if __name__ == "__main__":
    # Read input: first number is target, rest are array elements
    line = input().strip().split()
    target = int(line[0])
    nums = [int(x) for x in line[1:]]
    
    # Find solution
    result = two_sum(nums, target)
    
    # Output indices
    if result:
        print(result[0], result[1])
    else:
        print("-1 -1")  # No solution
