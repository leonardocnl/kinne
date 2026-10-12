// Dados fixos: streamings e gêneros do TMDB. Idempotente (upsert por tmdb_id).
import { sql } from "drizzle-orm";
import { kinneGenreFor } from "@/domain/genre";
import { STREAMING_SERVICES } from "@/domain/streaming";
import { createDb } from "@/infrastructure/db/client";
import { genres, streamingServices } from "@/infrastructure/db/schema";
import { TmdbClient } from "@/infrastructure/tmdb/client";

type GenreList = { genres: { id: number; name: string }[] };

async function main() {
    const db = createDb();
    const tmdb = new TmdbClient();

    await db
        .insert(streamingServices)
        .values(STREAMING_SERVICES.map((s) => ({ tmdbId: s.tmdbId, name: s.name })))
        .onConflictDoUpdate({
            target: streamingServices.tmdbId,
            set: { name: sql`excluded.name` },
        });

    const lists = await Promise.all(
        ["movie", "tv"].map(
            (type) => tmdb.get(`/genre/${type}/list`, { language: "pt-BR" }) as Promise<GenreList>,
        ),
    );
    const byId = new Map(lists.flatMap((l) => l.genres).map((g) => [g.id, g.name]));
    await db
        .insert(genres)
        .values(
            [...byId].map(([tmdbId, name]) => ({
                tmdbId,
                name,
                kinneGenre: kinneGenreFor(tmdbId),
            })),
        )
        .onConflictDoUpdate({
            target: genres.tmdbId,
            set: { name: sql`excluded.name`, kinneGenre: sql`excluded.kinne_genre` },
        });

    console.log(`Seed: ${STREAMING_SERVICES.length} streamings, ${byId.size} gêneros.`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
