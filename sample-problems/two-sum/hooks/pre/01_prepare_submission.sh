#!/bin/bash
# priority: 10
# Pre-hook: Prepare submission environment

set -e

echo "[PRE] Preparing submission environment..."

# Check if submission directory exists
if [ ! -d "$SUBMISSION_DIR" ]; then
    echo "[PRE ERROR] Submission directory not found: $SUBMISSION_DIR"
    exit 1
fi

cd "$SUBMISSION_DIR"

# Detect submission language and install dependencies
if [ -f "requirements.txt" ]; then
    echo "[PRE] Installing Python dependencies..."
    pip install --no-cache-dir -r requirements.txt
elif [ -f "package.json" ]; then
    echo "[PRE] Installing Node.js dependencies..."
    npm install --production --silent
elif [ -f "Gemfile" ]; then
    echo "[PRE] Installing Ruby dependencies..."
    bundle install --quiet
elif [ -f "go.mod" ]; then
    echo "[PRE] Installing Go dependencies..."
    go mod download
fi

# Make submission executable if needed
if [ -f "solution.sh" ]; then
    chmod +x solution.sh
fi

# Compile if needed
if [ -f "solution.cpp" ]; then
    echo "[PRE] Compiling C++ solution..."
    g++ -std=c++17 -O2 -o solution solution.cpp
fi

if [ -f "solution.c" ]; then
    echo "[PRE] Compiling C solution..."
    gcc -std=c11 -O2 -o solution solution.c
fi

if [ -f "solution.java" ]; then
    echo "[PRE] Compiling Java solution..."
    javac solution.java
fi

echo "[PRE] Environment preparation complete"
