import type { ReactNode } from "react";

/** Um dado da ficha (tela do título e destaque da home): rótulo em caixa alta e o valor embaixo. */
export function TitleSpec({ label, children }: { label: string; children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <dt className="text-caption font-semibold tracking-code text-soft uppercase">
                {label}
            </dt>
            <dd className="text-body text-paper">{children}</dd>
        </div>
    );
}
