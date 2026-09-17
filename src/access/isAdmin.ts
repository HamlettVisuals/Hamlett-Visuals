import type { Access, FieldAccess } from "payload";

// Every collection in this CMS is edited from inside /hv-studio by one
// person. `access: true` on a Payload collection would also open its REST/GraphQL
// endpoints to the public internet, so every collection and global gets an
// explicit access config instead of relying on Payload's defaults.

export const isAdmin: Access = ({ req: { user } }) => Boolean(user);

export const isAdminFieldLevel: FieldAccess = ({ req: { user } }) =>
  Boolean(user);

// Shared access config for the Globals below: every one of them is public,
// read-only, editorial content (nav labels, hero copy, footer links, etc.),
// so it's readable by anyone but only editable from inside /hv-studio.
export const publicReadAdminWrite = {
  read: () => true,
  update: isAdmin,
  readVersions: isAdmin,
};

