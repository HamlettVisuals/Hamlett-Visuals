import type { FilterOptions, GlobalBeforeChangeHook, GlobalConfig, Where } from "payload";
import { publicReadAdminWrite } from "#src/access/isAdmin.ts";
import { instagramUsername, validateInstagramHandle } from "#src/lib/contact-details.ts";
import { DEFAULT_ACCOUNTS, normalizeAccounts, type AccountRow } from "#src/lib/instagram-accounts.ts";
import { mockInstagramAllowed } from "#src/lib/instagram-connection.ts";
import { FEATURED_MAX, HEADING_MAX, LABEL_MAX } from "#src/lib/instagram-limits.ts";
import { serverURL } from "#src/lib/server-url.ts";

// The homepage "Recent on Instagram" section (components/home/Instagram.tsx):
// up to two Instagram accounts, each with its own label, Visible switch and
// featured posts. The posts themselves are synced copies
// (collections/InstagramPosts.ts); the page never reads Instagram directly.
// Connection status and tokens live elsewhere (InstagramConnections.ts,
// InstagramTokens.ts) and are written only by the server.
//
// `accounts` is always two rows, slot 1 then slot 2 (lib/instagram-accounts.ts
// puts it back into that shape on every save). An account's Visible switch
// only counts while that account is connected: the studio locks it until
// then (components/admin/Instagram/VisibleField.tsx) and the homepage
// ignores it, but her choice is kept, so connecting the account later shows
// it (or not) as she left it.

// Featured picks come from that account's own synced posts, and never mock
// ones where mock posts aren't allowed. Also checked on save.
const featuredOptions: FilterOptions = ({ siblingData }) => {
  const slot = (siblingData as AccountRow | undefined)?.slot;
  const and: Where[] = [{ "connection.slot": { equals: slot ?? 0 } }];
  if (!mockInstagramAllowed()) and.push({ isMock: { not_equals: true } });
  return { and };
};

const keepAccountsInShape: GlobalBeforeChangeHook = ({ data }) => {
  data.accounts = normalizeAccounts(data.accounts as AccountRow[] | undefined);
  return data;
};

export const InstagramSection: GlobalConfig = {
  slug: "instagram-section",
  label: "Instagram Section",
  admin: {
    hideAPIURL: true,
    components: {
      elements: {
        SaveButton: "/components/admin/PublishButton#default",
        beforeDocumentControls: [
          "/components/admin/EditHistory#default",
          "/components/admin/PreviewSizeButtons#default",
        ],
      },
    },
    group: "Homepage",
    description:
      "The 'Recent on Instagram' section on your homepage. Pick which accounts to show and the posts you want first.",
    livePreview: {
      openByDefault: true,
      url: () => `${serverURL}/#live-preview:instagram`,
    },
  },
  access: publicReadAdminWrite,
  // History only — no drafts, so the one button saves straight to the live
  // site. See components/admin/PublishButton.tsx.
  versions: true,
  hooks: {
    beforeChange: [keepAccountsInShape],
  },
  fields: [
    {
      name: "showOnHomepage",
      type: "checkbox",
      label: "Show on homepage",
      defaultValue: true,
      admin: {
        description: "Turn off to hide this section from your homepage. Your accounts and picks are kept.",
        // The same switch and Live / Hidden pill as "Show on website".
        components: { Field: "/components/admin/ShowOnWebsiteField#default" },
      },
    },
    {
      name: "heading",
      type: "text",
      required: true,
      defaultValue: "Recent on Instagram",
      maxLength: HEADING_MAX,
      admin: {
        description: `The title of this section. Up to ${HEADING_MAX} characters, so it stays on one line on phones.`,
      },
    },
    {
      name: "accounts",
      type: "array",
      label: "Accounts",
      minRows: 2,
      maxRows: 2,
      defaultValue: DEFAULT_ACCOUNTS,
      admin: {
        // Two fixed cards (components/admin/Instagram): no adding, removing
        // or reordering rows (hidden by .ig-accounts in admin-overrides.css,
        // and put back by keepAccountsInShape if sent anyway).
        className: "ig-accounts",
        isSortable: false,
        initCollapsed: false,
        components: { RowLabel: "/components/admin/Instagram/AccountRowLabel#default" },
        description:
          "Up to two Instagram accounts. With one shown, the section is a 3×3 grid; with both, each gets its own labelled 3×2 grid.",
      },
      fields: [
        {
          // 1 or 2; which connection (InstagramConnections.ts) this row is.
          name: "slot",
          type: "number",
          required: true,
          admin: { hidden: true, readOnly: true },
        },
        {
          // Status, last sync, Sync now / Connect.
          name: "accountHeader",
          type: "ui",
          admin: { components: { Field: "/components/admin/Instagram/AccountHeader#default" } },
        },
        {
          // Saved as "@username" whichever way she typed it, like Site
          // Settings' Instagram username.
          name: "handle",
          type: "text",
          label: "Instagram username",
          validate: (value: string | null | undefined) => validateInstagramHandle(value),
          hooks: {
            beforeChange: [
              ({ value }) => {
                const username = instagramUsername(value);
                return username ? `@${username}` : value;
              },
            ],
          },
          admin: {
            description: "With or without the @. Used for the 'Follow' link under this account's posts.",
          },
        },
        {
          name: "label",
          type: "text",
          maxLength: LABEL_MAX,
          admin: {
            description: `Shown above this account's posts when both accounts are on your homepage, e.g. "Weddings". Up to ${LABEL_MAX} characters.`,
          },
        },
        {
          name: "visible",
          type: "checkbox",
          label: "Show on homepage",
          defaultValue: false,
          admin: {
            components: { Field: "/components/admin/Instagram/VisibleField#default" },
          },
        },
        {
          name: "featured",
          type: "relationship",
          relationTo: "instagram-posts",
          hasMany: true,
          maxRows: FEATURED_MAX,
          label: "Featured posts",
          filterOptions: featuredOptions,
          admin: {
            isSortable: true,
            allowCreate: false,
            allowEdit: false,
            components: { Field: "/components/admin/Instagram/FeaturedField#default" },
            description: `Up to ${FEATURED_MAX} posts to show first, in this order. The rest of the grid fills with your most recent posts.`,
          },
        },
      ],
    },
  ],
};
