import type {
  CollectionAfterChangeHook,
  CollectionBeforeChangeHook,
  CollectionBeforeDeleteHook,
  CollectionConfig,
} from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { formatSlug } from "#src/hooks/formatSlug.ts";
import { DESCRIPTION_MAX } from "#src/lib/album-limits.ts";
import { OTHER_SESSION_TYPE } from "#src/lib/booking-session-type.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import { keyAtStart } from "#src/lib/manual-order.ts";
import { reorderWithin } from "#src/lib/reorder-within.ts";

// Newest first means by the shoot date, or when the album was added if it
// has no date. Postgres can't sort by "date, else createdAt" through
// Payload's sort, and a plain `-date` puts every undated album first, so
// this hidden field carries that value for the admin list and the category
// page to sort by. Recomputed on every save, so it follows the date.
const setSortDate: CollectionBeforeChangeHook = ({ data, originalDoc }) => {
  const date = "date" in data ? data.date : originalDoc?.date;
  data.sortDate = date || originalDoc?.createdAt || data.createdAt || new Date().toISOString();
  return data;
};

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number | string }).id : (value as number | string | null | undefined);

// Her order within the category (`albumOrder`, lib/manual-order.ts). A new
// album, one moved to another category, or one saved by older code without
// a key goes to the top of its category. Otherwise the key only changes
// through a drag (context.allowOrderChange, set by the reorder endpoint), so
// a History restore or Undo never reshuffles the category.
const setAlbumOrder: CollectionBeforeChangeHook = async ({ context, data, operation, originalDoc, req }) => {
  const category = idOf("category" in data ? data.category : originalDoc?.category);
  const moved = operation === "update" && String(category ?? "") !== String(idOf(originalDoc?.category) ?? "");
  if (context.allowOrderChange === true && !moved && data.albumOrder) return data;

  const current = originalDoc?.albumOrder as string | null | undefined;
  if (operation === "update" && !moved && current) {
    data.albumOrder = current;
    return data;
  }
  if (!category) {
    data.albumOrder = null;
    return data;
  }
  const { docs } = await req.payload.find({
    collection: "events",
    where: {
      category: { equals: category },
      ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
    },
    select: { albumOrder: true },
    pagination: false,
    depth: 0,
    trash: true,
    req,
  });
  data.albumOrder = keyAtStart(docs.map((doc) => doc.albumOrder));
  return data;
};

// An album moved to another category takes its testimonials with it, so a
// testimonial's category always matches its album's (Testimonials.ts
// refuses a mismatch on save). Straight in the database like a drag: no
// History version on each testimonial. Their order keys are cleared, so
// they go to the top of the new category (lib/manual-order.ts).
const moveTestimonials: CollectionAfterChangeHook = async ({ doc, operation, previousDoc, req }) => {
  if (operation !== "update") return doc;
  const category = idOf(doc.category);
  if (category == null || String(category) === String(idOf(previousDoc?.category) ?? "")) return doc;
  await req.payload.db.updateMany({
    collection: "testimonials",
    where: { event: { equals: doc.id } },
    data: { category, listOrder: null },
    returning: false,
    req,
  });
  return doc;
};

// When an album is deleted permanently, the database takes its photos out
// of it (photos.event is set to null) but would leave their order keys, so
// they'd look like album photos without an album. Clears both first,
// straight in the database like a drag (no History version for each
// photo), inside the delete's transaction. Photos in the Trash too. Moving
// an album to the Trash is an update, not a delete, so its photos stay.
const releasePhotos: CollectionBeforeDeleteHook = async ({ id, req }) => {
  await req.payload.db.updateMany({
    collection: "photos",
    where: { event: { equals: id } },
    data: { event: null, albumOrder: null },
    returning: false,
    req,
  });
};

// An album is a single shoot within a category (e.g. the "Priya & Daniel"
// wedding within Weddings). The collection and its tables are still called
// `events`; only the labels say "Album". See /portfolio/[category]/page.tsx
// for how Category -> Album -> Photo is queried and grouped for the gallery.
export const Events: CollectionConfig = {
  slug: "events",
  labels: {
    singular: "Album",
    plural: "Albums",
  },
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  defaultSort: "-sortDate",
  admin: {
    components: {
      // The list description plus the "+ Add album" button (Payload's own
      // "Create New" pill is hidden in admin-overrides.css).
      Description: "/components/admin/AlbumCells#AlbumsListDescription",
      edit: {
        // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
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
    useAsTitle: "title",
    defaultColumns: ["cover", "title", "category", "date", "published"],
    // The list itself is the Categories & Albums page (proxy.ts redirects
    // there); Payload's table only shows on the Trash tab. Search is by title.
    pagination: { defaultLimit: 25, limits: [25, 50, 100] },
    listSearchableFields: ["title"],
    // Item-scoped Live Preview (docs/collection-live-preview.md): the
    // album's category page, scrolled to this album's row, with `lpDoc`
    // telling that one row (components/Gallery/CategoryGallery.tsx) to
    // follow the unsaved title, description and date. Falls back to the top
    // of the album list when the row isn't on the page (hidden, not saved
    // yet, or no album in the category has photos), and to the homepage's
    // categories when there's no category or it's hidden (its page 404s).
    // Show/hide, category and order only change after saving.
    livePreview: {
      url: async ({ data, req }) => {
        const categoryId =
          data?.category && typeof data.category === "object" ? data.category.id : data?.category;
        if (!categoryId) return `${serverURL}/#live-preview:categories`;

        const category = await req.payload
          .findByID({ collection: "categories", id: categoryId, depth: 0, disableErrors: true, req })
          .catch(() => null);
        if (!category?.published || category.deletedAt) {
          return `${serverURL}/#live-preview:categories`;
        }

        const page = `${serverURL}/portfolio/${category.slug}`;
        const id = data?.id;
        const slug = typeof data?.slug === "string" ? data.slug : "";
        if (!id || !slug) return `${page}#live-preview:albums`;
        return `${page}?lpDoc=${encodeURIComponent(String(id))}#live-preview:${slug},albums`;
      },
    },
    description:
      "Each album is one shoot (a wedding, a portrait session) and holds its photos. Albums show on their category's page in your order; new ones go to the top.",
  },
  access: {
    read: () => true,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [setSortDate, setAlbumOrder],
    afterChange: [moveTestimonials],
    beforeDelete: [releasePhotos],
  },
  endpoints: [
    {
      // A drag on the Categories & Albums page: POST
      // /api/events/reorder-albums { category, order: [ids], moved: id }.
      // See lib/reorder-within.ts.
      path: "/reorder-albums",
      method: "post",
      handler: async (req) => {
        const body = (await req.json?.().catch(() => null)) as { category?: unknown; order?: unknown; moved?: unknown } | null;
        const isId = (value: unknown): value is number => Number.isInteger(value);
        if (!body || !isId(body.category) || !isId(body.moved) || !Array.isArray(body.order) || !body.order.every(isId)) {
          return Response.json({ error: "Invalid reorder." }, { status: 400 });
        }
        return reorderWithin({
          req,
          target: { collection: "events", field: "albumOrder", scope: { field: "category", id: body.category } },
          order: body.order,
          moved: body.moved,
        });
      },
    },
  ],
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      // List column only: the album's first photo (the same one that leads
      // its row on the site), or a placeholder. Not stored. A proper album
      // cover is planned for the Photo Library build.
      name: "cover",
      type: "ui",
      label: "Photo",
      admin: {
        components: {
          Field: "/components/admin/AlbumCells#EmptyField",
          Cell: "/components/admin/AlbumThumbnailCell#default",
        },
      },
    },
    {
      name: "title",
      type: "text",
      required: true,
      admin: {
        description: "The name of this shoot, e.g. \"Priya & Daniel's Wedding\".",
        components: {
          Cell: "/components/admin/AlbumCells#AlbumTitleCell",
        },
      },
    },
    {
      // Directly under Title in the main column, not Payload's sidebar,
      // same as Categories: the sidebar drops below the form whenever Live
      // Preview is open, so the switch would move with the preview toggle.
      name: "published",
      type: "checkbox",
      defaultValue: true,
      label: "Show on website",
      admin: {
        description: "Turn off to hide this album from your site.",
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
      // Hidden everywhere in the admin, same as Categories. Set once from
      // the title on the first save and never changed after
      // (formatSlug.ts), so renaming an album doesn't break links to it
      // (/portfolio/<category>#<slug>, e.g. from a testimonial).
      admin: {
        hidden: true,
        readOnly: true,
        disableListColumn: true,
        disableListFilter: true,
      },
      hooks: {
        beforeValidate: [formatSlug("title")],
      },
    },
    {
      // Pre-fills Category on a new album opened from a section's
      // "+ Add album" link (/create?category=<id>). Shows nothing.
      name: "categoryPrefill",
      type: "ui",
      admin: {
        disableListColumn: true,
        components: {
          Field: "/components/admin/CategoryPrefill#default",
        },
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      required: true,
      hasMany: false,
      // Categories are only made on the Categories page, in their drag
      // order, and never "Other" (CRM-only). Trashed ones are left out by
      // Payload already.
      filterOptions: { slug: { not_equals: OTHER_SESSION_TYPE } },
      admin: {
        description: "Which category this album belongs to. It shows on that category's page.",
        placeholder: "Choose a category",
        allowCreate: false,
        allowEdit: false,
        sortOptions: "_order",
      },
    },
    {
      name: "description",
      type: "textarea",
      maxLength: DESCRIPTION_MAX,
      admin: {
        description: `Optional. A short note shown under the album's title. Up to ${DESCRIPTION_MAX} characters, so it fits on two lines on phones.`,
      },
    },
    {
      name: "date",
      type: "date",
      admin: {
        description: "Optional. The day of the shoot; its month and year show next to the album's title.",
        date: { pickerAppearance: "dayOnly", displayFormat: "d MMM yyyy" },
      },
    },
    {
      // The album's photos, in her order: a grid to reorder (drag, or "Set
      // as album cover"), edit, take out of the album or delete them. Each
      // change saves straight away, apart from the album's own Save. Not
      // stored. See components/admin/AlbumPhotos.
      name: "photos",
      type: "ui",
      admin: {
        disableListColumn: true,
        components: {
          Field: "/components/admin/AlbumPhotos#default",
        },
      },
    },
    {
      // Her order within the category (the Categories & Albums page's drag
      // order), which the category page follows: a fractional-index key
      // (lib/manual-order.ts). New albums, and albums moved to another
      // category, get a key at the top of their category (setAlbumOrder
      // above); only a drag changes it after that. Never edited in the form.
      name: "albumOrder",
      type: "text",
      index: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
        disableBulkEdit: true,
      },
    },
    {
      // Sort key for "newest first": the date, else when it was added. Set
      // by setSortDate above; never edited.
      name: "sortDate",
      type: "date",
      index: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
  ],
};
