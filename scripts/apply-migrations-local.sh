#!/usr/bin/env bash
# Aplica drizzle/*.sql, em ordem, num PostgreSQL DESCARTÁVEL (testes de banco, npm run test:db).
# Usa as variáveis PG* do ambiente. Recusa qualquer servidor que não seja a própria máquina: nunca
# aponte isto para o banco de develop ou de produção.
set -euo pipefail

host="${PGHOST:-localhost}"
case "$host" in
    localhost | 127.0.0.1 | /*) ;;
    *) echo "recusado: PGHOST=$host não é a máquina local" >&2; exit 1 ;;
esac

cd "$(dirname "$0")/.."
tmp="$(mktemp)"
trap 'rm -f "$tmp"' EXIT
for file in drizzle/00*.sql; do
    # o drizzle separa as instruções com este marcador; o psql roda o arquivo inteiro de uma vez
    sed 's/--> statement-breakpoint//' "$file" > "$tmp"
    psql -v ON_ERROR_STOP=1 -q -f "$tmp" > /dev/null
done
echo "migrations aplicadas em $host"
