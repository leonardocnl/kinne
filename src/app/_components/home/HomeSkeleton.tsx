import { Skeleton } from "../ui/Skeleton";
import { billingRow, homeMain } from "./layout";
import { TopBar } from "./TopBar";

/** Tela inicial carregando (CM001): cada bloco no formato da peça que vai substituir. */
export function HomeSkeleton() {
    return (
        <>
            <TopBar />
            <main aria-busy="true" className={homeMain}>
                <p role="status" className="sr-only">
                    Carregando as indicações de hoje
                </p>
                <Skeleton shape="frame" />
                <div className={billingRow}>
                    <div className="flex flex-col gap-3 desktop:w-1/2">
                        <Skeleton shape="title" className="w-4/5" />
                        <Skeleton shape="title" className="w-1/2" />
                        <Skeleton shape="line" className="w-11/12" />
                        <span className="flex gap-2.5">
                            <Skeleton shape="data" />
                            <Skeleton shape="data" />
                            <Skeleton shape="data" />
                        </span>
                    </div>
                    <span className="flex gap-2.5 desktop:w-90 desktop:pb-11.5">
                        <Skeleton shape="button" className="grow basis-0" />
                        <Skeleton shape="button" className="grow basis-0" />
                    </span>
                </div>
            </main>
        </>
    );
}
