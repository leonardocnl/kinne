import { screenMain } from "../layout";
import { Skeleton } from "../ui/Skeleton";
import { SpecsSkeleton } from "./SpecsSkeleton";

/**
 * Tela do título carregando (CM001), na disposição dela: quadro; pôster à esquerda (computador),
 * título, ficha, chamada e sinopse no meio; as ações à direita, na altura do título.
 */
export function TitleSkeleton() {
    return (
        <main aria-busy="true" className={screenMain}>
            <p role="status" className="sr-only">
                Carregando o título
            </p>
            <Skeleton shape="frame" />
            <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col max-desktop:gap-5 desktop:pt-3.5">
                <Skeleton
                    shape="poster"
                    className="desktop:col-start-1 desktop:row-span-3 desktop:row-start-1 desktop:mr-12"
                />
                <span className="flex min-w-0 flex-col gap-3.5 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12">
                    <Skeleton shape="title" className="w-3/5" />
                    <SpecsSkeleton count={6} />
                    <Skeleton shape="line" className="w-1/2" />
                    <Skeleton shape="line" className="w-11/12 max-w-measure" />
                    <Skeleton shape="line" className="w-3/4 max-w-measure" />
                </span>
                <span className="flex gap-2.5 desktop:col-start-3 desktop:row-start-1 desktop:h-title-line desktop:items-center">
                    <Skeleton shape="button" className="grow basis-0 desktop:w-70 desktop:grow-0" />
                    <Skeleton shape="button" className="w-24" />
                    <Skeleton shape="button" className="w-control" />
                </span>
            </div>
        </main>
    );
}
