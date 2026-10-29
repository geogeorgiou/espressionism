#!/usr/bin/env bash
# Lints GitHub Actions workflows with zizmor, including online audits.
# Usage: scripts/lint-actions.sh [files...]  (defaults to .github/)
set -euo pipefail

if ! command -v zizmor >/dev/null 2>&1; then
  echo "zizmor not found. Install it with: brew install zizmor" >&2
  exit 1
fi

if [ -z "${GH_TOKEN:-}" ]; then
  GH_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
if [ -z "$GH_TOKEN" ]; then
  echo "zizmor online audits need a GitHub token: set GH_TOKEN or run 'gh auth login'." >&2
  exit 1
fi
export GH_TOKEN

if [ "$#" -eq 0 ]; then
  set -- .github
fi
exec zizmor "$@"
