import type { CollectionBeforeChangeHook, CollectionConfig, Validate } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { readPublishedInShownCategory } from "#src/access/publicRead.ts";
import { CLOSE_EDITOR_BUTTON } from "#src/lib/admin-components.ts";
import { OTHER_SESSION_TYPE } from "#src/lib/booking-session-type.ts";
import {
  FEATURE_MAX,
  FEATURES_MAX,
  PRICE_MAX,
  PRICE_PREFIX_MAX,
  SUMMARY_MAX,
  TITLE_MAX,
} from "#src/lib/package-limits.ts";
import { serverURL } from "#src/lib/server-url.ts";

const idOf = (value: unknown) =>
  value && typeof value === "object" ? (value as { id?: number | string }).id : value;

// The album has to be a live one in this package's own category. The
// dropdown only offers those (filterOptions below), but the category can
// change after an album is picked, so this says so in plain words on save
// rather than Payload's generic "invalid selection". The editor shows the
// same message as soon as they stop matching (AlbumMatchNote.tsx).
const validateAlbum: Validate = async (value, { data, req }) => {
  const albumId = idOf(value);
  if (!albumId) return true;
  const album = await req.payload
    .findByID({ collection: "events", id: albumId as number, depth: 0, disableErrors: true, req })
    .catch(() => null);
  if (!album) return "That album is no longer available. Pick another album, or clear this.";
  const categoryId = idOf((data as { category?: unknown })?.category);
  if (String(idOf(album.category)) !== String(categoryId)) {
    return `"${album.title}" is in a different category. Pick an album from this package's category, or clear this.`;
  }
  if (!album.published) {
    return `"${album.title}" is hidden from your site. Pick a live album, or clear this.`;
  }
  return true;
};

// `_order` is the drag-order key `orderable: true` adds. As for Categories,
// only the list's drag-to-reorder (Payload's POST /reorder) and scripts that
// opt in via context.allowOrderChange may move it; a History restore, Undo
// or the REST API keeps the current position.
const keepOrder: CollectionBeforeChangeHook = ({ context, data, operation, originalDoc, req }) => {
  if (operation !== "update" || !originalDoc?._order) return data;
  const isReorder = context.allowOrderChange === true || Boolean(req.pathname?.endsWith("/reorder"));
  if (!isReorder) data._order = originalDoc._order;
  return data;
};

// Packages: one row per offer, rendered by the homepage's Offers & pricing
// section and, for the one picked in the Featured Offer global's "Featured
// package", the "Popular right now" spotlight. The collection and its tables
// are still called `pricing-rows`; only the labels say "Package".
export const PricingRows: CollectionConfig = {
  slug: "pricing-rows",
  labels: {
    singular: "Package",
    plural: "Packages",
  },
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  // Drag-to-reorder in the list view, like Categories: Payload adds a hidden
  // `_order` key and every reader of package order sorts by it. The old
  // numeric `order` field is kept below, hidden, so its column isn't dropped
  // (carried over by src/scripts/seedPackageOrder.ts).
  orderable: true,
  admin: {
    components: {
      // The list description plus the "+ Add package" button (Payload's own
      // "Create New" pill is hidden in admin-overrides.css).
      Description: "/components/admin/PackageCells#PackagesListDescription",
      // "No packages yet" in place of Payload's "No results".
      beforeListTable: ["/components/admin/PackageCells#PackagesEmptyState"],
      edit: {
        // Undo / Redo / Discard next to Save — see components/admin/EditHistory.tsx.
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
          // "New package" instead of "[Untitled]" before the first save.
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
    defaultColumns: ["thumbnail", "title", "category", "priceAmount", "published"],
    // Only a handful of packages: all on one page so any row can be dragged
    // anywhere. src/proxy.ts forces limit=100 and the drag sort, as for
    // Categories.
    pagination: { defaultLimit: 100, limits: [100] },
    // Item-scoped Live Preview (docs/collection-live-preview.md): the
    // homepage, scrolled to this package's row in Offers & pricing, with
    // `lpDoc` telling that row (components/home/Offers.tsx) — and the
    // spotlight, if this is the featured package — to follow the unsaved
    // title, price prefix, price, summary and features. Falls back to the
    // section when the row isn't on the page (hidden, category hidden, or
    // not saved yet). Show/hide, category, album and order only change
    // after saving.
    livePreview: {
      // Opens with the page, like the homepage editors, until she toggles
      // it herself (then her choice is remembered).
      openByDefault: true,
      url: ({ data }) => {
        const id = data?.id;
        if (!id) return `${serverURL}/#live-preview:offers`;
        return `${serverURL}/?lpDoc=${encodeURIComponent(String(id))}#live-preview:package-${id},offers`;
      },
    },
    description:
      "Your packages and prices, shown in the Offers & pricing section of your homepage. Drag to set their order. To spotlight one in 'Popular right now', pick it on the Featured Offer page.",
  },
  access: {
    // Signed out: only packages the site shows (src/access/publicRead.ts).
    read: readPublishedInShownCategory,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [keepOrder],
  },
  // Powers the History tab (restore an earlier save). No drafts — Save
  // writes straight through, same as before.
  versions: true,
  fields: [
    {
      // List column only: the cover photo of the package's category, or
      // the neutral placeholder (PackageThumbnailCell.tsx). Not stored.
      name: "thumbnail",
      type: "ui",
      label: "Photo",
      admin: {
        components: {
          Field: "/components/admin/AlbumCells#EmptyField",
          Cell: "/components/admin/PackageThumbnailCell#default",
        },
      },
    },
    {
      // At the top of the main column, same as Categories and Albums: the
      // sidebar drops below the form whenever Live Preview is open, so the
      // switch would move with the preview toggle.
      name: "published",
      type: "checkbox",
      defaultValue: true,
      label: "Show on website",
      admin: {
        description: "Turn off to hide this package from your site.",
        components: {
          Field: "/components/admin/ShowOnWebsiteField#default",
          Cell: "/components/admin/CategoryCells#CategoryStatusCell",
        },
      },
    },
    {
      // Whether this is the package in the homepage spotlight, with a link
      // to Featured Offer (PackageFeaturedNote.tsx). Not stored.
      name: "featuredNote",
      type: "ui",
      admin: {
        disableListColumn: true,
        components: {
          Field: "/components/admin/PackageFeaturedNote#default",
        },
      },
    },
    {
      // Sections are layout only (no columns): what visitors read, then
      // where the package links and which photos it borrows.
      type: "collapsible",
      label: "What visitors read",
      admin: { initCollapsed: false },
      fields: [
        {
          name: "title",
          type: "text",
          required: true,
          maxLength: TITLE_MAX,
          admin: {
            description: `The package name, e.g. "Wedding Day Coverage". Up to ${TITLE_MAX} characters, so it fits on two lines beside the price on phones.`,
            components: {
              Cell: "/components/admin/PackageCells#PackageTitleCell",
            },
          },
        },
        {
          type: "row",
          fields: [
            {
              name: "priceLead",
              type: "text",
              label: "Price prefix",
              defaultValue: "From",
              maxLength: PRICE_PREFIX_MAX,
              admin: {
                description: `The small word above the price, e.g. "From" or "Starting at". Up to ${PRICE_PREFIX_MAX} characters.`,
                width: "50%",
              },
            },
            {
              name: "priceAmount",
              type: "text",
              label: "Price",
              required: true,
              maxLength: PRICE_MAX,
              admin: {
                description: `Any text, e.g. "$2,800", "$450/hr" or "Custom quote". Up to ${PRICE_MAX} characters, so it leaves room for the name on phones.`,
                width: "50%",
                components: {
                  Cell: "/components/admin/PackageCells#PackagePriceCell",
                },
              },
            },
          ],
        },
        {
          name: "summary",
          type: "textarea",
          required: true,
          maxLength: SUMMARY_MAX,
          admin: {
            description: `A sentence or two describing this package. Up to ${SUMMARY_MAX} characters, about three lines on a phone.`,
          },
        },
        {
          name: "features",
          type: "array",
          labels: {
            singular: "Feature",
            plural: "Features",
          },
          maxRows: FEATURES_MAX,
          admin: {
            components: {
              // Compact rows like Header/Nav's links instead of Payload's
              // collapsible array cards — see PackageFeaturesField.tsx.
              Field: "/components/admin/PackageFeaturesField#default",
              // History's comparison otherwise labels rows "Item 01", "Item 02".
              Diff: "/components/admin/FeaturesDiff#default",
            },
          },
          fields: [
            {
              name: "text",
              type: "text",
              required: true,
              maxLength: FEATURE_MAX,
            },
          ],
        },
      ],
    },
    {
      type: "collapsible",
      label: "Where it links",
      admin: { initCollapsed: false },
      fields: [
        {
          name: "category",
          type: "relationship",
          relationTo: "categories",
          required: true,
          hasMany: false,
          // Same picker as Albums: categories are only made on the Categories
          // page, in their drag order, and never "Other" (CRM-only). Trashed
          // ones are left out by Payload already.
          filterOptions: { slug: { not_equals: OTHER_SESSION_TYPE } },
          admin: {
            description: "Which category this package belongs to. Its View gallery button opens that category's page.",
            placeholder: "Choose a category",
            allowCreate: false,
            allowEdit: false,
            sortOptions: "_order",
          },
        },
        {
          name: "album",
          type: "relationship",
          relationTo: "events",
          hasMany: false,
          label: "Sample photos from album",
          // Only live albums in this package's category. Trashed ones are left
          // out by Payload already.
          filterOptions: ({ data }) => {
            const categoryId = idOf(data?.category);
            return {
              category: { equals: categoryId ?? 0 },
              published: { equals: true },
            };
          },
          validate: validateAlbum,
          admin: {
            description:
              "Optional. A few photos from this album show beside the package in 'Popular right now', so only while it's the featured package. Only live albums in this package's category are listed.",
            placeholder: "Choose an album",
            allowCreate: false,
            allowEdit: false,
            sortOptions: "-sortDate",
            components: {
              afterInput: ["/components/admin/AlbumMatchNote#default"],
            },
          },
        },
      ],
    },
    {
      // Retired: replaced by `album` above (the package's photos now come
      // from one album). Hidden and unread, kept so its table isn't dropped.
      name: "gallery",
      type: "relationship",
      relationTo: "photos",
      hasMany: true,
      admin: {
        hidden: true,
        disableListColumn: true,
        disableListFilter: true,
      },
    },
    {
      // Retired: the Featured Offer global's "Featured package" dropdown
      // picks the spotlighted package now (globals/FeaturedOffer.ts). Kept,
      // hidden and unread, so the column isn't dropped; the one-time
      // carry-over is src/scripts/carryOverFeaturedPackage.ts.
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
