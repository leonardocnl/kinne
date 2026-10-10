import { Button } from "../ui/Button";
import { Wordmark } from "../ui/Wordmark";

/** Barra do topo da tela inicial. No celular a data sai daqui e vai para cima do título. */
export function TopBar({ date }: { date?: string }) {
    return (
        <header className="grid grid-cols-3 items-center gap-3 max-desktop:grid-cols-2">
            <Wordmark />
            <p className="justify-self-center text-data whitespace-nowrap text-soft max-desktop:hidden">
                {date}
            </p>
            {/* ainda sem ação: o que "Entrar" faz na semana 0 está pendente (04-mudancas) */}
            <Button variant="ghost" className="justify-self-end">
                Entrar
            </Button>
        </header>
    );
}
