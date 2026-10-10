import type { Metadata } from "next";
import { TextLink } from "../_components/ui/TextLink";
import { Wordmark } from "../_components/ui/Wordmark";
import { Colors } from "./_sections/Colors";
import { Components } from "./_sections/Components";
import { Cover } from "./_sections/Cover";
import { Motion } from "./_sections/Motion";
import { Rules } from "./_sections/Rules";
import { sectionNumber, sections } from "./_sections/Section";
import { Shape } from "./_sections/Shape";
import { Space } from "./_sections/Space";
import { Typography } from "./_sections/Typography";

export const metadata: Metadata = {
    title: "Sistema de design · Kinne",
    robots: { index: false, follow: false },
};

export default function DesignPage() {
    return (
        <div className="mx-auto grid w-full max-w-page gap-x-10 px-gutter py-8 desktop:grid-cols-12">
            <aside className="flex flex-col gap-6 pb-8 desktop:sticky desktop:top-0 desktop:col-span-2 desktop:h-dvh desktop:self-start desktop:pt-2">
                <Wordmark className="self-start" />
                <nav aria-label="Seções">
                    <ol className="flex flex-wrap gap-x-5 desktop:flex-col">
                        {sections.map((section, index) => (
                            <li key={section.id}>
                                <TextLink href={`#${section.id}`}>
                                    <span className="text-caption text-faint">
                                        {sectionNumber(index)}
                                    </span>
                                    {section.title}
                                </TextLink>
                            </li>
                        ))}
                    </ol>
                </nav>
            </aside>
            <main className="flex min-w-0 flex-col gap-16 desktop:col-span-10">
                <Cover />
                <Colors />
                <Typography />
                <Space />
                <Shape />
                <Motion />
                <Components />
                <Rules />
            </main>
        </div>
    );
}
