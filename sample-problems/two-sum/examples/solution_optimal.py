#!/usr/bin/env python3
"""
Two Sum - Optimal O(n) Solution
Uses hash table to find complement in single pass
"""

def two_sum(nums, target):
    """
    Find two numbers that add up to target.
    
    Args:
        nums: List of integers
        target: Target sum
        
    Returns:
        List of two indices [i, j] where nums[i] + nums[j] == target
    """
    seen = {}  # Map value to index
    
    for i, num in enumerate(nums):
        complement = target - num
        if complement in seen:
            return [seen[complement], i]
        seen[num] = i
    
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
