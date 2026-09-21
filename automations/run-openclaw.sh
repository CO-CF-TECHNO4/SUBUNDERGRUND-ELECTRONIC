#!/usr/bin/env bash
# OpenClaw Task Runner Wrapper for SUBUNDERGRUND ELECTRONIC
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
node "$SCRIPT_DIR/openclaw-runner.mjs" "$@"
