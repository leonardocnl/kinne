import { describe, expect, it } from "vitest";
import { SHOW_SIGN_IN } from "./signIn";

describe("SHOW_SIGN_IN", () => {
    // Ligar é uma decisão explícita: depois do teste no iPhone e da revisão de /privacidade e do
    // FAQ, troque a chave e este valor esperado no mesmo PR.
    it("fica desligada até o dono decidir lançar o login", () => {
        expect(SHOW_SIGN_IN).toBe(false);
    });
});
