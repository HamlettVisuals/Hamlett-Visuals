"use client";

import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// "All" / "Trash" on the Categories & Albums page and its Trash tab
// (styles: .portfolio__tabs in admin-overrides.css).
export default function PortfolioTabs({ current }: { current: "all" | "trash" }) {
  const { config } = useConfig();
  const tab = (key: "all" | "trash", label: string, path: `/${string}`) => (
    <Link
      href={formatAdminURL({ adminRoute: config.routes.admin, path })}
      prefetch={false}
      aria-current={current === key ? "page" : undefined}
    >
      {label}
    </Link>
  );
  return (
    <nav className="portfolio__tabs" aria-label="Categories & Albums">
      {tab("all", "All", "/portfolio")}
      {tab("trash", "Trash", "/portfolio/trash")}
    </nav>
  );
}
