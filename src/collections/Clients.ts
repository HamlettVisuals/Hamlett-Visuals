import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// A client can have multiple Inquiries over time (e.g. a wedding, then a
// portrait session a year later) — see Inquiries.ts's `client` relationship
// and the isRepeatClient hook that uses it to flag repeat business.
export const Clients: CollectionConfig = {
  slug: "clients",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    hideAPIURL: true,
    useAsTitle: "name",
    defaultColumns: ["name", "email", "phone"],
    description: "Everyone who's booked or inquired — link an Inquiry to a Client to track repeat business.",
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
      required: true,
      admin: {
        description: "The client's name.",
      },
    },
    {
      name: "email",
      type: "email",
      admin: {
        description: "The client's email address.",
      },
    },
    {
      name: "phone",
      type: "text",
      admin: {
        description: "The client's phone number.",
      },
    },
  ],
  timestamps: true,
};
