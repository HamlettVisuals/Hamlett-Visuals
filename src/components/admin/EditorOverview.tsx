import type { AdminViewServerProps } from "payload";
import Link from "next/link";
import { redirect } from "next/navigation";
import { formatAdminURL } from "payload/shared";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { Gutter, SetStepNav } from "@payloadcms/ui";
import { adminLoginURL } from "@/lib/admin-redirect";
import {
  EDITOR_PATH,
  editorTree,
  isDisabled,
  isGroup,
  nodeHref,
  type GroupNode,
  type TreeNode,
} from "./site-tree";

// Registered at admin.components.views.editor in payload.config.ts (path
// "/editor"): what the sidebar's "Editor" label opens. Like Payload's
// original dashboard, a page of links to everything editable — here grouped
// exactly as the sidebar's Editor branch is (both read site-tree.ts).
// Wrapped in DefaultTemplate for the same reason as KanbanBoard/index.tsx.
// Styles: .editor-overview in admin-overrides.css.

const baseClass = "editor-overview";

function Tile({ node, adminRoute }: { node: TreeNode; adminRoute: string }) {
  if (isDisabled(node)) {
    return (
      <div className={`${baseClass}__tile ${baseClass}__tile--disabled`} title={node.note}>
        <span className={`${baseClass}__tile-title`}>{node.label}</span>
        <span className={`${baseClass}__tile-note`}>Not yet editable</span>
      </div>
    );
  }
  if (isGroup(node)) {
    // A nested group (Portfolio, Pricing): one tile listing its sections.
    return (
      <div className={`${baseClass}__tile ${baseClass}__tile--group`} id={node.anchor}>
        <span className={`${baseClass}__tile-title`}>{node.label}</span>
        <ul className={`${baseClass}__sublinks`}>
          {node.children.map((child, i) => (
            <li key={i}>
              {isGroup(child) || isDisabled(child) ? (
                <Tile node={child} adminRoute={adminRoute} />
              ) : (
                <Link href={nodeHref(child, adminRoute)} prefetch={false}>
                  {child.label}
                </Link>
              )}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return (
    <Link className={`${baseClass}__tile ${baseClass}__tile--link`} href={nodeHref(node, adminRoute)} prefetch={false}>
      <span className={`${baseClass}__tile-title`}>{node.label}</span>
    </Link>
  );
}

function Section({ title, anchor, nodes, adminRoute }: {
  title: string;
  anchor?: string;
  nodes: TreeNode[];
  adminRoute: string;
}) {
  return (
    <section className={`${baseClass}__section`} id={anchor}>
      <h2 className={`${baseClass}__heading`}>{title}</h2>
      <ul className={`${baseClass}__grid`}>
        {nodes.map((node, i) => (
          <li key={i}>
            <Tile node={node} adminRoute={adminRoute} />
          </li>
        ))}
      </ul>
    </section>
  );
}

export default async function EditorOverviewView(props: AdminViewServerProps) {
  const { payload, params, searchParams, initPageResult } = props;
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { user, i18n } = req;
  const adminRoute = payload.config.routes.admin;

  if (!user) {
    redirect(adminLoginURL(formatAdminURL({ adminRoute, path: EDITOR_PATH })));
  }

  // Top-level groups (Homepage) get their own section; the standalone
  // pages and settings after them share one.
  const groups = editorTree.filter(isGroup) as GroupNode[];
  const standalone = editorTree.filter((node) => !isGroup(node));

  return (
    <DefaultTemplate
      i18n={i18n}
      locale={locale}
      params={params}
      payload={payload}
      permissions={permissions}
      req={req}
      searchParams={searchParams}
      user={user}
      viewType="editor-overview"
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      <SetStepNav nav={[{ label: "Editor" }]} />
      <Gutter className={baseClass}>
        <h1 className={`${baseClass}__title`}>Editor</h1>
        <p className={`${baseClass}__intro`}>Everything on the website you can edit.</p>
        {groups.map((group) => (
          <Section
            key={group.label}
            title={group.label}
            anchor={group.anchor}
            nodes={group.children}
            adminRoute={adminRoute}
          />
        ))}
        {standalone.length > 0 && (
          <Section title="Other pages & settings" nodes={standalone} adminRoute={adminRoute} />
        )}
      </Gutter>
    </DefaultTemplate>
  );
}
