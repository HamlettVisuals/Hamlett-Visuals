"use client";

import { useEffect, useState } from "react";
import type { RelationshipFieldClientComponent, Where } from "payload";
import { SelectInput, useConfig, useField } from "@payloadcms/ui";
import { AVAILABLE_PACKAGE_WHERE } from "@/lib/featured-package";

// The Featured Offer global's "Featured package" field: one dropdown of the
// packages the site can show, with "None" first to hide the section.
// Payload's own relationship input has only a clear ✕, no "None" choice, so
// this is Payload's SelectInput (same look as every other dropdown) over a
// plain useField on the relationship's own path. Save, Undo/Redo/Discard
// (EditHistory.tsx), History and Live Preview treat it exactly like the
// default input.
//
// Options come from lib/featured-package.ts (no trashed packages, none in a
// hidden or trashed category), the same rule the field's filterOptions
// enforces on save. A package picked earlier that has since become
// unavailable stays selected, labelled as hidden, so it's clear why the
// section isn't showing.

type PackageOption = {
  id: number;
  title: string;
  category?: { name?: string } | number | null;
};

// Payload's REST API reads `where` in qs's bracket form.
function whereParams(where: Where, prefix = "where", params = new URLSearchParams()) {
  for (const [key, value] of Object.entries(where)) {
    const path = `${prefix}[${key}]`;
    if (value !== null && typeof value === "object") whereParams(value as Where, path, params);
    else params.append(path, String(value));
  }
  return params;
}

const NONE = "none";

const FeaturedPackageField: RelationshipFieldClientComponent = ({ field, path, readOnly }) => {
  const { config } = useConfig();
  const { value, setValue, showError } = useField<number | string | null>({ path });
  const [packages, setPackages] = useState<PackageOption[] | null>(null);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    const params = whereParams(AVAILABLE_PACKAGE_WHERE);
    params.set("sort", "order");
    params.set("limit", "100");
    params.set("depth", "1");
    params.set("select[title]", "true");
    params.set("select[category]", "true");
    params.set("populate[categories][name]", "true");
    fetch(`${apiBase}/pricing-rows?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((body: { docs?: PackageOption[] } | null) => {
        if (!cancelled) setPackages(body?.docs ?? []);
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  // A populated relationship arrives as an object in some form states.
  const raw = value !== null && typeof value === "object" ? (value as { id?: number }).id : value;
  const selected = raw === null || raw === undefined || raw === "" ? NONE : String(raw);

  const options = [
    { label: "None", value: NONE },
    ...(packages ?? []).map((row) => {
      const categoryName = typeof row.category === "object" ? row.category?.name : undefined;
      return {
        label: categoryName ? `${row.title} — ${categoryName}` : row.title,
        value: String(row.id),
      };
    }),
  ];
  if (packages && selected !== NONE && !options.some((o) => o.value === selected)) {
    options.push({
      label: "Unavailable package (hidden on your site) — pick another or None",
      value: selected,
    });
  }

  return (
    <SelectInput
      className="featured-package-field"
      name={field.name}
      path={path}
      label={field.label || "Featured package"}
      description={field.admin?.description}
      options={options}
      value={selected}
      isClearable={false}
      readOnly={readOnly || packages === null}
      placeholder={packages === null ? "Loading packages…" : undefined}
      showError={showError}
      onChange={(option) => {
        const picked = Array.isArray(option) ? option[0] : option;
        const next = typeof picked?.value === "string" ? picked.value : NONE;
        setValue(next === NONE ? null : Number(next));
      }}
    />
  );
};

export default FeaturedPackageField;
