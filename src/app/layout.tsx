import type { Metadata } from "next";
import { Darker_Grotesque, Manrope } from "next/font/google";
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
            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
