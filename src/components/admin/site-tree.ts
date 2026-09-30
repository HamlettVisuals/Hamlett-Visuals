import { formatAdminURL } from "payload/shared";

// The admin sidebar's tree (SiteNav.tsx) and the Editor overview page
// (EditorOverview.tsx) both read this one map, so the two never drift apart.
//
// Deliberately a static tree, not derived from payload.config.ts at
// runtime: the page->section grouping (e.g. "Portfolio" spanning one global
// and three collections) has no equivalent in Payload's own config shape,
// so there's nothing to generate this from. If a slug below stops matching
// a real global/collection slug, the link will 404 — that's the tradeoff
// for a hand-authored map instead of a derived one.

export type LeafNode =
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
      // Other pages that count as this one in the sidebar (e.g. a
      // category's or album's edit page for Categories & Albums).
      alsoActiveFor?: `/${string}`[];
    };

export type DisabledNode = {
  disabled: true;
  label: string;
  note: string;
};

export type GroupNode = {
  label: string;
  // Where the label goes. A custom view (Editor) is its own page; a plain
  // grouping (Homepage, Pricing…) has none, so it points at its section
  // on the Editor overview instead (`anchor`).
  path: `/${string}`;
  anchor?: string;
  children: TreeNode[];
};

export type TreeNode = LeafNode | DisabledNode | GroupNode;

export const isGroup = (node: TreeNode): node is GroupNode => "children" in node;
export const isDisabled = (node: TreeNode): node is DisabledNode => "disabled" in node;

const NOT_YET_EDITABLE = "Not yet editable — no CMS content for this page";

export const EDITOR_PATH = "/editor";

// Editor's own branch — everything that edits the public website.
export const editorTree: TreeNode[] = [
  {
    label: "Homepage",
    path: EDITOR_PATH,
    anchor: "homepage",
    children: [
      { kind: "global", slug: "header-nav", label: "Sticky Header" },
      { kind: "global", slug: "hero", label: "Hook" },
      {
        label: "Portfolio",
        path: EDITOR_PATH,
        anchor: "portfolio",
        children: [
          { kind: "global", slug: "categories-intro", label: "Categories Intro" },
          {
            kind: "view",
            path: "/portfolio",
            slug: "portfolio",
            label: "Categories & Albums",
            // Photos have no page of their own any more: they're added in
            // albums, and the rest (unused ones) are at the bottom of
            // Categories & Albums. A photo's own edit page still counts.
            alsoActiveFor: ["/collections/categories", "/collections/events", "/collections/photos"],
          },
        ],
      },
      { kind: "global", slug: "about", label: "About" },
      {
        label: "Pricing",
        path: EDITOR_PATH,
        anchor: "pricing",
        children: [
          { kind: "global", slug: "featured-offer", label: "Featured Offer" },
          { kind: "collection", slug: "pricing-rows", label: "Packages" },
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

export const siteTree: TreeNode[] = [
  // Admin tools first: the kanban board is the admin's home screen
  // (/hv-studio redirects there — see next.config.ts).
  { kind: "view", path: "/kanban", slug: "kanban", label: "Kanban Board" },
  { kind: "collection", slug: "inquiries", label: "Inquiries" },
  { kind: "collection", slug: "users", label: "Users" },
  { label: "Editor", path: EDITOR_PATH, children: editorTree },
];

export function nodeHref(node: LeafNode | GroupNode, adminRoute: string): string {
  if (isGroup(node)) {
    const href = formatAdminURL({ adminRoute, path: node.path });
    return node.anchor ? `${href}#${node.anchor}` : href;
  }
  const path: `/${string}` =
    node.kind === "view"
      ? node.path
      : node.kind === "global"
        ? `/globals/${node.slug}`
        : `/collections/${node.slug}`;
  return formatAdminURL({ adminRoute, path });
}

// Whether `pathname` is this node's own page (or, for a collection, one of
// its documents). Anchor-only groups never match: they aren't a page.
export function isActive(node: LeafNode | GroupNode, pathname: string, adminRoute: string): boolean {
  if (isGroup(node) && node.anchor) return false;
  const under = (href: string) => pathname.startsWith(href) && ["/", undefined].includes(pathname[href.length]);
  if (under(nodeHref(node, adminRoute))) return true;
  return (
    !isGroup(node) &&
    node.kind === "view" &&
    (node.alsoActiveFor ?? []).some((path) => under(formatAdminURL({ adminRoute, path })))
  );
}
