#!/usr/bin/env bash
# Stop: when the task touched code, list the folders touched and ask Claude to review their
# documentation before finishing (plan §1.8). It blocks once per set of changes: the same changes
# do not block again, and a stop that this hook already sent back never loops.
set -euo pipefail

input=$(cat)
[ "$(jq -r '.stop_hook_active // false' <<< "$input")" = "true" ] && exit 0

cd "${CLAUDE_PROJECT_DIR:?}"
git rev-parse --is-inside-work-tree > /dev/null 2>&1 || exit 0

# Everything this branch changed against develop: commits, the working tree and new files.
base=$(git merge-base HEAD origin/develop 2> /dev/null || git rev-parse HEAD)
mapfile -t changed < <({
    git diff --name-only "$base"
    git ls-files --others --exclude-standard
} | sort -u)

code=()
for file in "${changed[@]}"; do
    case "$file" in src/*) code+=("$file") ;; esac
done
[ "${#code[@]}" -eq 0 ] && exit 0

# Once per set of changes, so a session is not stopped again for the same work.
stamp="$(git rev-parse --git-dir)/claude-doc-review"
digest=$({
    git diff "$base" -- src
    git ls-files --others --exclude-standard -z -- src | xargs -0 -r cat
} | sha256sum | cut -d' ' -f1)
[ -f "$stamp" ] && [ "$(cat "$stamp")" = "$digest" ] && exit 0
echo "$digest" > "$stamp"

is_changed() { printf '%s\n' "${changed[@]}" | grep -qx -- "$1"; }

# The folder that owns each file: a module, a shared area, a legacy layer or a route folder.
# (`t` ends the line at the first rule that matched, so the rules do not stack.)
mapfile -t folders < <(printf '%s\n' "${code[@]}" | sed -E \
    -e 's#^(src/(modules|shared)/[^/]+)/.*#\1#;t' \
    -e 's#^(src/app/[^/]+)/.*#\1#;t' \
    -e 's#^(src/[^/]+)/.*#\1#' | sort -u)

docs=()
ui=false
for folder in "${folders[@]}"; do
    if [ -f "$folder/README.md" ]; then
        docs+=("$folder/README.md")
    elif [[ "$folder" == src/modules/* ]]; then
        docs+=("$folder/README.md (missing: every module has one)")
    fi
    case "$folder" in src/app/_components | src/shared/ui | src/app) ui=true ;; esac
done
printf '%s\n' "${code[@]}" | grep -qE '^src/app/globals\.css$|^src/app/_components/' && ui=true
if [ "$ui" = true ]; then
    for doc in DESIGN.md DESIGN.pt-BR.md; do [ -f "$doc" ] && docs+=("$doc"); done
fi
[ -d docs/architecture/adr ] && docs+=("docs/architecture/adr/ (a decision changed or a new one?)")

{
    echo "Before finishing, review the documentation of what this task touched (plan §1.8)."
    echo "Folders touched:"
    printf '  - %s\n' "${folders[@]}"
    echo "Documents to review, and update where the change makes them wrong or incomplete:"
    for doc in "${docs[@]}"; do
        mark=""
        is_changed "${doc%% *}" && mark=" (already changed in this branch)"
        echo "  - $doc$mark"
    done
    echo "If nothing needs to change, say so in one line and finish."
} >&2
exit 2
