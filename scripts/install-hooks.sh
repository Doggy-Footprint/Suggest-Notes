#!/usr/bin/env bash
# Installs the repo's git hooks. Run once after `git clone` or `git worktree add`.
set -euo pipefail

repo_root="$(git rev-parse --show-toplevel)"
hooks_dir="$repo_root/.githooks"

chmod +x "$hooks_dir/pre-commit" "$hooks_dir/verify_agents_rules.py"
git config core.hooksPath "$hooks_dir"

echo "Installed git hooks: core.hooksPath -> $hooks_dir"
