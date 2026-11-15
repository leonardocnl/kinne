// Resposta de uma ação que recusou o pedido por excesso (security.md §7): a tela mostra o aviso
// abaixo e segue onde está; nada de detalhe sobre o limite.
export const LIMITED = { kind: "limited" } as const;
export type Limited = typeof LIMITED;

export const isLimited = (answer: unknown): answer is Limited =>
    typeof answer === "object" && answer !== null && (answer as Limited).kind === "limited";

export const LIMITED_MESSAGE = "Muitos pedidos seguidos. Espere alguns segundos e tente de novo.";
