import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
  PayloadRequest,
} from "payload";
import { APIError } from "payload";
import { generateKeyBetween } from "payload/shared";
import { isAdmin } from "#src/access/isAdmin.ts";
import { formatSlug } from "#src/hooks/formatSlug.ts";
import { OTHER_SESSION_TYPE } from "#src/lib/booking-session-type.ts";
import { BLURB_MAX } from "#src/lib/category-limits.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import { reorderWithin } from "#src/lib/reorder-within.ts";

// An error the admin shows as-is (the `true` exposes the message).
const refuse = (message: string) => new APIError(message, 400, null, true);

// The unpublished "Other" category (slug OTHER_SESSION_TYPE) is the CRM's
// catch-all: BookingForm points "Something else" at it and the kanban board
// files anything unmapped under it. So it can't be trashed, deleted, renamed,
// re-slugged or published, and it always sorts last. The list view hides
// those controls (components/admin/CategoryCells.tsx); these hooks are the
// real guard, since the REST API and bulk actions bypass the UI.
async function findOtherCategory(req: PayloadRequest) {
  const { docs } = await req.payload.find({
    collection: "categories",
    where: { slug: { equals: OTHER_SESSION_TYPE } },
    trash: true,
    depth: 0,
    limit: 1,
    select: { _order: true },
    req,
  });
  return docs[0];
}

// `_order` is the fractional sort key `orderable: true` adds. Only the list
// view's drag-to-reorder (Payload's POST /reorder) and scripts that opt in
// via context.allowOrderChange may move it. Everything else (a History
// restore, Undo, the REST API) keeps the current position, so restoring an
// old version never reshuffles the list.
function isReorderRequest(req: PayloadRequest, context: Record<string, unknown>) {
  return context.allowOrderChange === true || Boolean(req.pathname?.endsWith("/reorder"));
}

const guardOrderAndOther: CollectionBeforeChangeHook = async ({
  context,
  data,
  operation,
  originalDoc,
  req,
}) => {
  if (operation === "create") {
    if (data.slug === OTHER_SESSION_TYPE) return data;
    // Payload's own orderable hook appends after the last key, which would
    // land below "Other". Slot new categories in just above it instead.
    const other = await findOtherCategory(req);
    if (other?._order) {
      const { docs } = await req.payload.find({
        collection: "categories",
        where: { _order: { less_than: other._order } },
        sort: "-_order",
        trash: true,
        depth: 0,
        limit: 1,
        select: { _order: true },
        req,
      });
      data._order = generateKeyBetween(docs[0]?._order ?? null, other._order);
    }
    return data;
  }

  if (!originalDoc) return data;

  if (!isReorderRequest(req, context) && originalDoc._order) {
    data._order = originalDoc._order;
  }

  if (originalDoc.slug === OTHER_SESSION_TYPE) {
    const label = `"${originalDoc.name}" is used by your CRM`;
    if (data.name !== undefined && data.name !== originalDoc.name) {
      throw refuse(`${label} and can't be renamed.`);
    }
    if (data.slug !== undefined && data.slug !== originalDoc.slug) {
      throw refuse(`${label}, so its web address can't change.`);
    }
    if (data.published) {
      throw refuse(`${label} and isn't shown on the site, so it can't be published.`);
    }
    if (data.deletedAt) {
      throw refuse(`${label} and can't be moved to the Trash.`);
    }
    if (data._order !== originalDoc._order && context.allowOrderChange !== true) {
      throw refuse(`${label} and always stays at the bottom of the list.`);
    }
    return data;
  }

  if (data._order && data._order !== originalDoc._order) {
    const other = await findOtherCategory(req);
    if (other?._order && data._order >= other._order) {
      throw refuse(`"Other" always stays at the bottom of the list.`);
    }
  }

  return data;
};

// Gives every new category its own blank Prep and Post-Production checklist
// templates to customize, rather than leaving it to fall back to the
// Standard template (see ChecklistTemplates.ts) with no way to tell them
// apart in the admin list. Create-only: renaming a category later doesn't
// rename its templates, since she may have already retitled them herself.
const createBlankChecklistTemplates: CollectionAfterChangeHook = async ({
  doc,
  operation,
  req,
}) => {
  if (operation !== "create") return doc;

  await req.payload.create({
    collection: "checklist-templates",
    data: { name: `${doc.name} — Prep`, type: "prep", category: doc.id, items: [] },
    req,
  });

  await req.payload.create({
    collection: "checklist-templates",
    data: { name: `${doc.name} — Post-Production`, type: "postProduction", category: doc.id, items: [] },
    req,
  });

  return doc;
};

// Moving a category to the Trash is harmless and fully reversible: its
// inquiries, events, templates etc. keep pointing at it (the board labels it
// "(in Trash)" — see KanbanBoard/index.tsx), the public site stops showing
// it, and Restore brings everything back. A *permanent* delete isn't:
// Postgres nulls every reference, which would strip past jobs of their
// required category and turn this category's own checklist templates into
// look-alikes of the Standard one (category = null). So refuse while any
// inquiry — archived or trashed included — still uses it, and take its own
// templates with it otherwise. beforeDelete only runs on permanent deletes;
// moving to the Trash is an update.
const guardPermanentDelete: CollectionBeforeDeleteHook = async ({ id, req }) => {
  const other = await findOtherCategory(req);
  if (other && other.id === id) {
    throw refuse(`"Other" is used by your CRM and can't be deleted.`);
  }

  const { totalDocs } = await req.payload.count({
    collection: "inquiries",
    where: { category: { equals: id } },
    trash: true,
    req,
  });
  if (totalDocs > 0) {
    const noun = totalDocs === 1 ? "inquiry uses" : "inquiries use";
    throw new APIError(
      `Can't permanently delete this category: ${totalDocs} ${noun} it (including archived or trashed ones). Move them to another category first, or leave this one in the Trash.`,
      400,
      null,
      true,
    );
  }

  await req.payload.delete({
    collection: "checklist-templates",
    where: { category: { equals: id } },
    req,
  });
};

// The types of photography offered — every page that used to read from the
// old static src/content/categories.json placeholder (now removed) reads
// from this collection instead: the homepage grid, the booking form's
// session-type list, and each /portfolio/[category] page.
export const Categories: CollectionConfig = {
  slug: "categories",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  // Drag-to-reorder in the list view. Payload adds a hidden `_order` text
  // field (fractional-index keys) and sorts the list by it; every reader of
  // category order sorts by `_order` too. The old numeric `order` field is
  // kept below, hidden, only so its column isn't dropped.
  orderable: true,
  admin: {
    // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
    components: {
      // The list description plus the "+ Add category" button (Payload's
      // own "Create New" pill is hidden in admin-overrides.css).
      Description: "/components/admin/CategoryCells#CategoriesListDescription",
      edit: {
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
          // "New category" instead of "[Untitled]" before the first save.
          "/components/admin/NewDocumentTitle#default",
        ],
      },
      // ✕ back to this list, in the top bar of the Edit and History tabs.
      // See components/admin/CloseEditorButton.tsx.
      views: {
        edit: {
          default: { actions: [CLOSE_EDITOR_BUTTON] },
          versions: { actions: [CLOSE_EDITOR_BUTTON] },
          version: { actions: [CLOSE_EDITOR_BUTTON] },
        },
      },
    },
    hideAPIURL: true,
    useAsTitle: "name",
    defaultColumns: ["name", "coverPhoto", "published"],
    // Only a handful of categories, so show them all on one page and any row
    // can be dragged anywhere. The per-page control is hidden, and src/proxy.ts
    // forces limit=100 (and the drag sort) over any saved per-user setting.
    pagination: { defaultLimit: 100, limits: [100] },
    // Item-scoped Live Preview (docs/collection-live-preview.md): the
    // homepage, scrolled to this category's tile, with `lpDoc` telling that
    // one tile (components/home/CategoryTile.tsx) to follow the unsaved form.
    // The tile shows the name, blurb and cover photo, the fields edited
    // here; the portfolio page shows only the name. Falls back to the
    // section when the tile isn't on the page (hidden, no cover photo, or
    // not saved yet). Show/hide and order only change after saving.
    livePreview: {
      url: ({ data }) => {
        const id = data?.id;
        const slug = typeof data?.slug === "string" ? data.slug : "";
        if (!id) return `${serverURL}/#live-preview:categories`;
        return `${serverURL}/?lpDoc=${encodeURIComponent(String(id))}#live-preview:category-${slug},categories`;
      },
    },
    description:
      "The types of photography you offer (Weddings, Portraits, Pets, etc.) — these show up as the tiles on the homepage and each one gets its own portfolio page.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  endpoints: [
    {
      // A drag on the Categories & Albums page: POST
      // /api/categories/reorder-categories { order: [ids], moved: id }.
      // Writes only the order keys, so no History version (see
      // lib/reorder-within.ts); "Other" has to stay last.
      path: "/reorder-categories",
      method: "post",
      handler: async (req) => {
        const body = (await req.json?.().catch(() => null)) as { order?: unknown; moved?: unknown } | null;
        const isId = (value: unknown): value is number => Number.isInteger(value);
        if (!body || !isId(body.moved) || !Array.isArray(body.order) || !body.order.every(isId)) {
          return Response.json({ error: "Invalid reorder." }, { status: 400 });
        }
        const other = await findOtherCategory(req);
        return reorderWithin({
          req,
          target: { collection: "categories", field: "_order", scope: null },
          order: body.order,
          moved: body.moved,
          mustBeLast: other?.id,
        });
      },
    },
  ],
  hooks: {
    beforeChange: [guardOrderAndOther],
    afterChange: [createBlankChecklistTemplates],
    beforeDelete: [guardPermanentDelete],
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "The category name, e.g. \"Weddings\".",
        components: {
          Cell: "/components/admin/CategoryCells#CategoryNameCell",
        },
      },
    },
    {
      // Directly under Name in the main column, not Payload's sidebar: the
      // sidebar drops below the form whenever Live Preview is open, so the
      // switch would move with the preview toggle.
      name: "published",
      type: "checkbox",
      defaultValue: true,
      label: "Show on website",
      admin: {
        description: "Turn off to hide this category from your site.",
        components: {
          Field: "/components/admin/ShowOnWebsiteField#default",
          Cell: "/components/admin/CategoryCells#CategoryStatusCell",
        },
      },
    },
    {
      name: "slug",
      type: "text",
      required: true,
      unique: true,
      // Hidden everywhere in the admin. Set once from the name on the first
      // save and never changed after (formatSlug.ts), so renaming a category
      // doesn't break links to its portfolio page.
      admin: {
        hidden: true,
        readOnly: true,
        disableListColumn: true,
        disableListFilter: true,
      },
      hooks: {
        beforeValidate: [formatSlug("name")],
      },
    },
    {
      name: "blurb",
      type: "textarea",
      maxLength: BLURB_MAX,
      admin: {
        description: `One short line shown under the category name on the homepage. Up to ${BLURB_MAX} characters, so it stays on one line on phones.`,
      },
    },
    {
      name: "coverPhoto",
      type: "upload",
      relationTo: "photos",
      admin: {
        description: "The photo used for this category's tile on the homepage.",
        components: {
          Cell: "/components/admin/CategoryCells#CategoryThumbnailCell",
        },
      },
    },
    {
      name: "heroPhoto",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "The large banner photo shown at the top of this category's own page.",
      },
    },
    {
      // Superseded by drag-to-reorder (`_order`, see `orderable` above).
      // Hidden rather than removed so the dev schema push doesn't drop the
      // column. Nothing reads it any more.
      name: "order",
      type: "number",
      defaultValue: 0,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
};
