import { neon } from "@neondatabase/serverless";

// The suite records usage events and can create rooms, so it only runs against develop.
export default async function guard() {
    if (!process.env.DATABASE_URL_POOLED) process.loadEnvFile(".env.local");
    const url = process.env.DATABASE_URL_POOLED;
    if (!url) throw new Error("test:visual: DATABASE_URL_POOLED is not set.");
    const rows = await neon(url)`select value from meta where key = 'environment'`;
    if (rows[0]?.value !== "develop") throw new Error("test:visual: runs only against develop.");
}
