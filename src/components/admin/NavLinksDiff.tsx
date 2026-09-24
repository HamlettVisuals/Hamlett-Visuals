"use client";

import { destinationLabel, makeLinkListDiff } from "@/components/admin/LinkListDiff";

// History's comparison for the Header/Nav links (globals/HeaderNav.ts →
// navLinks): one line per link, "Portfolio → Portfolio (homepage section)".
const NavLinksDiff = makeLinkListDiff(
  (link) => `${link.label ?? ""} → ${destinationLabel(link.href)}`,
);

export default NavLinksDiff;
