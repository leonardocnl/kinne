-- Busca de pessoas nos filtros (threat model docs/threats/person-search.md, B2): trigramas no
-- nome normalizado, com a mesma kinne_normalize da busca de títulos (0006, G14).
CREATE INDEX IF NOT EXISTS people_name_search_idx
    ON people USING gin (kinne_normalize(name) gin_trgm_ops);
