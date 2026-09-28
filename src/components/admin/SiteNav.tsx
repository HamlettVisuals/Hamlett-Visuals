"use client";

import React, { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";
import { ChevronIcon, Link, Logout, useConfig } from "@payloadcms/ui";
import { NavHamburger, NavWrapper } from "@payloadcms/next/client";
import {
  isActive,
  isDisabled,
  isGroup,
  nodeHref,
  siteTree,
  type GroupNode,
  type TreeNode,
} from "./site-tree";

const baseClass = "nav";

// Replaces Payload's default Nav (grouped alphabetically by admin.group)
// with a fixed tree that mirrors the real site's page structure: admin
// tools at the top, then "Editor" with the site's pages and their editable
// sections nested underneath. The tree itself lives in site-tree.ts,
// shared with the Editor overview page.
//
// Every row is [chevron | label]: the label always navigates, the chevron
// only expands/collapses. Leaves get an empty chevron-sized slot so labels
// at the same depth line up. Styles: .site-nav in admin-overrides.css.

// Which branches are open, kept outside React so it survives the Nav
// remounting as each admin view renders its own template. Lives only for
// this tab's JS session: a full reload starts again from just the current
// page's ancestors. `mergedFor` is the pathname whose ancestors have
// already been opened, so the user can still collapse them afterwards.
type ExpandState = { open: ReadonlySet<string>; mergedFor: string };
let expandState: ExpandState | null = null;
const listeners = new Set<() => void>();

function setExpandState(next: ExpandState) {
  expandState = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const groupId = (parentId: string, node: GroupNode) =>
  parentId ? `${parentId}/${node.label}` : node.label;

// Ids of every group above the node whose page is `pathname`.
function activeAncestors(nodes: TreeNode[], pathname: string, adminRoute: string, parentId = ""): string[] {
  for (const node of nodes) {
    if (isDisabled(node)) continue;
    if (isGroup(node)) {
      const id = groupId(parentId, node);
      const below = activeAncestors(node.children, pathname, adminRoute, id);
      if (below.length || node.children.some((c) => !isDisabled(c) && !isGroup(c) && isActive(c, pathname, adminRoute))) {
        return [id, ...below];
      }
    }
  }
  return [];
}

type RowProps = {
  node: TreeNode;
  depth: number;
  parentId: string;
  adminRoute: string;
  pathname: string;
  open: ReadonlySet<string>;
  onToggle: (id: string) => void;
};

function NavRow({ node, depth, parentId, adminRoute, pathname, open, onToggle }: RowProps) {
  const style = { "--site-nav-depth": depth } as React.CSSProperties;

  if (isDisabled(node)) {
    return (
      <li>
        <div className="site-nav__row site-nav__row--disabled" style={style} title={node.note} aria-disabled="true">
          <span className="site-nav__chevron-slot" aria-hidden="true" />
          <span className="site-nav__label">{node.label}</span>
          <span className="site-nav__note">Not yet editable</span>
        </div>
      </li>
    );
  }

  const active = isActive(node, pathname, adminRoute);
  const id = isGroup(node) ? groupId(parentId, node) : "";
  const expanded = isGroup(node) && open.has(id);
  const listId = `site-nav-${id.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;

  return (
    <li>
      <div className={`site-nav__row${active ? " site-nav__row--active" : ""}`} style={style}>
        {isGroup(node) ? (
          <button
            type="button"
            className="site-nav__chevron-slot site-nav__chevron"
            aria-expanded={expanded}
            aria-controls={listId}
            aria-label={`${expanded ? "Collapse" : "Expand"} ${node.label}`}
            onClick={() => onToggle(id)}
          >
            <ChevronIcon direction={expanded ? "down" : "right"} />
          </button>
        ) : (
          <span className="site-nav__chevron-slot" aria-hidden="true" />
        )}
        <Link
          className="site-nav__label"
          href={nodeHref(node, adminRoute) as `/${string}`}
          aria-current={active ? "page" : undefined}
          prefetch={false}
        >
          {node.label}
        </Link>
      </div>
      {isGroup(node) && (
        <ul className="site-nav__list" id={listId} hidden={!expanded}>
          {node.children.map((child, i) => (
            <NavRow
              key={i}
              node={child}
              depth={depth + 1}
              parentId={id}
              adminRoute={adminRoute}
              pathname={pathname}
              open={open}
              onToggle={onToggle}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function SiteNav() {
  const { config } = useConfig();
  const adminRoute = config.routes.admin;
  const pathname = usePathname();

  // null on the server and during hydration, so both render the same
  // ancestors-only tree; the stored state takes over right after.
  const stored = useSyncExternalStore(subscribe, () => expandState, () => null);
  const ancestors = activeAncestors(siteTree, pathname, adminRoute);
  const open: ReadonlySet<string> =
    stored?.mergedFor === pathname ? stored.open : new Set([...(stored?.open ?? []), ...ancestors]);

  // Commit the current page's ancestors once per navigation (the render
  // above already shows them open, so there's no flash of a closed branch).
  useEffect(() => {
    if (expandState?.mergedFor !== pathname) {
      setExpandState({ open: new Set([...(expandState?.open ?? []), ...ancestors]), mergedFor: pathname });
    }
  });

  const onToggle = (id: string) => {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setExpandState({ open: next, mergedFor: pathname });
  };

  return (
    <NavWrapper baseClass={baseClass}>
      <nav className={`${baseClass}__wrap`}>
        <ul className="site-nav site-nav__list">
          {siteTree.map((node, i) => (
            <NavRow
              key={i}
              node={node}
              depth={0}
              parentId=""
              adminRoute={adminRoute}
              pathname={pathname}
              open={open}
              onToggle={onToggle}
            />
          ))}
        </ul>
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
