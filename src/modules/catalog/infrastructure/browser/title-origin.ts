import { isStoredOrigin, type Origin, type StoredOrigin } from "../../domain/origin";
import { read, write } from "@/shared/lib/browser-storage";

/**
 * A origem do título (US004 RNE001) fica na aba, não na URL (security §8): gravada antes de
 * navegar e lida na tela do título. Vale só para o título com que foi gravada; qualquer outra
 * coisa (outro título, valor mexido à mão, armazenamento bloqueado) é "link".
 */
export const titleOrigin = {
    set: (slug: string, origin: StoredOrigin) =>
        write("sessionStorage", "kinne:origin", { slug, origin }),
    read(slug: string): Origin {
        const value = read("sessionStorage", "kinne:origin");
        if (typeof value !== "object" || value === null) return "link";
        const { slug: saved, origin } = value as Record<string, unknown>;
        return saved === slug && isStoredOrigin(origin) ? origin : "link";
    },
};
