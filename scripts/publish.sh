#!/usr/bin/env bash
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
cd "$repo_root"

if [[ "$(git rev-parse --abbrev-ref HEAD)" != "master" ]]; then
  echo "Refusing to publish: current branch is not master."
  exit 1
fi

message="${1:-Update notes: $(date '+%Y-%m-%d %H:%M')}"
build_dir="$(mktemp -d)"
trap 'rm -rf "$build_dir"' EXIT

npm run check
npx quartz build -o "$build_dir"

git add -A

if git diff --cached --quiet; then
  echo "No changes to publish."
  exit 0
fi

git commit -m "$message"
git push origin master

echo "Published to origin/master."
