-- Revisão de segurança do PR #17 (C1): a carga só apaga das tabelas de vínculo, da
-- disponibilidade, dos créditos e dos títulos. As demais perdem DELETE (0003 já aplicada).
REVOKE DELETE ON genres, theme_keywords, people, sync_runs FROM kinne_sync;
