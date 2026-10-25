import type { Metadata } from "next";
import { Darker_Grotesque, Manrope } from "next/font/google";
import { InputModality } from "./_components/InputModality";
import { TMDB_IMAGE_ORIGIN } from "./_components/ui/tmdb-sources";
import "./globals.css";

const darkerGrotesque = Darker_Grotesque({
    variable: "--font-darker-grotesque",
    weight: "500",
    subsets: ["latin"],
});

const manrope = Manrope({
    variable: "--font-manrope",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Kinne",
    description: "Um filme ou série por vez, só entre os streamings que você assina no Brasil.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="pt-BR"
            className={`${darkerGrotesque.variable} ${manrope.variable} h-full antialiased`}
        >
            <head>
                {/* a imagem grande de cada tela vem do TMDB: a conexão abre antes de o HTML pedi-la */}
                <link rel="preconnect" href={TMDB_IMAGE_ORIGIN} />
            </head>
            <body className="flex min-h-full flex-col">
                <InputModality />
                {children}
            </body>
        </html>
    );
}
