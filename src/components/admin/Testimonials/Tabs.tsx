"use client";

import { usePathname } from "next/navigation";
import { Link, useConfig } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// All / Needs review / Page settings / Trash: on the grouped list
// (index.tsx), Payload's own Trash list for testimonials (Testimonials.ts
// beforeList) and the Testimonials Page global (TestimonialsPage.ts).
// Styles: .portfolio__tabs in admin-overrides.css, same as Categories &
// Albums.

export type TestimonialsTab = "all" | "review" | "page" | "trash";

export default function TestimonialsTabs({ current, reviewCount }: { current: TestimonialsTab; reviewCount?: number }) {
  const { config } = useConfig();
  const href = (path: `/${string}`) => formatAdminURL({ adminRoute: config.routes.admin, path });
  const tab = (key: TestimonialsTab, label: string, path: `/${string}`) => (
    <Link href={href(path)} prefetch={false} aria-current={current === key ? "page" : undefined}>
      {label}
    </Link>
  );
  return (
    <nav className="portfolio__tabs testimonials__tabs" aria-label="Testimonials">
      {tab("all", "All", "/testimonials")}
      {tab("review", reviewCount ? `Needs review (${reviewCount})` : "Needs review", "/testimonials?view=review")}
      {tab("page", "Page settings", "/globals/testimonials-page")}
      {tab("trash", "Trash", "/collections/testimonials/trash")}
    </nav>
  );
}

/** Above Payload's Trash list (and nowhere else that list shows, e.g. a picker drawer). */
export function TrashTabs() {
  const pathname = usePathname();
  if (!pathname?.endsWith("/collections/testimonials/trash")) return null;
  return (
    <div className="testimonials__tabs-row">
      <TestimonialsTabs current="trash" />
    </div>
  );
}

/** At the top of the Testimonials Page global's form. */
export function PageSettingsTabs() {
  return (
    <div className="testimonials__tabs-row testimonials__tabs-row--form">
      <TestimonialsTabs current="page" />
    </div>
  );
}
