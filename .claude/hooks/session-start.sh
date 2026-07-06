#!/bin/bash

# sessionstart hook for cloud / web agent sessions.
# prepares a local env file, materializes the opt-in quality hooks, and
# installs dependencies so linters and tests are runnable as soon as the
# session starts. cloud session containers ship Node matching .nvmrc, so no
# toolchain provisioning is needed here.
set -euo pipefail

# only run in the remote (web/cloud) environment. local sessions manage their
# own toolchain; set CLAUDE_CODE_REMOTE=true to exercise this hook locally.
if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

# warn when the container's Node differs from the pin — CI (merge-checks)
# installs the .nvmrc version, so a mismatch runs code CI never tests.
if [ -f .nvmrc ] && command -v node >/dev/null 2>&1; then
  pinned_major="$(tr -d 'v[:space:]' <.nvmrc | cut -d. -f1)"
  actual_major="$(node -v | tr -d 'v' | cut -d. -f1)"
  if [ -n "$pinned_major" ] && [ "$pinned_major" != "$actual_major" ]; then
    echo "WARNING: session Node v${actual_major} does not match .nvmrc (${pinned_major}) — CI runs Node ${pinned_major}." >&2
  fi
fi

# provide a local env file for development if one does not exist yet.
if [ -f .env.example ] && [ ! -f .env.local ]; then
  cp .env.example .env.local
fi

# enable the opt-in quality hooks (format on edit, lint + unit tests before
# completion) for cloud sessions by materializing the gitignored local settings
# from the committed example. the harness hot-reloads the new hooks for this
# session. local sessions skip this hook, so opting in stays manual.
if [ -f .claude/settings.local-example.json ]; then
  cp -f .claude/settings.local-example.json .claude/settings.local.json
fi

# install dependencies (a plain install, not a clean/frozen install, so a cached
# container layer can be reused across sessions).
npm install
