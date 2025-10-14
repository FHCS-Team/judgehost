#!/bin/bash
# Pre-hook: Prepare the submission environment

set -e

echo "[PRE] Preparing Node.js API submission environment..."
echo "[PRE] Problem ID: ${PROBLEM_ID}"
echo "[PRE] Submission ID: ${SUBMISSION_ID}"

# Check if submission directory exists and has files
if [ ! -d "$SUBMISSION_DIR" ]; then
    echo "[PRE ERROR] Submission directory not found: $SUBMISSION_DIR"
    exit 1
fi

echo "[PRE] Submission directory contents:"
ls -la "$SUBMISSION_DIR"

# Check dependencies are installed
if [ -f "$SUBMISSION_DIR/package.json" ]; then
    echo "[PRE] Verifying Node.js dependencies..."
    if [ -d "$SUBMISSION_DIR/node_modules" ]; then
        echo "[PRE] Dependencies are installed"
        echo "[PRE] Installed packages:"
        ls "$SUBMISSION_DIR/node_modules/" | head -10
    else
        echo "[PRE WARNING] node_modules not found - dependencies may not be installed"
    fi
else
    echo "[PRE] No package.json found in submission"
fi

echo "[PRE] Environment preparation complete"
exit 0
