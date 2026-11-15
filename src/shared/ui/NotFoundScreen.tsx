import { StateScreen } from "@/shared/ui/StateScreen";
import { AsciiArt } from "@/shared/ui/LiveHorizon";
import { ButtonLink } from "./Button";

export function NotFoundScreen({ heading, text }: { heading: string; text: string }) {
    return (
        <StateScreen
            heading={heading}
            text={text}
            art={<AsciiArt text="404" tone="signal" drift className="absolute inset-0 size-full" />}
            action={
                <ButtonLink variant="primary" href="/">
                    Voltar ao início
                </ButtonLink>
            }
        />
    );
}
