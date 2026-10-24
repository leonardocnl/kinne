import type { Metadata } from "next";
import { PageFrame } from "../_components/account/PageFrame";
import { SignIn } from "../_components/account/SignIn";

export const metadata: Metadata = {
    title: "Entrar · Kinne",
    robots: { index: false, follow: false },
};

/** `/entrar`: pedir o código e confirmá-lo (US012). */
export default function SignInPage() {
    return (
        <PageFrame>
            <SignIn />
        </PageFrame>
    );
}
