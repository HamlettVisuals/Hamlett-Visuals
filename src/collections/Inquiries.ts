import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// Extends the conceptual `inquiries` table in src/lib/inquiries.ts (currently
// backed by a simulated submitInquiry()) into a full CRM collection. Wiring
// the site's two contact forms (AskQuestionPanel, BookingForm) to actually
// write here is a follow-up — see that file's header comment.
export const Inquiries: CollectionConfig = {
  slug: "inquiries",
  admin: {
    useAsTitle: "name",
    defaultColumns: ["status", "type", "name", "createdAt"],
    description:
      "Every question and booking request submitted through the site's contact forms — your inbox for new client inquiries.",
  },
  access: {
    // No public create access yet — the forms aren't wired to this collection
    // (see the follow-up note above), so nothing needs to write here except
    // an authenticated admin.
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "type",
      type: "select",
      required: true,
      options: [
        { label: "Question", value: "question" },
        { label: "Booking", value: "booking" },
      ],
      defaultValue: "question",
      admin: {
        description:
          "Whether this came in as a general question or a booking request.",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "new",
      options: [
        { label: "New", value: "new" },
        { label: "Contacted", value: "contacted" },
        { label: "Booked", value: "booked" },
        { label: "Declined", value: "declined" },
        { label: "Completed", value: "completed" },
      ],
      admin: {
        description:
          "Where this inquiry stands. You can change this right from the list below, no need to open the entry.",
        components: {
          Cell: "/components/admin/InquiryStatusCell#default",
        },
      },
    },
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
      required: true,
      admin: {
        description: "The client's email address.",
      },
    },
    {
      name: "phone",
      type: "text",
      admin: {
        description: "The client's phone number, if they gave one.",
      },
    },
    {
      name: "message",
      type: "textarea",
      required: true,
      admin: {
        description: "What the client wrote.",
      },
    },
    {
      name: "preferredDate",
      type: "date",
      admin: {
        description: "The date they asked about, if any.",
      },
    },
    {
      name: "sourcePage",
      type: "text",
      admin: {
        description:
          "Which page of the site this was submitted from. Filled in automatically — not something to edit.",
        position: "sidebar",
        readOnly: true,
      },
    },
    {
      name: "notes",
      type: "textarea",
      admin: {
        description:
          "Your own private notes about this inquiry — the client never sees these.",
        position: "sidebar",
      },
    },
  ],
  timestamps: true,
};
