import type { Metadata } from "next";
import { LegalPage } from "../legal";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <h2>Your content</h2>
      <p>You own your podcast. You give Ospod permission to store, process and distribute it only so we can provide the service you ask for.</p>
      <h2>Using Ospod</h2>
      <p>Only upload content you have the rights to publish. Don't use Ospod for anything unlawful or to harm others.</p>
      <h2>Plans and trials</h2>
      <p>Trials are free and need no card. Paid plans renew monthly or yearly until you cancel.</p>
    </LegalPage>
  );
}
