import type { Metadata } from "next";
import { PageFrame } from "../_components/account/PageFrame";
import { Onboarding } from "../_components/account/Onboarding";

export const metadata: Metadata = {
    title: "Boas-vindas · Kinne",
    robots: { index: false, follow: false },
};

/** `/boas-vindas`: o onboarding, depois do primeiro acesso e quando o perfil pede (US013). */
export default function OnboardingPage() {
    return (
        <PageFrame>
            <Onboarding />
        </PageFrame>
    );
}
