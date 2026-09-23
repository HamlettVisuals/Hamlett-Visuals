import type { AdminViewServerProps } from "payload";
import { redirect } from "next/navigation";
import { formatAdminURL } from "payload/shared";
import { DefaultTemplate } from "@payloadcms/next/templates";
import { SetStepNav } from "@payloadcms/ui";
import { isRepeatClient } from "@/hooks/repeatClient";
import { adminLoginURL } from "@/lib/admin-redirect";
import KanbanBoard from "./Board";
import type { BoardInquiry, TemplateWithCategory } from "./types";

// Registered at admin.components.views.kanban in payload.config.ts (path
// "/kanban"). A brand-new top-level admin route like this one doesn't match
// any of Payload's built-in view keys, so getRouteData() never assigns it a
// `templateType` — without wrapping it in DefaultTemplate ourselves here, it
// would render with no admin Nav/header at all. This mirrors exactly what
// @payloadcms/next's own Root view does for every `templateType: 'default'`
// view (Dashboard, List, Document, etc.) — see
// node_modules/@payloadcms/next/dist/views/Root/index.js.
export default async function KanbanBoardView(props: AdminViewServerProps) {
  const { payload, params, searchParams, initPageResult } = props;
  // Unlike the Dashboard/List/Document views, RootPage does NOT spread user,
  // permissions, visibleEntities, or locale onto a custom view's top-level
  // props — see the servedProps object it builds in
  // node_modules/@payloadcms/next/dist/views/Root/index.js. They're only
  // available nested inside initPageResult (user via initPageResult.req).
  const { req, permissions, visibleEntities, locale } = initPageResult;
  const { user, i18n } = req;

  // Same check as every collection's `isAdmin` access function (see
  // src/access/isAdmin.ts) — this is a single-user CMS, so "logged in" is
  // the whole access model.
  // Carries the board URL (including its query string) through login, the
  // way Payload's own views do for collection/global deep links.
  if (!user) {
    const query = new URLSearchParams(
      Object.entries(searchParams ?? {}).flatMap(([key, value]) =>
        (Array.isArray(value) ? value : [value]).filter((v) => v !== undefined).map((v) => [key, String(v)]),
      ),
    ).toString();
    const boardURL = formatAdminURL({ adminRoute: payload.config.routes.admin, path: "/kanban" });
    redirect(adminLoginURL(query ? `${boardURL}?${query}` : boardURL));
  }

  const [{ docs: inquiries }, { docs: categories }, { docs: questions }, { docs: templates }] = await Promise.all([
    payload.find({
      collection: "inquiries",
      // The kanban board (Lead column onward) is booking-track pipeline
      // work only — questions get their own Questions drawer instead (see
      // the query below). This is also what guarantees `category` is
      // always present on every doc here (required whenever inquiryType is
      // "booking" — see Inquiries.ts's conditional validate), which
      // BoardInquiry below relies on.
      where: { archived: { not_equals: true }, inquiryType: { equals: "booking" } },
      depth: 1,
      limit: 0,
      sort: "-updatedAt",
    }),
    // Every category, not just ones already represented among active
    // inquiries — unlike MobileList's filter chips, AddCardDrawer's and
    // QuestionsDrawer's "Move to Leads" category pickers both need to offer
    // a brand-new category too.
    payload.find({
      collection: "categories",
      limit: 0,
      sort: "order",
    }),
    // For the Questions drawer (Board.tsx's "Questions" button). depth: 0 —
    // name/email/message live directly on the Inquiry, and the drawer never
    // needs `client` or `category` resolved the way the board itself does.
    payload.find({
      collection: "inquiries",
      where: { archived: { not_equals: true }, inquiryType: { equals: "question" } },
      depth: 0,
      limit: 0,
      sort: "-createdAt",
    }),
    // For the Templates drawer (Board.tsx's "Templates" button). depth: 1 so
    // `category` resolves to a full object (for its name label) rather than
    // just an id — see TemplateWithCategory in types.ts.
    payload.find({
      collection: "checklist-templates",
      depth: 1,
      limit: 0,
      sort: "name",
    }),
  ]);

  // depth: 1 already resolves `category` to a full object on every doc
  // (it's a required field), but the base Inquiry type still allows the raw
  // id — narrow it here so the client board doesn't have to.
  const boardInquiries = inquiries as BoardInquiry[];

  const templatesWithCategory: TemplateWithCategory[] = templates.map((template) => ({
    ...template,
    category: typeof template.category === "object" ? template.category : null,
  }));

  const clientIds = Array.from(
    new Set(
      boardInquiries
        .map((inquiry) => (typeof inquiry.client === "object" ? inquiry.client?.id : inquiry.client))
        .filter((id): id is number => typeof id === "number"),
    ),
  );

  const repeatChecks = await Promise.all(
    clientIds.map(async (id) => [id, await isRepeatClient(id, payload)] as const),
  );
  const repeatClientIds = repeatChecks.filter(([, isRepeat]) => isRepeat).map(([id]) => id);

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
      viewType="kanban-board"
      visibleEntities={{
        collections: visibleEntities?.collections ?? [],
        globals: visibleEntities?.globals ?? [],
      }}
    >
      {/* Without this the breadcrumb keeps whatever the previous view set
          (e.g. "Inquiries / …"). The home icon it sits after also lands
          here, since /hv-studio redirects to this view. */}
      <SetStepNav nav={[{ label: "Kanban Board" }]} />
      <KanbanBoard
        inquiries={boardInquiries}
        repeatClientIds={repeatClientIds}
        categories={categories.map((category) => ({ id: category.id, name: category.name }))}
        questions={questions}
        templates={templatesWithCategory}
      />
    </DefaultTemplate>
  );
}
