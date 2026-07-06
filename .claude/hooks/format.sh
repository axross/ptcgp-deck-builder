#!/bin/bash

# posttooluse hook: formats an edited file after a code change so written
# files stay consistent. fires on edit/write tools.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

# read the edited file path from the tool payload on stdin.
FILE_PATH="$(jq -r '.tool_input.file_path // empty' 2>/dev/null || true)"

# only format when a source file the formatter understands changed; skip the
# rest. keep the extension list in sync with CODE_GLOB in check.sh.
case "$FILE_PATH" in
  *.ts | *.tsx | *.css | *.mjs | *.json) ;;
  *) exit 0 ;;
esac

cd "$PROJECT_DIR"

# make a version-manager-provided npm reachable from this non-interactive
# shell (nvm/mise are typically only activated in interactive rc files).
export PATH="$HOME/.local/bin:$PATH"
if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate bash)"
fi

# skip silently when the toolchain is unavailable (e.g. a local shell
# without it provisioned).
command -v npx >/dev/null 2>&1 || exit 0

# format only the edited file — whole-repo formatting on every edit is slow
# and can touch unrelated files.
npx biome format --write "$FILE_PATH" >/dev/null 2>&1 || true
exit 0
