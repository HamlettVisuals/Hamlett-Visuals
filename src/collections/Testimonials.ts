import type {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
  CollectionBeforeChangeHook,
  CollectionConfig,
  FieldHook,
  Validate,
} from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import { OTHER_SESSION_TYPE } from "#src/lib/booking-session-type.ts";
import { keyAtStart } from "#src/lib/manual-order.ts";
import { promoteTestimonialPhoto } from "#src/lib/promote-testimonial-photo.ts";
import { trimQuoteMarks } from "#src/lib/quote-marks.ts";
import { reorderWithin } from "#src/lib/reorder-within.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { homepagePicks, nextPicks, setHomepagePick } from "#src/lib/testimonial-homepage.ts";

// Testimonials: the /testimonials page (grouped by category, in her order
// within each) and the picks for the homepage Testimonials Section. Edited
// from the grouped list at /hv-studio/testimonials
// (components/admin/Testimonials), which the collection's own list URL
// redirects to (src/proxy.ts); Trash is Payload's own.
//
// Client-submitted ones arrive hidden, with source "client" and a link to
// their submission (app/api/testimonial-submissions/route.ts), and show in
// the list's Needs review tab until she publishes them.

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id: number }).id : (value as number | null | undefined);

const SOURCES = { admin: "Added by you", client: "Submitted by client" } as const;
export type TestimonialSource = keyof typeof SOURCES;

// The quote is shown inside the site's own curly quotes, so any she pasted
// in are dropped on save (lib/quote-marks.ts).
const trimQuote: FieldHook = ({ value }) => (typeof value === "string" ? trimQuoteMarks(value) : value);

// Category: required, except on a hidden client submission that came in
// without one (she picks it before publishing). With an album picked it
// has to be that album's category; the edit page fills it in and locks it
// (TestimonialCategoryField.tsx), and this refuses a mismatch from
// anywhere else.
export const validateCategory: Validate = async (value, { data, req }) => {
  const doc = data as { event?: unknown; published?: boolean; source?: string };
  const categoryId = idOf(value);
  if (categoryId == null) {
    if (doc.source === "client" && doc.published === false) return true;
    return "Choose a category.";
  }
  const eventId = idOf(doc.event);
  if (eventId == null) return true;
  const event = await req.payload
    .findByID({ collection: "events", id: eventId, depth: 1, trash: true, req })
    .catch(() => null);
  const eventCategory = event && (typeof event.category === "object" ? event.category : null);
  if (!eventCategory || eventCategory.id === categoryId) return true;
  return `This album is in ${eventCategory.name}, so the category has to be ${eventCategory.name}. Change the album, or remove it to choose the category yourself.`;
};

// Her order within the category (`listOrder`, the same fractional keys as
// albums; lib/manual-order.ts). New testimonials, and ones moved to another
// category, go to the top of it; otherwise it only changes through a drag
// (context.allowOrderChange), so History restores never reshuffle.
const setListOrder: CollectionBeforeChangeHook = async ({ context, data, operation, originalDoc, req }) => {
  const category = idOf("category" in data ? data.category : originalDoc?.category);
  const moved = operation === "update" && String(category ?? "") !== String(idOf(originalDoc?.category) ?? "");
  if (context.allowOrderChange === true && !moved && data.listOrder) return data;

  const current = originalDoc?.listOrder as string | null | undefined;
  if (operation === "update" && !moved && current) {
    data.listOrder = current;
    return data;
  }
  if (!category) {
    data.listOrder = null;
    return data;
  }
  const { docs } = await req.payload.find({
    collection: "testimonials",
    where: {
      category: { equals: category },
      ...(originalDoc?.id ? { id: { not_equals: originalDoc.id } } : {}),
    },
    select: { listOrder: true },
    pagination: false,
    depth: 0,
    trash: true,
    req,
  });
  data.listOrder = keyAtStart(docs.map((doc) => doc.listOrder));
  return data;
};

// "Show on homepage" isn't stored on the testimonial: it's whether it's in
// the Testimonials Section's picks (lib/testimonial-homepage.ts). Read for
// the admin only (the public site never needs it), once per request.
// The lookup is shared by every testimonial read in one request (a list
// reads many at once, in parallel), keyed by the request itself.
const picksByRequest = new WeakMap<object, Promise<number[]>>();
const readShowOnHomepage: FieldHook = async ({ data, originalDoc, req }) => {
  const id = originalDoc?.id ?? data?.id;
  if (!req.user || id == null) return undefined;
  let picks = picksByRequest.get(req);
  if (!picks) {
    picks = homepagePicks(req);
    picksByRequest.set(req, picks);
  }
  return (await picks).includes(Number(id));
};

// Refuses an add the homepage can't take before anything is saved.
const checkShowOnHomepage: CollectionBeforeChangeHook = async ({ data, originalDoc, req }) => {
  if (data.showOnHomepage !== true || originalDoc?.id == null) return data;
  const published = ("published" in data ? data.published : originalDoc.published) !== false;
  if (!published || originalDoc.deletedAt) return data;
  nextPicks(await homepagePicks(req), Number(originalDoc.id), true, { published });
  return data;
};

// Then applies it. Hidden or in the Trash always means off the homepage,
// whatever the toggle said; un-hiding or restoring doesn't put it back.
// A new testimonial can't be added in the same save (it has no id until
// saved), so the toggle shows only once it exists.
const syncHomepage: CollectionAfterChangeHook = async ({ data, doc, operation, req }) => {
  if (operation !== "update") return doc;
  const live = doc.published !== false && !doc.deletedAt;
  if (!live) {
    await setHomepagePick(req, doc.id, false, { published: false });
  } else if (typeof data.showOnHomepage === "boolean") {
    await setHomepagePick(req, doc.id, data.showOnHomepage, { published: true });
  }
  return doc;
};

// A testimonial deleted for good leaves the homepage too.
const leaveHomepage: CollectionAfterDeleteHook = async ({ id, req }) => {
  await setHomepagePick(req, Number(id), false, { published: false });
};

// Publishing a client's testimonial marks their submission as published,
// as the old Publish button did.
const markSubmissionPublished: CollectionAfterChangeHook = async ({ doc, previousDoc, req }) => {
  const submission = idOf(doc.submission);
  if (submission == null || doc.published === false || previousDoc?.published === true) return doc;
  await req.payload.update({
    collection: "testimonial-submissions",
    id: submission,
    data: { status: "published" },
    overrideAccess: true,
    req,
  });
  return doc;
};

export const Testimonials: CollectionConfig = {
  slug: "testimonials",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    components: {
      // All / Needs review / Page settings / Trash, above Payload's own
      // Trash list (the main list is the custom grouped view).
      beforeList: ["/components/admin/Testimonials/Tabs#TrashTabs"],
      edit: {
        // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
        ],
      },
      // ✕ back to the list, in the top bar of the Edit and History tabs.
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
    useAsTitle: "clientName",
    // Payload's own Trash list.
    defaultColumns: ["clientName", "category", "published"],
    description:
      "Client quotes and reviews, shown on the Testimonials page. Drag ⋮⋮ to change their order within a category.",
    // /testimonials, scrolled to this testimonial's card. Through
    // /api/preview/testimonial, which (for a signed-in admin only) turns on
    // preview mode so a hidden testimonial shows too, marked "Hidden,
    // preview only". The card follows the form as she types
    // (components/testimonials/LiveTestimonialText.tsx).
    livePreview: {
      url: ({ data }) =>
        data?.id
          ? `${serverURL}/api/preview/testimonial?id=${encodeURIComponent(String(data.id))}`
          : `${serverURL}/testimonials`,
    },
  },
  access: {
    // Signed out, only published ones: a hidden testimonial (a client's
    // still waiting for review, say) never leaves through the public API.
    // The site's own pages read on the server (Local API) and aren't
    // limited by this.
    read: ({ req: { user } }) => (user ? true : { published: { equals: true } }),
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  endpoints: [
    {
      // A drag in the list: POST /api/testimonials/reorder
      // { category, order: [ids], moved: id }. See lib/reorder-within.ts.
      path: "/reorder",
      method: "post",
      handler: async (req) => {
        const body = (await req.json?.().catch(() => null)) as
          | { category?: unknown; order?: unknown; moved?: unknown }
          | null;
        const order = Array.isArray(body?.order) ? body.order.map(Number) : [];
        if (!Number.isFinite(Number(body?.category)) || !order.every(Number.isFinite) || !Number.isFinite(Number(body?.moved))) {
          return Response.json({ error: "Invalid reorder." }, { status: 400 });
        }
        return reorderWithin({
          req,
          target: { collection: "testimonials", field: "listOrder", scope: { field: "category", id: Number(body?.category) } },
          order,
          moved: Number(body?.moved),
        });
      },
    },
    {
      // A list row's Add to / Remove from homepage: POST
      // /api/testimonials/:id/homepage { on }. Changes only the section's
      // picks, not the testimonial (no History version on it).
      path: "/:id/homepage",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });
        const id = Number(req.routeParams?.id);
        const body = (await req.json?.().catch(() => null)) as { on?: unknown } | null;
        if (!Number.isFinite(id) || typeof body?.on !== "boolean") {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const doc = await req.payload
          .findByID({ collection: "testimonials", id, depth: 0, req, overrideAccess: false, user: req.user })
          .catch(() => null);
        if (!doc) return Response.json({ error: "Testimonial not found." }, { status: 404 });
        try {
          await setHomepagePick(req, id, body.on, { published: doc.published !== false });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Couldn't change the homepage.";
          return Response.json({ error: message }, { status: 400 });
        }
        return Response.json({ picks: await homepagePicks(req) });
      },
    },
    {
      // "Their photos" in the photo picker: POST /api/testimonials/promote-photo
      // { submission, photo } copies a client's private photo into Photos and
      // answers its id. See lib/promote-testimonial-photo.ts.
      path: "/promote-photo",
      method: "post",
      handler: async (req) => {
        if (!req.user) return Response.json({ error: "Unauthorized." }, { status: 401 });
        const body = (await req.json?.().catch(() => null)) as { submission?: unknown; photo?: unknown } | null;
        const submissionId = Number(body?.submission);
        const photoId = Number(body?.photo);
        if (!Number.isFinite(submissionId) || !Number.isFinite(photoId)) {
          return Response.json({ error: "Invalid request." }, { status: 400 });
        }
        const result = await promoteTestimonialPhoto(req, { submissionId, photoId });
        return "error" in result
          ? Response.json({ error: result.error }, { status: result.status })
          : Response.json({ id: result.id });
      },
    },
  ],
  hooks: {
    beforeChange: [setListOrder, checkShowOnHomepage],
    afterChange: [syncHomepage, markSubmissionPublished],
    afterDelete: [leaveHomepage],
  },
  fields: [
    {
      // Where it came from, at the top of the form; links a client's
      // testimonial to their submission (email, notes, their photos).
      name: "sourceNote",
      type: "ui",
      admin: {
        components: { Field: "/components/admin/Testimonials/SourceNote#default" },
      },
    },
    {
      name: "quote",
      type: "textarea",
      required: true,
      hooks: { beforeValidate: [trimQuote] },
      admin: {
        rows: 4,
        description:
          "The client's words, without quote marks: the site adds its own (any you paste in are removed when you save).",
      },
    },
    {
      name: "clientName",
      type: "text",
      required: true,
      admin: {
        description: "Who said it, e.g. \"Priya & Daniel\".",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      label: "Album",
      admin: {
        description:
          "The shoot this is about, if it's in your portfolio. Its button on the Testimonials page links to that album, and the category follows the album.",
        allowCreate: false,
        allowEdit: false,
      },
    },
    {
      // Pre-fills Category on a new testimonial opened from a section's
      // "+ Add testimonial" link (/create?category=<id>). Shows nothing.
      name: "categoryPrefill",
      type: "ui",
      admin: {
        disableListColumn: true,
        components: { Field: "/components/admin/CategoryPrefill#default" },
      },
    },
    {
      // Required in practice (validateCategory): /testimonials groups by
      // category and leaves out any without one.
      name: "category",
      type: "relationship",
      relationTo: "categories",
      validate: validateCategory,
      filterOptions: { slug: { not_equals: OTHER_SESSION_TYPE } },
      admin: {
        description: "Which section of the Testimonials page this goes in.",
        allowCreate: false,
        allowEdit: false,
        sortOptions: "_order",
        components: { Field: "/components/admin/Testimonials/CategoryField#default" },
      },
    },
    {
      name: "photo",
      type: "upload",
      relationTo: "photos",
      admin: {
        description:
          "Optional. Pick one from the album, choose another photo you've already uploaded, or upload a new one. Left empty, the album's cover is used (or the category's cover when there's no album).",
        components: { Field: "/components/admin/Testimonials/PhotoField#default" },
      },
    },
    {
      name: "context",
      type: "text",
      admin: {
        description:
          "Optional. The small line under the name. Left empty, it's the category and the album's month (shown greyed out above), or just the category.",
        components: { Field: "/components/admin/Testimonials/ContextField#default" },
      },
    },
    {
      name: "source",
      type: "text",
      defaultValue: "admin" satisfies TestimonialSource,
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
    {
      name: "submission",
      type: "relationship",
      relationTo: "testimonial-submissions",
      admin: { hidden: true, disableListColumn: true, disableListFilter: true },
    },
    {
      // Her order within the category; never edited in the form.
      name: "listOrder",
      type: "text",
      index: true,
      admin: { hidden: true, disableListColumn: true, disableListFilter: true, disableBulkEdit: true },
    },
    {
      // Retired: the homepage picks come from the Testimonials Teaser
      // global's "Testimonials" field now (carried over once by
      // src/scripts/carryOverFeaturedTestimonials.ts). Hidden rather than
      // removed so the column isn't dropped. Nothing reads it any more.
      name: "featured",
      type: "checkbox",
      defaultValue: false,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      // In the main column at the bottom (not Payload's sidebar, which
      // moves below the form whenever Live Preview opens), with Show on
      // homepage under it.
      name: "published",
      type: "checkbox",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this testimonial from the site. Hiding it also takes it off the homepage.",
        custom: { onLabel: "Published" },
        components: {
          Field: "/components/admin/ShowOnWebsiteField#default",
          Cell: "/components/admin/Testimonials/Cells#PublishedCell",
        },
      },
    },
    {
      name: "showOnHomepage",
      type: "checkbox",
      virtual: true,
      label: "Show on homepage",
      hooks: { afterRead: [readShowOnHomepage] },
      admin: {
        disableListColumn: true,
        disableListFilter: true,
        disableBulkEdit: true,
        components: { Field: "/components/admin/Testimonials/HomepageField#default" },
      },
    },
  ],
};

export const TESTIMONIAL_SOURCE_LABELS = SOURCES;
