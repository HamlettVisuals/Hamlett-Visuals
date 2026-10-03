import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// The single admin account for /hv-studio. Payload's own "create first user"
// flow (shown automatically when this collection is empty) bypasses access
// control, so her first login doesn't need a seeded user here — every rule
// below only starts applying once that first account exists, which then
// prevents anonymous self-registration.
export const Users: CollectionConfig = {
  slug: "users",
  // One admin, on her own devices: a login lasts 7 days (Payload's default
  // is 2 hours) and renews while the studio is open (admin.autoRefresh in
  // payload.config.ts). Logins are kept as server-side sessions (Payload's
  // default), so logging out really ends one. The cookie is HTTPS-only on
  // the live site; local dev runs over http.
  auth: {
    tokenExpiration: 60 * 60 * 24 * 7,
    cookies: { secure: process.env.NODE_ENV === "production" },
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "email",
    description:
      "Who can log in to this dashboard. There should normally be just one account here — yours.",
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "name",
      type: "text",
      admin: {
        description: "Your name (optional — for your own reference only).",
      },
    },
  ],
};
