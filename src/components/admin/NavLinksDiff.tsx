"use client";

import type { ArrayFieldDiffClientComponent } from "payload";
import {
  escapeDiffHTML,
  FieldDiffContainer,
  getHTMLDiffComponents,
  unescapeDiffHTML,
  useTranslation,
} from "@payloadcms/ui";
import { navDestinations } from "@/lib/nav-destinations";

// History's comparison for the Header/Nav links (globals/HeaderNav.ts →
// navLinks). Payload's default labels each array row "Item 01", "Item 02"
// with no way to override it, so this shows each version's menu as one line
// per link — "Portfolio → Portfolio (homepage section)" — and highlights
// what changed between them.

type NavLink = { label?: string | null; href?: string | null };

function toHTML(value: unknown): string {
  const links = Array.isArray(value) ? (value as NavLink[]) : [];
  if (links.length === 0) return "<p>(no links)</p>";
  return links
    .map((link) => {
      const destination =
        navDestinations.find((d) => d.value === link.href)?.label ?? link.href ?? "";
      return `<p>${escapeDiffHTML(`${link.label ?? ""} → ${destination}`)}</p>`;
    })
    .join("");
}

const NavLinksDiff: ArrayFieldDiffClientComponent = ({
  comparisonValue,
  versionValue,
  field,
  locale,
  nestingLevel,
}) => {
  const { i18n } = useTranslation();
  const { From, To } = getHTMLDiffComponents({
    fromHTML: toHTML(comparisonValue),
    toHTML: toHTML(versionValue),
    postProcess: unescapeDiffHTML,
  });
  return (
    <FieldDiffContainer
      className="nav-links-diff"
      From={From}
      To={To}
      i18n={i18n}
      label={{ label: field.label, locale }}
      nestingLevel={nestingLevel}
    />
  );
};

export default NavLinksDiff;
