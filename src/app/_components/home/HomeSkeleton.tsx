import { SpecsSkeleton } from "../title/SpecsSkeleton";
import { screenMain } from "../layout";
import { Skeleton } from "../ui/Skeleton";
import { TopBar } from "../TopBar";

/**
 * Tela inicial carregando (CM001), na disposição dela: quadro encostado no topo; pôster à esquerda
 * (computador), título, ficha, chamada e "Ver este título"; as três ações à direita, da mesma
 * largura, na altura do título (no celular, o par e o grupo embaixo).
 */
export function HomeSkeleton() {
    return (
        <>
            <TopBar floating />
            <main aria-busy="true" className={screenMain}>
                <p role="status" className="sr-only">
                    Carregando as indicações de hoje
                </p>
                <Skeleton shape="frame" />
                <div className="title-layout pt-2 max-desktop:flex max-desktop:flex-col desktop:pt-3.5">
                    <Skeleton
                        shape="poster"
                        className="desktop:col-start-1 desktop:row-span-3 desktop:row-start-1 desktop:mr-12"
                    />
                    <span className="flex min-w-0 flex-col gap-3 desktop:col-start-2 desktop:row-span-3 desktop:row-start-1 desktop:mr-12 desktop:gap-3.5">
                        <Skeleton shape="title" className="w-3/5" />
                        <SpecsSkeleton count={4} />
                        <Skeleton shape="line" className="w-1/2" />
                        <Skeleton shape="line" className="w-28" />
                    </span>
                    <span className="flex flex-col gap-2 max-desktop:mt-5 desktop:col-start-3 desktop:row-start-1 desktop:grid desktop:h-title-line desktop:auto-cols-fr desktop:grid-flow-col desktop:content-center desktop:gap-2.5">
                        <span className="flex gap-2.5 desktop:contents">
                            <Skeleton shape="button" className="grow basis-0 desktop:w-44" />
                            <Skeleton shape="button" className="grow basis-0 desktop:w-44" />
                        </span>
                        <Skeleton shape="button" className="desktop:w-44" />
                    </span>
                </div>
            </main>
        </>
    );
}
