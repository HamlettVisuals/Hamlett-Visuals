import type { AdminViewServerProps } from "payload";
import type { Category } from "@/payload-types";
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

  const [
    { docs: inquiries },
    { docs: inquiryCategoryIds },
    { docs: allCategories },
    { docs: questions },
    { docs: templates },
  ] = await Promise.all([
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
    // Same inquiries, raw category ids only. Payload populates a
    // relationship to a trashed doc as null (dropping the id too), so this
    // is how a job whose category is in the Trash keeps its category on
    // the board instead of crashing every `inquiry.category.id` read.
    payload.find({
      collection: "inquiries",
      where: { archived: { not_equals: true }, inquiryType: { equals: "booking" } },
      depth: 0,
      limit: 0,
      select: { category: true },
    }),
    // Every category, not just ones already represented among active
    // inquiries — unlike MobileList's filter chips, AddCardDrawer's and
    // QuestionsDrawer's "Move to Leads" category pickers both need to offer
    // a brand-new category too. trash: true so trashed ones can still label
    // the jobs/templates that use them (see withCategory below); the
    // pickers only get the live ones.
    payload.find({
      collection: "categories",
      limit: 0,
      sort: "order",
      trash: true,
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
    // For the Templates drawer (Board.tsx's "Templates" button). depth: 0 —
    // `category` is resolved from allCategories below instead, since at
    // depth 1 a trashed category would populate as null and make that
    // category's templates indistinguishable from the Standard one (the
    // only template with genuinely no category).
    payload.find({
      collection: "checklist-templates",
      depth: 0,
      limit: 0,
      sort: "name",
    }),
  ]);

  const categoryById = new Map(
    allCategories.map((category) => [
      category.id,
      category.deletedAt ? { ...category, name: `${category.name} (in Trash)` } : category,
    ]),
  );
  const withCategory = (value: number | Category | null | undefined): Category | null => {
    const id = typeof value === "object" ? value?.id : value;
    return id == null ? null : (categoryById.get(id) ?? null);
  };
  const rawCategoryIdByInquiry = new Map(inquiryCategoryIds.map((doc) => [doc.id, doc.category]));

  // `category` is required on booking inquiries, so every doc here has one;
  // withCategory resolves it (trashed or not) to the full object the board
  // expects. A job with no resolvable category at all (shouldn't happen —
  // Categories.ts blocks permanently deleting one that's in use) is left
  // off rather than crashing the board.
  const boardInquiries: BoardInquiry[] = inquiries.flatMap((inquiry) => {
    const category = withCategory(rawCategoryIdByInquiry.get(inquiry.id));
    return category ? [{ ...inquiry, category }] : [];
  });

  const templatesWithCategory = templates.flatMap((template): TemplateWithCategory[] => {
    if (template.category == null) return [{ ...template, category: null }];
    const category = withCategory(template.category);
    return category ? [{ ...template, category }] : [];
  });

  // A trashed client populates as null above, so it drops out of both the
  // repeat badge and each card's same-client siblings; isRepeatClient's
  // count likewise skips trashed inquiries (Payload excludes them by default).
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
        categories={allCategories
          .filter((category) => !category.deletedAt)
          .map((category) => ({ id: category.id, name: category.name }))}
        questions={questions}
        templates={templatesWithCategory}
      />
    </DefaultTemplate>
  );
}
