#!/usr/bin/env bash
# Updates GitHub Actions with actions-up: SHA pins, same 7-day cooldown as Dependabot.
# Usage: scripts/actions-up.sh [actions-up flags...]
set -euo pipefail

if [ -z "${GITHUB_TOKEN:-}" ]; then
  GITHUB_TOKEN="$(gh auth token 2>/dev/null || true)"
fi
if [ -z "$GITHUB_TOKEN" ]; then
  echo "actions-up needs a GitHub token: set GITHUB_TOKEN or run 'gh auth login'." >&2
  exit 1
fi
export GITHUB_TOKEN

exec pnpm exec actions-up --min-age 7 "$@"
