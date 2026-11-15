import "server-only";
import { createHmac } from "node:crypto";
import { isIPv4, isIPv6 } from "node:net";

// O único lugar que conhece a hospedagem (H8). Na Vercel, x-real-ip é gravado pela plataforma
// com o endereço de quem conectou; X-Forwarded-For pode trazer valores do cliente e nunca é lido
// (G1). Fora da Vercel não há valor confiável: todos dividem o mesmo balde.
export function getClientIp(
    headers: Headers,
    env: Record<string, string | undefined> = process.env,
): string | null {
    if (env.VERCEL !== "1") return null;
    const ip = headers.get("x-real-ip")?.trim() ?? "";
    return isIPv4(ip) || isIPv6(ip) ? ip : null;
}

/** IPv4 inteiro; IPv6 pelo prefixo /64, que uma máquina só controla inteiro (G2). */
export function ipBucket(ip: string | null): string {
    if (!ip) return "unknown";
    if (isIPv4(ip)) return ip;
    const lower = ip.toLowerCase().split("%")[0];
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
    if (mapped && isIPv4(mapped[1])) return mapped[1];
    const [head, tail = ""] = lower.split("::");
    const left = head ? head.split(":") : [];
    const right = lower.includes("::") && tail ? tail.split(":") : [];
    // um IPv4 no fim ocupa dois grupos, mas nunca cai nos quatro primeiros
    const missing = 8 - left.length - right.length - (right.at(-1)?.includes(".") ? 1 : 0);
    const groups = lower.includes("::")
        ? [...left, ...Array<string>(Math.max(missing, 0)).fill("0"), ...right]
        : left;
    return `${groups
        .slice(0, 4)
        .map((g) => g.replace(/^0+(?=.)/, ""))
        .join(":")}::/64`;
}

/**
 * Chave do visitante no limitador: HMAC do balde com um sal derivado do segredo e do dia em UTC
 * (E2, G16). O sal nunca é gravado; no dia seguinte as chaves antigas não se ligam às novas.
 * Sem segredo, null: o limitador não consegue decidir (E3).
 */
export function clientKey(ip: string | null, secret: string | undefined, now: Date): string | null {
    if (!secret) return null;
    const salt = createHmac("sha256", secret).update(now.toISOString().slice(0, 10)).digest();
    return createHmac("sha256", salt).update(ipBucket(ip)).digest("hex").slice(0, 32);
}
