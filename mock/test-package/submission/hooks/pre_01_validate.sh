#!/bin/sh
# Pre-hook: Validate submission structure

echo "[PRE-HOOK] Validating submission structure..."

# Check if index.js exists
if [ ! -f "/workspace/index.js" ]; then
  echo "ERROR: index.js not found in submission"
  exit 1
fi

# Check if package.json exists
if [ ! -f "/workspace/package.json" ]; then
  echo "WARNING: package.json not found, but continuing..."
fi

echo "[PRE-HOOK] Validation passed!"
exit 0
