#!/usr/bin/env bash
set -euo pipefail

export NODE_ENV=development
npm run build
node dist/server/index.js
