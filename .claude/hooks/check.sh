#!/bin/bash

# stop hook: before the task completes, run the unit tests and lint whenever
# code changed in this session. failures block completion and are reported back
# on stderr so the agent addresses them before finishing.
set -uo pipefail

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
cd "$PROJECT_DIR"

# make a version-manager-provided npm reachable from this non-interactive
# shell (nvm/mise are typically only activated in interactive rc files).
export PATH="$HOME/.local/bin:$PATH"
if command -v mise >/dev/null 2>&1; then
  eval "$(mise activate bash)"
fi

# nothing to verify without the package manager.
command -v npm >/dev/null 2>&1 || exit 0

# only run when this session has pending code changes, either uncommitted or
# committed but not yet on the upstream branch. avoids checking on plain
# conversational turns. keep the extension list in sync with the case pattern
# in format.sh.
CODE_GLOB='\.(ts|tsx|css|mjs|json)$'
code_changed() {
  # capture output first — grep -q's early exit inside a pipe would SIGPIPE
  # git under pipefail and silently skip the gate on large change sets.
  local pending
  pending="$(git status --porcelain 2>/dev/null || true)"
  if grep -qE "$CODE_GLOB" <<<"$pending"; then
    return 0
  fi
  local upstream
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}' 2>/dev/null || true)"
  if [ -n "$upstream" ]; then
    pending="$(git diff --name-only "$upstream...HEAD" 2>/dev/null || true)"
    if grep -qE "$CODE_GLOB" <<<"$pending"; then
      return 0
    fi
  fi
  return 1
}
code_changed || exit 0

# skip when the tree is unchanged since the last green run, so a branch that
# is merely ahead of upstream does not re-pay the full suite on every
# conversational turn.
tree_state() {
  {
    git rev-parse HEAD 2>/dev/null
    git diff HEAD 2>/dev/null
    git ls-files --others --exclude-standard -z 2>/dev/null | sort -z | xargs -0 cat 2>/dev/null
  } | git hash-object --stdin
}
STATE_FILE="${TMPDIR:-/tmp}/claude-check-$(printf '%s' "$PROJECT_DIR" | git hash-object --stdin)"
CURRENT_STATE="$(tree_state)"
if [ -f "$STATE_FILE" ] && [ "$(cat "$STATE_FILE")" = "$CURRENT_STATE" ]; then
  exit 0
fi

# run both checks, collecting output for the failure report.
OUTPUT="$(mktemp)"
STATUS=0
if ! npm run test:unit >>"$OUTPUT" 2>&1; then STATUS=1; fi
if ! npm run lint >>"$OUTPUT" 2>&1; then STATUS=1; fi

if [ "$STATUS" -ne 0 ]; then
  {
    echo "Pre-completion checks failed (npm run test:unit / npm run lint)."
    echo "Fix the errors below before completing the task:"
    echo
    tail -n 100 "$OUTPUT"
  } >&2
  rm -f "$OUTPUT"
  exit 2
fi

printf '%s' "$CURRENT_STATE" >"$STATE_FILE"
rm -f "$OUTPUT"
exit 0
