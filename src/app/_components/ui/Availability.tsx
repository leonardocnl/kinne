import type { StreamingService } from "@/domain/streaming";
import { cx } from "./cx";

/** Onde assistir: a informação principal do título, logo abaixo dele. Sem streaming, nada. */
export function Availability({
    streamings,
    className,
}: {
    streamings: readonly Pick<StreamingService, "id" | "name">[];
    className?: string;
}) {
    if (streamings.length === 0) return null;
    return (
        <div className={cx("flex flex-col gap-0.5", className)}>
            <p className="text-caption text-soft">Onde assistir</p>
            {/* mesmo fio do Facts entre os nomes. Todo nome tem o fio à esquerda e a lista recua
                fio + respiro (o fio e o respiro somam 3.75) para escondê-lo: quando quebra no celular, a
                linha nova começa sem fio */}
            <div className="overflow-hidden">
                <ul className="-ml-3.75 flex flex-wrap items-center gap-y-1 text-body font-medium text-paper">
                    {streamings.map((s) => (
                        <li key={s.id} className="border-l border-line px-3.5 whitespace-nowrap">
                            {s.name}
                        </li>
                    ))}
                </ul>
            </div>
        </div>
    );
}
