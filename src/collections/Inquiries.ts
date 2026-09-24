import type { CollectionBeforeChangeHook, CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";
import { sendInquiryEmails } from "#src/hooks/sendInquiryEmails.ts";
import { logRepeatClient } from "#src/hooks/repeatClient.ts";

// Auto-archives an inquiry once its wrap-up checklist is complete, so the
// kanban board (a later phase) can filter it out and the default admin list
// view can double as an "Archive" view when filtered to archived: true.
const autoArchive: CollectionBeforeChangeHook = ({ data }) => {
  if (data.stage === "wrapup" && data.testimonialReceived && data.addedToSite) {
    data.archived = true;
  }
  return data;
};

// Seeds a tentative shootDate from preferredDate on creation only, so a
// fresh Lead already has *something* to show as its Prep-stage date instead
// of nothing. shootDateConfirmed stays at its default false either way —
// having a date present isn't the same as her having actually confirmed
// it's the real one (see DetailDrawer.tsx's "!" + Confirm affordance, and
// the auto-confirm that fires there when she edits the date herself).
const seedShootDateFromPreferred: CollectionBeforeChangeHook = ({ data, operation }) => {
  if (operation === "create" && data.preferredDate && !data.shootDate) {
    data.shootDate = data.preferredDate;
  }
  return data;
};

// The site's two contact forms (AskQuestionPanel, BookingForm) write here via
// POST /api/inquiries (src/app/api/inquiries/route.ts) — a trusted server
// route that calls payload.create() with overrideAccess: true, since the
// `create` access below stays admin-only rather than public. Keeping create
// off this collection's own access control (instead of opening it to `() =>
// true`) means the Inquiries REST/GraphQL API itself is never a public write
// target — only that one route handler, which does its own field validation
// first, can reach it on a visitor's behalf.
export const Inquiries: CollectionConfig = {
  slug: "inquiries",
  // Deletes go to this collection's Trash view first, restorable from there.
  trash: true,
  admin: {
    hideAPIURL: true,
    useAsTitle: "name",
    defaultColumns: ["status", "type", "name", "createdAt"],
    description:
      "Every question and booking request submitted through the site's contact forms — your inbox for new client inquiries.",
    components: {
      // Only renders when reached via a kanban board link carrying
      // ?from=kanban (the drawer's "Open full record", or the board's
      // "Archive" button) — see BackToBoardLink.tsx. Same component in both
      // spots: it only reads the query param and the admin route, nothing
      // specific to either view.
      edit: {
        beforeDocumentControls: ["/components/admin/BackToBoardLink#default"],
      },
      beforeList: ["/components/admin/BackToBoardLink#default"],
    },
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  hooks: {
    beforeChange: [seedShootDateFromPreferred, autoArchive],
    afterChange: [sendInquiryEmails, logRepeatClient],
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
      // The authoritative booking-vs-question split for the CRM side of
      // things: gates whether `category` is required (see its own validate
      // below), whether `questionHandled` shows, and which inquiries the
      // kanban board's Lead column pulls in — questions get their own panel
      // in a later phase instead. Distinct from `type` above, which is
      // older, purely descriptive, and still just drives the board cards'
      // "Question"/"Booking" label.
      name: "inquiryType",
      type: "select",
      required: true,
      defaultValue: "booking",
      options: [
        { label: "Booking", value: "booking" },
        { label: "Question", value: "question" },
      ],
    },
    {
      name: "questionHandled",
      type: "checkbox",
      defaultValue: false,
      admin: {
        condition: (data) => data.inquiryType === "question",
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
      // Renders the "Request a testimonial from [name]?" banner (once
      // status is Completed and no request has gone out yet) or a smaller
      // "Resend" action (once one has) — see TestimonialRequestBanner.tsx.
      // A `ui` field rather than a `beforeDocument` admin component so it
      // can use `admin.condition` for the Completed-only visibility, same
      // mechanism Backstage.ts's reelUrl field uses.
      name: "testimonialRequestBanner",
      type: "ui",
      admin: {
        condition: (data) => data?.status === "completed",
        components: {
          Field: "/components/admin/TestimonialRequestBanner#default",
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
      name: "client",
      type: "relationship",
      relationTo: "clients",
      hasMany: false,
      admin: {
        description:
          "Link this inquiry to a Client record to track their history with you.",
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
      // Drives which kanban column the card sits in on the CRM board (a
      // later phase). Distinct from `type` above, which just marks whether
      // this came in as a question or a booking request.
      name: "stage",
      type: "select",
      required: true,
      defaultValue: "lead",
      options: [
        { label: "Lead", value: "lead" },
        { label: "Planning", value: "planning" },
        { label: "Prep", value: "prep" },
        { label: "Shoot Complete", value: "shoot" },
        { label: "Post-Production", value: "post" },
        { label: "Wrap-Up", value: "wrapup" },
      ],
      admin: {
        description: "Where this inquiry stands in the booking pipeline.",
      },
    },
    {
      name: "postProductionStatus",
      type: "select",
      options: [
        { label: "Editing", value: "editing" },
        { label: "Edited", value: "edited" },
        { label: "Sent", value: "sent" },
      ],
      admin: {
        description: "Sub-status while this is in Post-Production.",
        condition: (data) => data.stage === "post",
      },
    },
    {
      // Both must be true before the auto-archive hook fires (a later
      // phase) and sets `archived` below.
      name: "testimonialReceived",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Whether the client's testimonial has come in.",
        condition: (data) => data.stage === "wrapup",
      },
    },
    {
      name: "addedToSite",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Whether this shoot has been added to the site.",
        condition: (data) => data.stage === "wrapup",
      },
    },
    {
      name: "archived",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Set automatically once the wrap-up checklist is complete — not something to edit directly.",
        readOnly: true,
        position: "sidebar",
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      hasMany: false,
      // Payload's static `required: true` can't be conditional — this is
      // the dynamic equivalent, only enforced for bookings. Question-type
      // inquiries (AskQuestionPanel) never collect a category, so requiring
      // one there would make every question fail validation.
      //
      // `data` is typed `Partial<unknown>` by Payload's own
      // RelationshipFieldSingleValidation (it doesn't parametrize this
      // collection's actual shape) — the cast just recovers the one field
      // read here, it doesn't change the runtime check.
      validate: (value, { data }) => {
        const inquiryType = (data as { inquiryType?: string } | undefined)?.inquiryType;
        if (inquiryType !== "booking" || value) return true;
        return "Category is required for booking inquiries.";
      },
      admin: {
        description: "Which category this shoot belongs to.",
      },
    },
    {
      name: "shootDate",
      type: "date",
      admin: {
        description: "The confirmed date of the shoot.",
      },
    },
    {
      // Distinct from just *having* a shootDate — seedShootDateFromPreferred
      // above can populate shootDate on creation from a client's requested
      // date, which is only ever tentative until she says otherwise. Stays
      // false until she either clicks "Confirm" on the drawer's "!"
      // indicator or edits the date herself (both count as confirming it).
      name: "shootDateConfirmed",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description: "Whether the shoot date is locked in, not just a placeholder from the client's requested date.",
      },
    },
    {
      name: "deliveryDeadline",
      type: "date",
      admin: {
        description: "When the finished photos are due to the client.",
      },
    },
    {
      name: "location",
      type: "group",
      fields: [
        { name: "street", type: "text" },
        { name: "city", type: "text" },
        { name: "state", type: "text" },
      ],
    },
    {
      name: "price",
      type: "number",
      admin: {
        description: "The agreed price for this shoot.",
      },
    },
    {
      name: "paymentStatus",
      type: "select",
      options: [
        { label: "Unpaid", value: "unpaid" },
        { label: "Deposit paid", value: "deposit" },
        { label: "Paid in full", value: "paid" },
      ],
      admin: {
        description: "Where payment stands for this shoot.",
      },
    },
    {
      name: "source",
      type: "select",
      options: [
        { label: "Website form", value: "website" },
        { label: "Manual — social", value: "manual_social" },
        { label: "Manual — email", value: "manual_email" },
        { label: "Manual — referral", value: "manual_referral" },
      ],
      admin: {
        description: "How this inquiry came in.",
      },
    },
    {
      name: "prepChecklist",
      type: "array",
      fields: [
        { name: "item", type: "text" },
        { name: "completed", type: "checkbox", defaultValue: false },
      ],
      admin: {
        description: "Freeform prep tasks for this shoot.",
      },
    },
    {
      name: "postProductionChecklist",
      type: "array",
      fields: [
        { name: "item", type: "text" },
        { name: "completed", type: "checkbox", defaultValue: false },
      ],
      admin: {
        description: "Freeform post-production tasks for this shoot.",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      hasMany: false,
      admin: {
        description:
          "The shoot this inquiry turned into, once you've created it. Leave empty until then — this is what lets you request a testimonial for this client.",
        position: "sidebar",
      },
    },
    {
      name: "testimonialRequestSent",
      type: "checkbox",
      defaultValue: false,
      admin: {
        description:
          "Whether a testimonial request email has been sent to this client. Set automatically — use the \"Resend\" option above rather than editing this directly.",
        position: "sidebar",
        readOnly: true,
      },
    },
    {
      name: "testimonialRequestSentAt",
      type: "date",
      admin: {
        description: "When the testimonial request email was last sent. Filled in automatically.",
        position: "sidebar",
        readOnly: true,
      },
    },
    {
      // A cryptographically random, single-use token for the public
      // /testimonial-request/[token] submission form (Phase 3) to validate
      // against — proves the visitor followed the emailed link rather than
      // guessing a URL. Regenerated on every send/resend (invalidating any
      // previous link), and cleared once a submission consumes it, so a link
      // can't be reused. Lives on Inquiries rather than a separate record:
      // there's at most one live request per inquiry at a time, guarded by
      // testimonialRequestSent above, so a dedicated join table would be
      // pure overhead. Hidden from the admin form — she never needs to see
      // or edit it, only the "Request a testimonial" banner (Field component
      // below) that generates and emails it.
      name: "testimonialRequestToken",
      type: "text",
      unique: true,
      index: true,
      admin: {
        hidden: true,
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
