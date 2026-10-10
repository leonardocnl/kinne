import { readFileSync } from "node:fs";
import { join } from "node:path";

export type DesignDoc = {
    updated: string;
    sections: { title: string; lines: { text: string; bullet: boolean }[] }[];
};

/** Lê o DESIGN.md: a data da última atualização e, por seção (##), parágrafos e itens. */
export function parseDesignDoc(markdown: string): DesignDoc {
    const updated = markdown.match(/^Última atualização: (.+?)\.?$/m)?.[1] ?? "";
    const sections: DesignDoc["sections"] = [];
    for (const line of markdown.split("\n")) {
        const heading = line.match(/^## (.+)/);
        if (heading) sections.push({ title: heading[1], lines: [] });
        else if (line.trim() && sections.length > 0) {
            const bullet = line.startsWith("- ");
            sections.at(-1)!.lines.push({ text: bullet ? line.slice(2) : line, bullet });
        }
    }
    return { updated, sections };
}

// Lido no build: a página é estática.
export const designDoc = parseDesignDoc(readFileSync(join(process.cwd(), "DESIGN.md"), "utf8"));
