import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CAN_HOVER, ProfileCard } from "./ProfileCard";
import ProfileCardPopover, { cardVariants, type Profile } from "./ProfileCardPopover";

const dir = import.meta.dirname;
const card = (profile: Profile, open = true) =>
    renderToStaticMarkup(
        <ProfileCardPopover profile={profile} open={open} anchor={{ current: null }} />,
    );

describe("ProfileCardPopover: conteúdo", () => {
    it("LinkedIn: nome, headline, local e o ícone; sem foto, banner, iniciais nem conexões", () => {
        const html = card("linkedin");
        expect(html).toContain(">Leonardo Carvalho Silva<");
        expect(html).toContain(">Information Systems @ UFLA | Founder @ Kinne<");
        expect(html).toContain(">Brasil<");
        expect(html.match(/<svg/g)).toHaveLength(1);
        expect(html).not.toMatch(/<img|connections|conexões|>LC</);
        expect(html).not.toContain("<a ");
    });

    it("GitHub: só o usuário, como link para o perfil; sem foto, ícone, @ nem contribuições", () => {
        const html = card("github");
        expect(html).toMatch(
            /<a href="https:\/\/github.com\/leonardocnl" target="_blank" rel="noopener noreferrer"[^>]*>leonardocnl<\/a>/,
        );
        expect(html).not.toMatch(/<img|<svg|@leonardocnl|Leonardo|contribu|>LC</);
    });

    it("fechado, fica inerte (nem o link do GitHub recebe foco)", () => {
        expect(card("github", false)).toMatch(/^<div inert=""/);
        expect(card("github", true)).not.toMatch(/^<div inert/);
    });

    it("sem amarelo, só tokens do vidro", () => {
        for (const p of ["linkedin", "github"] as const) {
            expect(card(p)).not.toMatch(/signal|neutral-|bg-white|bg-black|#[0-9a-f]{3}/i);
            expect(card(p)).toContain("bg-glass");
        }
    });

    it("nenhuma chamada de rede nem tema claro no código", () => {
        const source = readFileSync(join(dir, "ProfileCardPopover.tsx"), "utf8");
        expect(source).not.toMatch(/fetch\(|api\.github|jogruber|useTheme|dark:|console\./);
    });
});

describe("ProfileCard: abrir e fechar", () => {
    it("fechado por padrão: o servidor manda só o link, sem cartão", () => {
        const html = renderToStaticMarkup(
            <ProfileCard profile="linkedin">
                <a href="https://www.linkedin.com/in/leonardocnl">LinkedIn</a>
            </ProfileCard>,
        );
        expect(html).toContain(">LinkedIn</a>");
        expect(html).not.toContain("Leonardo Carvalho Silva");
    });

    it("só em aparelho com mouse (no toque o cartão nem é baixado)", () => {
        expect(CAN_HOVER).toBe("(hover: hover) and (pointer: fine)");
        const source = readFileSync(join(dir, "ProfileCard.tsx"), "utf8");
        expect(source).toMatch(/if \(!matchMedia\(CAN_HOVER\)\.matches\) return;/);
        expect(source).toContain('e.pointerType === "mouse" && setOpen(true)');
    });

    it("abre com foco de teclado e fecha na Esc e ao perder o foco", () => {
        const source = readFileSync(join(dir, "ProfileCard.tsx"), "utf8");
        expect(source).toContain("isKeyboardFocus(e.target) && setOpen(true)");
        expect(source).toMatch(/e\.key === "Escape"\) setOpen\(false\)/);
        expect(source).toContain("!e.currentTarget.contains(e.relatedTarget) && setOpen(false)");
    });
});

describe("cardVariants: movimento reduzido", () => {
    it("sem blur, escala nem deslize, e sem duração", () => {
        const { hidden, visible } = cardVariants(true) as Record<string, Record<string, unknown>>;
        for (const v of [hidden, visible]) {
            expect(v).not.toHaveProperty("filter");
            expect(v).not.toHaveProperty("scale");
            expect(v).not.toHaveProperty("y");
            expect(v.transition).toEqual({ duration: 0 });
        }
    });

    it("com movimento, a entrada do original (blur e escala)", () => {
        const { hidden } = cardVariants(false) as Record<string, Record<string, unknown>>;
        expect(hidden).toMatchObject({ filter: "blur(0.125rem)", scale: 0.98, y: 6 });
    });
});
