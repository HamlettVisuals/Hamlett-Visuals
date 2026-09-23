"use client";

import { useSearchParams } from "next/navigation";
import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// Rendered above the document controls on an Inquiry's edit view (wired via
// Inquiries.ts's admin.components.edit.beforeDocumentControls) and above the
// Inquiries list view (via admin.components.beforeList) — the same
// component in both spots, since all it needs is the query param and the
// admin route, nothing view-specific. Only renders when a kanban board
// link sent the visitor here (?from=kanban — DetailDrawer's "Open full
// record", or the board's "Archive" button), so neither view is cluttered
// when reached any other way (search, sidebar nav, etc.).
export default function BackToBoardLink() {
  const searchParams = useSearchParams();
  const { config } = useConfig();

  if (searchParams.get("from") !== "kanban") return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <Link
        href={formatAdminURL({ adminRoute: config.routes.admin, path: "/kanban" }) as `/${string}`}
        prefetch={false}
        style={{ fontSize: 13, color: "var(--theme-text)", textDecoration: "underline" }}
      >
        ← Back to board
      </Link>
    </div>
  );
}
