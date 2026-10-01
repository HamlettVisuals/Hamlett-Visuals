"use client";

import { useEffect, useState } from "react";
import type { RelationshipFieldClientComponent, Where } from "payload";
import { SelectInput, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { AVAILABLE_PACKAGE_WHERE } from "@/lib/featured-package";

// The Featured Offer global's "Featured package" field: one dropdown of the
// packages the site can show. Payload's own relationship input has only a
// clear ✕ and long "Title — Category" labels, so this is Payload's
// SelectInput (same look as every other dropdown) over a plain useField on
// the relationship's own path. Save, Undo/Redo/Discard (EditHistory.tsx),
// History and Live Preview treat it exactly like the default input. There's
// no "None": the "Show on homepage" switch above hides the section instead
// (FeaturedOfferSwitchField.tsx).
//
// Options come from lib/featured-package.ts (no hidden or trashed packages,
// none in a hidden or trashed category), in the Packages list's drag order,
// the same rule the field's filterOptions enforces on save. Each is the
// package's name, plus its category when that's different.
//
// A warning under the dropdown says what the site will do when:
//   - the picked package has since become unavailable: it stays selected,
//     marked hidden, and the spotlight doesn't show;
//   - it has no sample photos (no album, a hidden album, one from another
//     category, or an empty one; same rule as lib/pricing-rows.ts
//     sampleAlbumId): the spotlight shows its text without the photo row.
// No warnings while the switch is off, since nothing shows either way.

type PackageOption = {
  id: number;
  title: string;
  category?: { id?: number; name?: string } | number | null;
  album?: { id?: number; published?: boolean; category?: number | { id?: number } | null } | number | null;
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

const idOf = (value: unknown) =>
  typeof value === "object" && value !== null ? (value as { id?: number }).id : (value as number | undefined);

// The album the spotlight would take photos from, or null.
function sampleAlbum(row: PackageOption): number | null {
  const album = row.album;
  if (typeof album !== "object" || album === null || !album.published) return null;
  if (idOf(album.category) !== idOf(row.category)) return null;
  return album.id ?? null;
}

function packageLabel(row: PackageOption) {
  const categoryName = typeof row.category === "object" ? row.category?.name?.trim() : undefined;
  const title = row.title?.trim() || "Untitled package";
  return categoryName && categoryName.toLowerCase() !== title.toLowerCase()
    ? `${title} — ${categoryName}`
    : title;
}

const FeaturedPackageField: RelationshipFieldClientComponent = ({ field, path, readOnly }) => {
  const { config } = useConfig();
  const { value, setValue, showError } = useField<number | string | null>({ path });
  const showOnHomepage = useFormFields(([fields]) => fields.showOnHomepage?.value);
  const [packages, setPackages] = useState<PackageOption[] | null>(null);
  // Album id → whether it has photos.
  const [albumHasPhotos, setAlbumHasPhotos] = useState<Record<number, boolean>>({});
  const [hiddenTitle, setHiddenTitle] = useState<Record<string, string>>({});
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    const params = whereParams(AVAILABLE_PACKAGE_WHERE);
    params.set("sort", "_order"); // the Packages list's drag order
    params.set("limit", "100");
    params.set("depth", "1");
    params.set("select[title]", "true");
    params.set("select[category]", "true");
    params.set("select[album]", "true");
    params.set("populate[categories][name]", "true");
    params.set("populate[events][published]", "true");
    params.set("populate[events][category]", "true");
    fetch(`${apiBase}/pricing-rows?${params}`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then(async (body: { docs?: PackageOption[] } | null) => {
        const docs = body?.docs ?? [];
        if (cancelled) return;
        setPackages(docs);
        const albums = [...new Set(docs.map(sampleAlbum).filter((id): id is number => id !== null))];
        if (!albums.length) return;
        const photoParams = new URLSearchParams({ "where[event][in]": albums.join(","), limit: "1000", depth: "0", "select[event]": "true" });
        const photos = await fetch(`${apiBase}/photos?${photoParams}`, { credentials: "include" })
          .then((res) => (res.ok ? res.json() : null))
          .catch(() => null);
        if (cancelled || !photos?.docs) return;
        const withPhotos = new Set((photos.docs as { event?: unknown }[]).map((p) => idOf(p.event)));
        setAlbumHasPhotos(Object.fromEntries(albums.map((id) => [id, withPhotos.has(id)])));
      })
      .catch(() => {
        if (!cancelled) setPackages([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiBase]);

  // A populated relationship arrives as an object in some form states.
  const raw = idOf(value);
  const selected = raw === null || raw === undefined || (raw as unknown) === "" ? "" : String(raw);
  const picked = packages?.find((row) => String(row.id) === selected);
  const unavailable = Boolean(packages && selected && !picked);

  // The name of a picked package that's no longer in the list.
  useEffect(() => {
    if (!unavailable || hiddenTitle[selected] !== undefined) return;
    let cancelled = false;
    fetch(`${apiBase}/pricing-rows/${selected}?depth=0&trash=true&select[title]=true`, { credentials: "include" })
      .then((res) => (res.ok ? res.json() : null))
      .then((doc: { title?: string } | null) => {
        if (!cancelled) setHiddenTitle((prev) => ({ ...prev, [selected]: doc?.title?.trim() || "" }));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiBase, unavailable, selected, hiddenTitle]);

  const options = (packages ?? []).map((row) => ({ label: packageLabel(row), value: String(row.id) }));
  if (unavailable) {
    options.push({ label: `${hiddenTitle[selected] || "A package"} (hidden on your site)`, value: selected });
  }

  const warnings: string[] = [];
  if (showOnHomepage !== false && packages) {
    if (!selected) {
      warnings.push("No package picked, so the spotlight won't show on your site.");
    } else if (unavailable) {
      warnings.push(
        "This package (or its category) is hidden on your site or in the Trash, so the spotlight won't show. Pick another, or show the package again.",
      );
    } else if (picked) {
      const album = sampleAlbum(picked);
      if (album === null || albumHasPhotos[album] === false) {
        warnings.push(
          album === null
            ? "This package has no album for sample photos, so the spotlight shows its text only, without photos."
            : "This package's album has no photos yet, so the spotlight shows its text only, without photos.",
        );
      }
    }
  }

  return (
    <div className="featured-package-field">
      <SelectInput
        name={field.name}
        path={path}
        label={field.label || "Featured package"}
        description={field.admin?.description}
        options={options}
        value={selected}
        isClearable={false}
        readOnly={readOnly || packages === null}
        placeholder={packages === null ? "Loading packages…" : "Pick a package…"}
        showError={showError}
        onChange={(option) => {
          const next = Array.isArray(option) ? option[0] : option;
          if (typeof next?.value === "string" && next.value) setValue(Number(next.value));
        }}
      />
      {warnings.map((warning) => (
        <p key={warning} className="featured-package-field__warning" role="status">
          {warning}
        </p>
      ))}
    </div>
  );
};

export default FeaturedPackageField;
