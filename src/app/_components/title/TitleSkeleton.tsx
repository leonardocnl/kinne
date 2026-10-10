import { billingRow, screenMain } from "../layout";
import { Skeleton } from "../ui/Skeleton";

/** Tela do título carregando (CM001): cada bloco no formato da peça que vai substituir. */
export function TitleSkeleton() {
    return (
        <main aria-busy="true" className={screenMain}>
            <p role="status" className="sr-only">
                Carregando o título
            </p>
            <Skeleton shape="frame" />
            <div className={billingRow}>
                <div className="flex flex-col gap-3 desktop:w-1/2">
                    <Skeleton shape="title" className="w-4/5" />
                    <Skeleton shape="line" className="w-11/12" />
                    <Skeleton shape="line" className="w-3/4" />
                    <span className="flex gap-2.5">
                        <Skeleton shape="data" />
                        <Skeleton shape="data" />
                        <Skeleton shape="data" />
                    </span>
                </div>
                <span className="flex gap-2.5 desktop:w-104">
                    <Skeleton shape="button" className="grow basis-0" />
                    <Skeleton shape="button" className="w-24" />
                    <Skeleton shape="button" className="w-control" />
                </span>
            </div>
        </main>
    );
}
