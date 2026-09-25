import { getPayload } from "payload";
import config from "#src/payload.config.ts";
import { LEGAL_HREFS } from "#src/lib/footer-limits.ts";

// One-time carry-over for the footer: Privacy Policy and Terms moved out of
// the editable "Footer links" into a fixed row beside the copyright line
// (components/Footer.tsx). Removes any saved links to those pages and keeps
// the rest in their order. Does nothing while the footer has never been
// saved (the site then shows the field's defaults, which already leave them
// out). Run with
// `payload run src/scripts/carryOverFooterLegalLinks.ts --disable-transpile`.
async function carryOver() {
  const payload = await getPayload({ config });

  const footer = await payload.findGlobal({ slug: "final-cta-footer", depth: 0 });
  if (!footer.id) {
    payload.logger.info("[carryOverFooterLegalLinks] The footer has never been saved — nothing to carry over.");
  } else {
    const links = footer.footerNav ?? [];
    const kept = links.filter((link) => !LEGAL_HREFS.includes(link.href));
    if (kept.length === links.length) {
      payload.logger.info("[carryOverFooterLegalLinks] No saved links to the legal pages — nothing to change.");
    } else {
      await payload.updateGlobal({
        slug: "final-cta-footer",
        data: { footerNav: kept.map(({ label, href }) => ({ label, href })) },
      });
      payload.logger.info(
        `[carryOverFooterLegalLinks] Kept ${kept.map((link) => `"${link.label}"`).join(", ")}.`,
      );
    }
  }

  await payload.destroy();
  process.exit(0);
}

await carryOver();
