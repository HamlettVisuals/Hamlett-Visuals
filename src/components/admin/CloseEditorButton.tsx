"use client";

import { usePathname } from "next/navigation";
import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// The ✕ in the top bar of a website-collection editor (Categories, Events,
// Photos, Pricing Rows, Testimonials, Backstage), returning to that
// collection's own list. Wired up per collection via
// admin.components.views.edit.default.actions, which Payload renders in the
// app header next to the breadcrumbs, away from the Save/Undo bar that's
// already full on phones.
//
// Same approach as BackToBoardLink.tsx: a plain Payload <Link>, not a
// router.push(). Payload's LeaveWithoutSaving intercepts clicks on any
// anchor while the form has unsaved changes and shows its "Leave without
// saving" dialog, so this gets that warning for free instead of silently
// discarding edits. The collection comes from the URL, so one component
// serves every collection with no per-collection props.
export default function CloseEditorButton() {
  const { config } = useConfig();
  const pathname = usePathname() ?? "";
  const collectionsBase = formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/" });
  if (!pathname.startsWith(collectionsBase)) return null;

  const slug = pathname.slice(collectionsBase.length).split("/")[0];
  const collection = config.collections.find((c) => c.slug === slug);
  if (!collection) return null;

  const plural = collection.labels?.plural;
  const label = `Back to ${typeof plural === "string" ? plural : slug}`;

  return (
    <Link
      href={formatAdminURL({ adminRoute: config.routes.admin, path: `/collections/${slug}` }) as `/${string}`}
      prefetch={false}
      className="close-editor-button"
      aria-label={label}
      title={label}
    >
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false">
        <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" fill="none" />
      </svg>
    </Link>
  );
}
