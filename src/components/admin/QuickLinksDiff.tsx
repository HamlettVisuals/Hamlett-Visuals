"use client";

import { destinationLabel, makeLinkListDiff } from "@/components/admin/LinkListDiff";

// History's comparison for About's quick links (globals/About.ts →
// quickLinks): one line per card, "Backstage → Reels & behind the scenes
// (goes to Backstage (page))".
const QuickLinksDiff = makeLinkListDiff(
  (link) =>
    `${link.label ?? ""} → ${link.title ?? ""} (goes to ${destinationLabel(link.href) || "nowhere"})`,
);

export default QuickLinksDiff;
