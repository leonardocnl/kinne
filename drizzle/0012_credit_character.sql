-- Personagem do elenco (US004 C12). Sem GRANT novo: kinne_sync (0003) e kinne_app (0006) recebem
-- privilégios em title_credits no nível da tabela, que valem também para colunas novas.
ALTER TABLE "title_credits" ADD COLUMN "character_name" text;
