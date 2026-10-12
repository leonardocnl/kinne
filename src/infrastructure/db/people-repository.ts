import "server-only";
import { and, asc, desc, eq, ne, sql } from "drizzle-orm";
import { ADULT_CERTIFICATION } from "@/domain/catalog-sync";
import {
    MAX_PERSON_RESULTS,
    MAX_PERSON_TITLES,
    type PersonRole,
    type PersonSuggestion,
} from "@/domain/person-search";
import type { Db } from "./client";
import { catalogTitles, people, streamingAvailability, titleCredits } from "./schema";
import { likeNeedle } from "./search-repository";

const STATEMENT_TIMEOUT = "2s"; // person-search B2

/**
 * C3: só os títulos que os filtros sorteiam, o mesmo critério de DrizzleTitlesRepository
 * .candidates(): recomendável, fora do 18 e disponível em algum streaming no Brasil.
 */
export const candidateTitle = and(
    eq(catalogTitles.isRecommendable, true),
    ne(catalogTitles.certificationBr, ADULT_CERTIFICATION),
    sql`exists (select 1 from ${streamingAvailability}
        where ${streamingAvailability.catalogTitleId} = ${catalogTitles.id}
        and ${streamingAvailability.countryCode} = 'BR')`,
);

const name = sql`kinne_normalize(${people.name})`;
const titles = sql<number>`count(distinct ${titleCredits.catalogTitleId})::int`;
// o papel em que mais aparece; empate fica com direção, o que a pessoa escolheu fazer
const role = sql<PersonRole>`case when count(*) filter (where ${titleCredits.role} = 'director')
    >= count(*) filter (where ${titleCredits.role} = 'cast') then 'director' else 'cast' end`;

/** Pessoas com pelo menos um título sorteável cujo nome contém o termo (A1, A2, B2, C2, C3). */
export function suggestionsQuery(db: Db, term: string) {
    const needle = likeNeedle(term);
    return db
        .select({ id: people.id, name: people.name, role, titles })
        .from(people)
        .innerJoin(titleCredits, eq(titleCredits.personId, people.id))
        .innerJoin(catalogTitles, eq(catalogTitles.id, titleCredits.catalogTitleId))
        .where(and(sql`${name} like '%' || ${needle} || '%'`, candidateTitle))
        .groupBy(people.id)
        .orderBy(sql`(${name} like ${needle} || '%') desc`, desc(titles), asc(people.id))
        .limit(MAX_PERSON_RESULTS);
}

/** Os títulos sorteáveis de uma pessoa, com teto (A6, B6, C3). */
export function titleIdsQuery(db: Db, personId: number) {
    return db
        .selectDistinct({ id: titleCredits.catalogTitleId })
        .from(titleCredits)
        .innerJoin(catalogTitles, eq(catalogTitles.id, titleCredits.catalogTitleId))
        .where(and(eq(titleCredits.personId, personId), candidateTitle))
        .orderBy(asc(titleCredits.catalogTitleId))
        .limit(MAX_PERSON_TITLES);
}

export class DrizzlePeopleRepository {
    constructor(private readonly db: Db) {}

    async suggestions(term: string): Promise<PersonSuggestion[]> {
        const [, rows] = await this.db.batch([
            this.db.execute(sql.raw(`set local statement_timeout = '${STATEMENT_TIMEOUT}'`)),
            suggestionsQuery(this.db, term),
        ]);
        return rows;
    }

    async titleIds(personId: number): Promise<number[]> {
        const [, rows] = await this.db.batch([
            this.db.execute(sql.raw(`set local statement_timeout = '${STATEMENT_TIMEOUT}'`)),
            titleIdsQuery(this.db, personId),
        ]);
        return rows.map((r) => r.id);
    }
}
