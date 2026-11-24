import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Privacy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy">
      <h2>What we collect</h2>
      <p>Your name, email address and password (stored securely by our authentication provider), and the shows, episodes and settings you add to Ospod.</p>
      <h2>How we use it</h2>
      <p>To run your account, publish your podcast where you ask us to, and show you your analytics. We don't sell your data.</p>
      <h2>Who processes it</h2>
      <p>We use trusted providers to run Ospod, including Supabase (database and sign-in) and Netlify (website hosting). Each new provider will be listed here before we use it.</p>
      <h2>Your choices</h2>
      <p>You can update your details in Settings, and ask us to export or delete your data at any time.</p>
    </LegalPage>
  );
}
