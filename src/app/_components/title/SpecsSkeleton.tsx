import { Skeleton } from "../ui/Skeleton";

/** A ficha carregando (tela do título e home): rótulo pequeno e valor embaixo, lado a lado. */
export function SpecsSkeleton({ count }: { count: number }) {
    return (
        <span className="flex flex-wrap gap-x-8 gap-y-4 desktop:my-2">
            {Array.from({ length: count }, (_, i) => (
                <span key={i} className="flex flex-col gap-2">
                    <Skeleton shape="data" className="w-14" />
                    <Skeleton shape="line" className="w-24" />
                </span>
            ))}
        </span>
    );
}
