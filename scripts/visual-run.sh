#!/usr/bin/env bash
# Runs the visual suite in the official Playwright container, next to a disposable Postgres with the
# real migrations and fixed data. No secret and no project database reach it: .env* is not copied.
# Usage: scripts/visual-run.sh [--update]
set -euo pipefail

IMAGE=mcr.microsoft.com/playwright:v1.63.0
POSTGRES=docker.io/library/postgres:16
DB="kinne-visual-db-$$"

if docker info > /dev/null 2>&1; then
    RUNTIME=docker
elif podman info > /dev/null 2>&1; then
    RUNTIME=podman
else
    echo "test:visual needs Docker or Podman." >&2
    exit 1
fi

cd "$(dirname "$0")/.."
UPDATE=""
[ "${1:-}" = "--update" ] && UPDATE="--update-snapshots"

trap '$RUNTIME rm -f "$DB" > /dev/null 2>&1 || true' EXIT
"$RUNTIME" run -d --name "$DB" -e POSTGRES_HOST_AUTH_METHOD=trust "$POSTGRES" > /dev/null
until "$RUNTIME" exec "$DB" pg_isready -q -h 127.0.0.1 -U postgres; do sleep 1; done

for file in drizzle/00*.sql e2e/visual-fixtures.sql; do
    sed 's/--> statement-breakpoint//' "$file" |
        "$RUNTIME" exec -i -e PGOPTIONS="-c client_min_messages=warning" "$DB" psql -v ON_ERROR_STOP=1 -q -h 127.0.0.1 -U postgres > /dev/null
done

mkdir -p e2e/visual-baseline test-results
"$RUNTIME" run --rm --network "container:$DB" \
    -e NEXT_TELEMETRY_DISABLED=1 -e CI="${CI:-}" -e UPDATE="$UPDATE" \
    -v "$PWD:/src:ro,z" \
    -v "$PWD/e2e/visual-baseline:/work/e2e/visual-baseline:z" \
    -v "$PWD/test-results:/work/test-results:z" \
    -w /work "$IMAGE" bash -c '
        set -euo pipefail
        tar -C /src --exclude=./node_modules --exclude=./.next --exclude=./.git \
            --exclude="./.env*" --exclude=./test-results --exclude=./e2e/visual-baseline -cf - . |
            tar -xf -
        npm ci --no-audit --no-fund > /dev/null 2>&1
        npm run build > /dev/null
        npx playwright test --reporter=line $UPDATE
    '
