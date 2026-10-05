import type { CollectionAfterChangeHook, CollectionAfterOperationHook, CollectionBeforeOperationHook, CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { endOtherSessions, sessionIdFromToken } from "#src/lib/user-sessions.ts";

// A new password ends every other login (lib/user-sessions.ts): a lost
// phone stops working as soon as she changes it. Changing it on the account
// page keeps the device she's on; resetting it from the emailed link keeps
// only the login the reset itself makes.
const notePasswordChange: CollectionBeforeOperationHook = ({ args, operation, req }) => {
  const password = (args as { data?: { password?: unknown } }).data?.password;
  if (operation === "update" && typeof password === "string" && password) {
    req.context.passwordChanged = true;
  }
  return args;
};

const endSessionsAfterPasswordChange: CollectionAfterChangeHook = async ({ doc, operation, req }) => {
  if (operation !== "update" || req.context.passwordChanged !== true) return doc;
  const own = req.user && String(req.user.id) === String(doc.id);
  await endOtherSessions(req, doc.id, own ? ((req.user as { _sid?: string })._sid ?? null) : null);
  return doc;
};

const endSessionsAfterReset: CollectionAfterOperationHook = async ({ operation, req, result }) => {
  if (operation !== "resetPassword") return result;
  const { token, user } = (result ?? {}) as { token?: string; user?: { id: number | string } };
  if (user?.id != null) await endOtherSessions(req, user.id, sessionIdFromToken(token));
  return result;
};

// The single admin account for /hv-studio. Payload's own "create first user"
// flow (shown automatically when this collection is empty) bypasses access
// control, so her first login doesn't need a seeded user here — every rule
// below only starts applying once that first account exists, which then
// prevents anonymous self-registration.
export const Users: CollectionConfig = {
  slug: "users",
  // One admin, on her own devices: a login lasts 30 days (Payload's default
  // is 2 hours) and renews while the studio is open (admin.autoRefresh in
  // payload.config.ts). Logins are kept as server-side sessions (Payload's
  // default), so logging out really ends one. The cookie is HTTPS-only on
  // the live site; local dev runs over http.
  auth: {
    tokenExpiration: 60 * 60 * 24 * 30, // 2592000
    cookies: { secure: process.env.NODE_ENV === "production" },
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "email",
    description:
      "Who can log in to this dashboard. There should normally be just one account here — yours.",
  },
  hooks: {
    beforeOperation: [notePasswordChange],
    afterChange: [endSessionsAfterPasswordChange],
    afterOperation: [endSessionsAfterReset],
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
    {
      // "Sign out everywhere", on her own account page only
      // (components/admin/SignOutEverywhere.tsx).
      name: "signOutEverywhere",
      type: "ui",
      admin: {
        disableListColumn: true,
        components: { Field: "/components/admin/SignOutEverywhere#default" },
      },
    },
  ],
};
