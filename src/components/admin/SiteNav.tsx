"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { Link, Logout, NavGroup, useConfig } from "@payloadcms/ui";
import { NavHamburger, NavWrapper } from "@payloadcms/next/client";
import { formatAdminURL } from "payload/shared";

const baseClass = "nav";

// Replaces Payload's default Nav (grouped alphabetically by admin.group)
// with a fixed tree that mirrors the real site's page structure: pages at
// the top, their editable sections nested underneath. See DESIGN.md-style
// rationale in the Phase 2 conversation — the sidebar should read as a map
// of hamletvisuals.com, not a list of database tables.
//
// Deliberately a static tree, not derived from payload.config.ts at
// runtime: the page->section grouping (e.g. "Portfolio" spanning one global
// and three collections) has no equivalent in Payload's own config shape,
// so there's nothing to generate this from. If a slug below stops matching
// a real global/collection slug, the link will 404 — that's the tradeoff
// for a hand-authored map instead of a derived one.

type LeafNode =
  | {
      kind: "global" | "collection";
      slug: string;
      label: string;
    }
  | {
      kind: "view";
      // A custom admin.components.views path (e.g. the kanban board),
      // rather than a /collections or /globals route derived from a slug.
      path: `/${string}`;
      slug: string;
      label: string;
    };

type DisabledNode = {
  disabled: true;
  label: string;
  note: string;
};

type GroupNode = {
  label: string;
  defaultOpen?: boolean;
  children: TreeNode[];
};

type TreeNode = LeafNode | DisabledNode | GroupNode;

const NOT_YET_EDITABLE = "Not yet editable — no CMS content for this page";

const siteTree: TreeNode[] = [
  // Not part of the site's page map, but first: the kanban board is the
  // admin's home screen (/hv-studio redirects there — see next.config.ts).
  {
    label: "Admin",
    defaultOpen: true,
    children: [
      { kind: "view", path: "/kanban", slug: "kanban", label: "Kanban Board" },
      { kind: "collection", slug: "inquiries", label: "Inquiries" },
      { kind: "collection", slug: "users", label: "Users" },
    ],
  },
  {
    label: "Homepage",
    defaultOpen: true,
    children: [
      { kind: "global", slug: "header-nav", label: "Sticky Header" },
      { kind: "global", slug: "hero", label: "Hook" },
      {
        label: "Portfolio",
        children: [
          { kind: "global", slug: "categories-intro", label: "Categories Intro" },
          { kind: "collection", slug: "categories", label: "Categories" },
          { kind: "collection", slug: "events", label: "Events / Albums" },
          { kind: "collection", slug: "photos", label: "Photos" },
        ],
      },
      { kind: "global", slug: "about", label: "About" },
      {
        label: "Pricing",
        children: [
          { kind: "global", slug: "featured-offer", label: "Featured Offer" },
          { kind: "collection", slug: "pricing-rows", label: "Pricing / Offer Rows" },
        ],
      },
      { kind: "global", slug: "booking-cta", label: "Booking" },
      { kind: "global", slug: "testimonials-teaser", label: "Testimonials Preview" },
      { kind: "global", slug: "final-cta-footer", label: "Footer" },
    ],
  },
  { kind: "collection", slug: "backstage", label: "Backstage" },
  { kind: "collection", slug: "testimonials", label: "Testimonials" },
  { kind: "global", slug: "booking", label: "Booking (page)" },
  { disabled: true, label: "Privacy Policy", note: NOT_YET_EDITABLE },
  { disabled: true, label: "Terms & Conditions", note: NOT_YET_EDITABLE },
  { kind: "global", slug: "site-settings", label: "Site Settings" },
];

function nodeHref(node: LeafNode, adminRoute: string): string {
  const path: `/${string}` =
    node.kind === "view"
      ? node.path
      : node.kind === "global"
        ? `/globals/${node.slug}`
        : `/collections/${node.slug}`;
  return formatAdminURL({ adminRoute, path });
}

function groupContainsPath(node: GroupNode, pathname: string, adminRoute: string): boolean {
  return node.children.some((child) => {
    if ("children" in child) return groupContainsPath(child, pathname, adminRoute);
    if ("disabled" in child) return false;
    return pathname.startsWith(nodeHref(child, adminRoute));
  });
}

function NavLeaf({ node, adminRoute, pathname }: {
  node: LeafNode;
  adminRoute: string;
  pathname: string;
}) {
  const href = nodeHref(node, adminRoute);
  const isActive =
    pathname.startsWith(href) && ["/", undefined].includes(pathname[href.length]);

  const label = (
    <>
      {isActive && <div className={`${baseClass}__link-indicator`} />}
      <span className={`${baseClass}__link-label`}>{node.label}</span>
    </>
  );

  if (pathname === href) {
    return (
      <div className={`${baseClass}__link`} id={`nav-${node.slug}`}>
        {label}
      </div>
    );
  }

  return (
    <Link className={`${baseClass}__link`} href={href as `/${string}`} id={`nav-${node.slug}`} prefetch={false}>
      {label}
    </Link>
  );
}

function NavDisabled({ node }: { node: DisabledNode }) {
  return (
    <div
      className={`${baseClass}__link`}
      title={node.note}
      aria-disabled="true"
      style={{ cursor: "default", opacity: 0.5 }}
    >
      <span className={`${baseClass}__link-label`}>{node.label}</span>
      <span
        style={{
          marginLeft: 8,
          fontSize: "0.75rem",
          fontStyle: "italic",
          color: "var(--theme-elevation-400)",
        }}
      >
        Not yet editable
      </span>
    </div>
  );
}

function NavNode({ node, adminRoute, pathname }: {
  node: TreeNode;
  adminRoute: string;
  pathname: string;
}) {
  if ("disabled" in node) return <NavDisabled node={node} />;
  if ("children" in node) {
    const isOpen = node.defaultOpen || groupContainsPath(node, pathname, adminRoute);
    return (
      <NavGroup label={node.label} isOpen={isOpen}>
        {node.children.map((child, i) => (
          <NavNode key={i} node={child} adminRoute={adminRoute} pathname={pathname} />
        ))}
      </NavGroup>
    );
  }
  return <NavLeaf node={node} adminRoute={adminRoute} pathname={pathname} />;
}

export default function SiteNav() {
  const { config } = useConfig();
  const adminRoute = config.routes.admin;
  const pathname = usePathname();

  return (
    <NavWrapper baseClass={baseClass}>
      <nav className={`${baseClass}__wrap`}>
        {siteTree.map((node, i) => (
          <NavNode key={i} node={node} adminRoute={adminRoute} pathname={pathname} />
        ))}
        <div className={`${baseClass}__controls`}>
          <Logout />
        </div>
      </nav>
      <div className={`${baseClass}__header`}>
        <div className={`${baseClass}__header-content`}>
          <NavHamburger baseClass={baseClass} />
        </div>
      </div>
    </NavWrapper>
  );
}
