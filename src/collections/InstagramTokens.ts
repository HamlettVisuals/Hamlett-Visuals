import type { CollectionConfig, FieldAccess } from "payload";

// The Instagram access token for each connection (InstagramConnections.ts),
// kept apart from everything else so no query for a connection, a post or
// the Instagram Section global can ever carry it along. Every API
// operation is refused, signed in or not, and the collection is hidden from
// the studio; only server code (the sync, the token refresh and the connect
// flow) reads and writes it through the Local API, which skips access
// control. Never select from this in anything that renders or responds.
const never = () => false;
const neverField: FieldAccess = () => false;

export const InstagramTokens: CollectionConfig = {
  slug: "instagram-tokens",
  labels: { singular: "Instagram Token", plural: "Instagram Tokens" },
  admin: {
    hidden: true,
    hideAPIURL: true,
  },
  access: {
    read: never,
    create: never,
    update: never,
    delete: never,
  },
  fields: [
    {
      name: "connection",
      type: "relationship",
      relationTo: "instagram-connections",
      required: true,
      unique: true,
    },
    {
      // Field-level too, so even an access rule loosened by mistake above
      // wouldn't hand these out.
      name: "accessToken",
      type: "text",
      required: true,
      access: { read: neverField, create: neverField, update: neverField },
    },
    {
      name: "expiresAt",
      type: "date",
      access: { read: neverField, create: neverField, update: neverField },
    },
  ],
};
