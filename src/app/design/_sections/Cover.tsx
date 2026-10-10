import pkg from "../../../../package.json";
import { designDoc } from "./design-doc";
import { display } from "./Section";

const principles = ["Um amarelo por tela.", "O que se toca é pílula.", "Imagem tem canto reto."];

export function Cover() {
    const version = pkg.version.split(".").slice(0, 2).join(".");
    return (
        <header className="flex flex-col gap-10 desktop:pt-10">
            <p className="flex flex-wrap gap-x-3 text-data text-soft">
                <span>Versão {version}</span>
                <span aria-hidden="true">·</span>
                <span>{designDoc.updated}</span>
            </p>
            <div className="flex flex-col gap-5">
                <h1 className={`${display} max-w-measure text-title`}>Kinne — Sistema de design</h1>
                <p className="max-w-measure text-tagline text-soft">
                    Tokens, componentes e regras do estilo KinneMix
                </p>
            </div>
            <ol aria-label="Princípios" className="grid border-t border-line desktop:grid-cols-3">
                {principles.map((principle, index) => (
                    <li
                        key={principle}
                        className="flex gap-4 border-b border-line py-5 desktop:border-b-0 desktop:pr-6"
                    >
                        <span className="text-caption text-faint">0{index + 1}</span>
                        <span className={`${display} text-shot`}>{principle}</span>
                    </li>
                ))}
            </ol>
        </header>
    );
}
