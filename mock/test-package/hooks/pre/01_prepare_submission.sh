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

# Install dependencies if package.json exists
if [ -f "$SUBMISSION_DIR/package.json" ]; then
    echo "[PRE] Installing Node.js dependencies..."
    cd "$SUBMISSION_DIR"
    npm install --production --silent 2>&1 | tee "$OUT_DIR/npm-install.log" || {
        echo "[PRE ERROR] npm install failed"
        exit 1
    }
    echo "[PRE] Dependencies installed successfully"
else
    echo "[PRE WARNING] No package.json found in submission"
fi

echo "[PRE] Environment preparation complete"
exit 0
