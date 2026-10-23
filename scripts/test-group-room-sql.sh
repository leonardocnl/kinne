#!/usr/bin/env bash
# Testa as funções SQL da sala de grupo (drizzle/0010_group_room.sql) contra um Postgres real,
# inclusive duas saídas ao mesmo tempo (US011 C11, group-room F1). O Vitest não serve aqui: o
# driver do site é HTTP e uma transação interativa precisa de conexão de verdade.
#
# Uso: aplique as migrations 0000 a 0010 num banco DESCARTÁVEL e rode
#   PGHOST=... PGPORT=... PGUSER=... PGDATABASE=... scripts/test-group-room-sql.sh
# Nunca aponte para o banco de develop ou de produção: o script cria e apaga salas.
set -euo pipefail

psqlq() { psql -v ON_ERROR_STOP=1 -qAt "$@"; }
fail() { echo "FALHOU: $*" >&2; exit 1; }
assert_eq() { [[ "$1" == "$2" ]] || fail "$3 (esperado '$2', veio '$1')"; }

EMPTY="array[]::text[], array[]::text[], array[]::integer[], array[]::integer[], array[]::integer[], array[]::integer[]"
cleanup() { psqlq -c "delete from group_rooms where creator_key_hash like 'sqltest-%'" >/dev/null || true; }
trap cleanup EXIT
cleanup

new_room() { # $1 = código, $2 = chave do criador, $3 = cookie do criador
    psqlq -c "select kinne_create_group_room('$1', '$2', '$3', $EMPTY)"
}
join_room() { # $1 = código, $2 = cookie
    psqlq -c "select coalesce(kinne_join_group_room('$1', '$2', $EMPTY)::text, 'null')"
}
creator_position() { # $1 = sala
    psqlq -c "select m.position from group_rooms r join group_room_members m on m.id = r.creator_member_id where r.id = $1"
}

echo "1. criar: quem criou é a Pessoa 1 e o criador da sala"
ROOM=$(new_room 23456789 sqltest-a cookie-a1)
assert_eq "$(creator_position "$ROOM")" 1 "criador"

echo "2. entrar: o mesmo erro (nulo) para código inexistente, sala cheia e sala começada"
assert_eq "$(join_room ZZZZZZZZ cookie-x)" null "código inexistente"
for i in 2 3 4 5 6 7 8; do join_room 23456789 "cookie-a$i" >/dev/null; done
assert_eq "$(join_room 23456789 cookie-a9)" null "sala cheia (8 pessoas)"
psqlq -c "update group_rooms set phase = 'voting' where id = $ROOM" >/dev/null
assert_eq "$(join_room 23456789 cookie-a10)" null "sala já começada"

echo "3. limite de 3 salas por hora por chave (D1)"
new_room 23456788 sqltest-b cookie-b1 >/dev/null
new_room 23456787 sqltest-b cookie-b2 >/dev/null
new_room 23456786 sqltest-b cookie-b3 >/dev/null
assert_eq "$(new_room 23456785 sqltest-b cookie-b4)" "" "quarta sala na hora"

echo "4. sair: quem criou sai e o papel vai para a pessoa mais antiga ainda na sala (C11)"
R=$(new_room 33333333 sqltest-c cookie-c1)
for i in 2 3 4; do join_room 33333333 "cookie-c$i" >/dev/null; done
assert_eq "$(psqlq -c "select kinne_leave_group_room('cookie-c1')")" left "saída do criador"
assert_eq "$(creator_position "$R")" 2 "novo criador"
assert_eq "$(psqlq -c "select kinne_leave_group_room('cookie-c3')")" left "saída de quem não criou"
assert_eq "$(creator_position "$R")" 2 "criador não muda quando outra pessoa sai"
assert_eq "$(psqlq -c "select kinne_leave_group_room('cookie-c1')")" "" "sair duas vezes"
assert_eq "$(psqlq -c "select count(*) from group_room_members where room_id = $R and left_at is not null and token_hash is null and cardinality(streamings) = 0")" 2 "quem saiu perde cookie e dados"

echo "5. a única pessoa sai: a sala encerra (C11)"
S=$(new_room 44444444 sqltest-d cookie-d1)
assert_eq "$(psqlq -c "select kinne_leave_group_room('cookie-d1')")" ended "única pessoa"
assert_eq "$(psqlq -c "select expires_at <= now() from group_rooms where id = $S")" t "sala expirada"
assert_eq "$(join_room 44444444 cookie-d2)" null "entrar numa sala encerrada"

echo "6. duas saídas ao mesmo tempo (F1): criador e a pessoa seguinte saem juntos"
for run in 1 2 3 4 5; do
    code="5555555$((run + 1))"
    T=$(new_room "$code" "sqltest-e$run" "cookie-e${run}1")
    for i in 2 3; do join_room "$code" "cookie-e$run$i" >/dev/null; done
    # a primeira sessão segura o lock da sala por meio segundo; a segunda tem de esperar por ele
    psql -qAt -c "begin; select kinne_leave_group_room('cookie-e${run}1'); select pg_sleep(0.5); commit;" >/dev/null &
    sleep 0.15
    psqlq -c "select kinne_leave_group_room('cookie-e${run}2')" >/dev/null &
    wait
    assert_eq "$(creator_position "$T")" 3 "criador depois de duas saídas (rodada $run)"
    assert_eq "$(psqlq -c "select count(*) from group_room_members where room_id = $T and left_at is null")" 1 "pessoas na sala"
done

echo "7. saídas simultâneas sem ordem combinada: sempre um criador válido ou sala encerrada"
for run in 1 2 3 4 5 6 7 8 9 10; do
    letters=(A B C D E F G H J K)
    code="8888888${letters[run - 1]}"
    U=$(new_room "$code" "sqltest-f$run" "cookie-f${run}1")
    for i in 2 3; do join_room "$code" "cookie-f$run$i" >/dev/null; done
    for i in 1 2 3; do psqlq -c "select kinne_leave_group_room('cookie-f$run$i')" >/dev/null & done
    wait
    assert_eq "$(psqlq -c "select count(*) from group_room_members where room_id = $U and left_at is null")" 0 "ninguém sobra (rodada $run)"
    assert_eq "$(psqlq -c "select expires_at <= now() from group_rooms where id = $U")" t "sala encerrada (rodada $run)"
done

echo "8. dois criadores nunca existem: a sala aponta para um membro só"
assert_eq "$(psqlq -c "select count(*) from information_schema.columns where table_name = 'group_rooms' and column_name = 'creator_member_id'")" 1 "coluna única do criador"

echo "9. purga: só as salas vencidas, com tudo o que elas guardam"
before=$(psqlq -c "select count(*) from group_room_members")
psqlq -c "select kinne_purge_group_rooms()" >/dev/null
after=$(psqlq -c "select count(*) from group_room_members")
(( after < before )) || fail "a purga não apagou os membros das salas vencidas"
assert_eq "$(psqlq -c "select count(*) from group_rooms where expires_at <= now()")" 0 "salas vencidas depois da purga"

echo "9b. a limpeza diária (kinne_sync) apaga a sala vencida e as filhas, pelo cascade"
V=$(new_room 77777777 sqltest-g cookie-g1)
join_room 77777777 cookie-g2 >/dev/null
psqlq -c "update group_rooms set created_at = now() - interval '5 hours', expires_at = now() - interval '2 hours' where id = $V" >/dev/null
psql -v ON_ERROR_STOP=1 -qAt -c "set role kinne_sync; delete from group_rooms where expires_at <= now()" >/dev/null
assert_eq "$(psqlq -c "select count(*) from group_rooms where id = $V")" 0 "sala apagada pela limpeza"
assert_eq "$(psqlq -c "select count(*) from group_room_members where room_id = $V")" 0 "membros apagados pelo cascade"

echo "10. permissões do kinne_app: lê, escreve só as colunas da fase e não apaga nem cria direto"
denied() { # $1 = descrição, $2 = SQL que tem de ser recusado
    if psql -v ON_ERROR_STOP=1 -qAt -c "set role kinne_app; $2" >/dev/null 2>&1; then
        fail "kinne_app conseguiu: $1"
    fi
}
allowed() { psql -v ON_ERROR_STOP=1 -qAt -c "set role kinne_app; $1" >/dev/null || fail "kinne_app deveria conseguir: $1"; }
allowed "select count(*) from group_rooms"
allowed "update group_rooms set phase = phase where false"
allowed "update group_room_members set ready = ready where false"
denied "apagar sala" "delete from group_rooms"
denied "apagar membro" "delete from group_room_members"
denied "apagar voto" "delete from group_room_votes"
denied "criar sala direto" "insert into group_rooms (code, creator_key_hash, expires_at) values ('99999999', 'x', now() + interval '1 hour')"
denied "criar membro direto" "insert into group_room_members (room_id, position) values (1, 1)"
denied "trocar o cookie de um membro" "update group_room_members set token_hash = 'x' where false"
denied "trocar o criador" "update group_rooms set creator_member_id = 1 where false"
denied "mexer em finalista" "update group_room_finalists set position = 1 where false"
denied "ler as tabelas de rate limit" "select * from rate_limit_buckets"
echo "11. permissões do kinne_sync: apaga sala (limpeza diária), não mexe em membros direto"
psql -v ON_ERROR_STOP=1 -qAt -c "set role kinne_sync; delete from group_rooms where false" >/dev/null || fail "kinne_sync deveria apagar salas"
if psql -v ON_ERROR_STOP=1 -qAt -c "set role kinne_sync; delete from group_room_members where false" >/dev/null 2>&1; then
    fail "kinne_sync não deveria apagar membros direto"
fi

echo "OK"
