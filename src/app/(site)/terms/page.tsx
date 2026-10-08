import { legalMetadata, renderLegalPage } from "@/lib/legal-route";

// Terms & Conditions: written in the studio (Editor > Legal > Terms &
// Conditions, globals/LegalPages.ts). Not on the site until it has text.

export const generateMetadata = () => legalMetadata("/terms");

export default function TermsPage() {
  return renderLegalPage("/terms");
}
