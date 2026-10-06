import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { CONNECTION_STATUSES } from "#src/lib/instagram-connection.ts";

// One row per connected Instagram account slot (1 or 2, matching the
// Instagram Section global's two account cards): whether it's connected,
// when it last synced and what went wrong if it didn't. Written only by the
// server (the sync and, later, the connect flow) through the Local API, so
// the studio can read it for the cards but nobody can change it through the
// API. Its access token is NOT here: it's in Instagram Tokens, which
// nothing outside the server can read at all.
//
// Not in the studio's side menu (SiteNav.tsx); shown only on the Instagram
// Section's account cards.
export const InstagramConnections: CollectionConfig = {
  slug: "instagram-connections",
  labels: { singular: "Instagram Connection", plural: "Instagram Connections" },
  admin: {
    hidden: true,
    hideAPIURL: true,
    useAsTitle: "username",
  },
  access: {
    read: isAdmin,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: "slot",
      type: "number",
      required: true,
      unique: true,
      min: 1,
      max: 2,
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "not_connected",
      options: [...CONNECTION_STATUSES],
    },
    {
      // The account's username and id as Instagram reports them.
      name: "username",
      type: "text",
    },
    {
      name: "igUserId",
      type: "text",
    },
    {
      // Connected through the mock provider (lib/instagram-connection.ts):
      // never counts as connected on the live site.
      name: "isMock",
      type: "checkbox",
      defaultValue: false,
    },
    {
      name: "lastSyncedAt",
      type: "date",
      admin: { date: { pickerAppearance: "dayAndTime" } },
    },
    {
      // Why the last sync failed, in plain words; cleared by the next good one.
      name: "lastError",
      type: "text",
    },
  ],
};
