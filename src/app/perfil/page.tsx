import type { Metadata } from "next";
import { PageFrame } from "../_components/account/PageFrame";
import { Profile } from "../_components/account/Profile";

export const metadata: Metadata = {
    title: "Seu perfil · Kinne",
    robots: { index: false, follow: false },
};

/** `/perfil`: o que o Kinne guarda e o que dá para fazer com isso (US014). */
export default function ProfilePage() {
    return (
        <PageFrame>
            <Profile />
        </PageFrame>
    );
}
