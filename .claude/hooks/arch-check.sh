#!/usr/bin/env bash
# PostToolUse (Edit, Write, MultiEdit): after Claude edits code under src/, run arch:check.
# A broken boundary goes back to Claude (exit 2) while the edit is still fresh. Plan §1.7.
set -euo pipefail

root="${CLAUDE_PROJECT_DIR:?}"
file=$(jq -r '.tool_input.file_path // empty')

case "$file" in
    "$root"/src/*.ts | "$root"/src/*.tsx | "$root"/src/*.mts | "$root"/.dependency-cruiser.cjs) ;;
    *) exit 0 ;;
esac

cd "$root"
if ! out=$(npm run --silent arch:check 2>&1); then
    {
        echo "arch:check failed after editing ${file#"$root"/}. Fix the import before going on:"
        echo "$out"
    } >&2
    exit 2
fi
