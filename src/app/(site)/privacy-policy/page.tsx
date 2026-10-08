import { legalMetadata, renderLegalPage } from "@/lib/legal-route";

// Privacy Policy: written in the studio (Editor > Legal > Privacy Policy,
// globals/LegalPages.ts). Not on the site until it has text.

export const generateMetadata = () => legalMetadata("/privacy-policy");

export default function PrivacyPolicyPage() {
  return renderLegalPage("/privacy-policy");
}
