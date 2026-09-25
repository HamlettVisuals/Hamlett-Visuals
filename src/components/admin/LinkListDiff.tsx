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

// History's comparison for a link list (Header/Nav's menu links, About's
// quick links) or a package's features. Payload's default labels each array row "Item 01",
// "Item 02" with no way to override it, so this shows each version's list
// as one readable line per link and highlights what changed between them.

export type LinkRow = {
  label?: string | null;
  title?: string | null;
  href?: string | null;
  text?: string | null;
};

export const destinationLabel = (href: string | null | undefined) =>
  navDestinations.find((d) => d.value === href)?.label ?? href ?? "";

function toHTML(value: unknown, toLine: (link: LinkRow) => string, empty: string): string {
  const links = Array.isArray(value) ? (value as LinkRow[]) : [];
  if (links.length === 0) return `<p>${escapeDiffHTML(empty)}</p>`;
  return links.map((link) => `<p>${escapeDiffHTML(toLine(link))}</p>`).join("");
}

export function makeLinkListDiff(
  toLine: (link: LinkRow) => string,
  empty = "(no links)",
): ArrayFieldDiffClientComponent {
  const LinkListDiff: ArrayFieldDiffClientComponent = ({
    comparisonValue,
    versionValue,
    field,
    locale,
    nestingLevel,
  }) => {
    const { i18n } = useTranslation();
    const { From, To } = getHTMLDiffComponents({
      fromHTML: toHTML(comparisonValue, toLine, empty),
      toHTML: toHTML(versionValue, toLine, empty),
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
  return LinkListDiff;
}
