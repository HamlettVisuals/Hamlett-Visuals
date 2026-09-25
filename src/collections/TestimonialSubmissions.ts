import type { CollectionConfig } from "payload";
import { isAdmin } from "#src/access/isAdmin.ts";

// A client's response to a testimonial request (see the `event` /
// `testimonialRequestSent` fields on Inquiries, and the public submission
// form at /testimonial-request/[token]). This collection's own `create`
// access stays admin-only, same as Inquiries — the public submission route
// is the one trusted place allowed to create a record here on a visitor's
// behalf, via overrideAccess, after validating the token server-side.
//
// name/email/category/event are carried forward automatically from the
// linked Inquiry (category via the Inquiry's linked Event, since Inquiries
// itself has no category field) at submission time — not left editable on
// the public form, but she can correct them here in /hv-studio before
// publishing (Phase 4) since an auto-carried category/event could be wrong.
export const TestimonialSubmissions: CollectionConfig = {
  slug: "testimonial-submissions",
  labels: {
    singular: "Testimonial Submission",
    plural: "Testimonial Submissions",
  },
  admin: {
    hideAPIURL: true,
    useAsTitle: "name",
    defaultColumns: ["name", "category", "status", "createdAt"],
    description:
      "Testimonials clients have submitted through their request link — review, correct, and publish the ones you'd like to show on the site.",
  },
  access: {
    create: isAdmin,
    read: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: "inquiry",
      type: "relationship",
      relationTo: "inquiries",
      required: true,
      hasMany: false,
      admin: {
        description: "The inquiry this testimonial request was sent for.",
        position: "sidebar",
      },
    },
    {
      name: "name",
      type: "text",
      required: true,
      admin: {
        description: "Carried forward from the linked inquiry at submission time.",
      },
    },
    {
      name: "email",
      type: "email",
      required: true,
      admin: {
        description: "Carried forward from the linked inquiry at submission time.",
      },
    },
    {
      name: "category",
      type: "relationship",
      relationTo: "categories",
      hasMany: false,
      admin: {
        description:
          "Carried forward from the linked event's category at submission time, if it had one. Correct it here if needed before publishing.",
      },
    },
    {
      name: "event",
      type: "relationship",
      relationTo: "events",
      hasMany: false,
      admin: {
        description:
          "Carried forward from the linked inquiry at submission time. Correct it here if needed before publishing.",
      },
    },
    {
      name: "testimonialText",
      type: "textarea",
      required: true,
      admin: {
        description: "The testimonial, word for word as the client wrote it.",
      },
    },
    {
      name: "photos",
      type: "upload",
      relationTo: "testimonial-photos",
      hasMany: true,
      admin: {
        description:
          "Photos the client attached, if any. Private until you promote one into the Photos library when publishing.",
      },
    },
    {
      // Renders the "Publish this testimonial" panel (photo picker, a pointer
      // to the homepage picker in Testimonials Teaser, and the Publish
      // button) once status is Pending — see
      // TestimonialPublishPanel.tsx and its route,
      // /api/testimonial-submissions/[id]/publish/route.ts. Same `ui` field +
      // `admin.condition` mechanism as Inquiries.testimonialRequestBanner.
      name: "publishPanel",
      type: "ui",
      admin: {
        condition: (data) => data?.status === "pending",
        components: {
          Field: "/components/admin/TestimonialPublishPanel#default",
        },
      },
    },
    {
      name: "socialLink",
      type: "text",
      admin: {
        description:
          "An Instagram/Facebook link the client shared, if any. Reference only — not part of the published testimonial.",
      },
    },
    {
      name: "privateNotes",
      type: "text",
      admin: {
        description:
          "Anything the client wanted you to know privately. Visible only to you here — never copied into a published testimonial.",
        position: "sidebar",
      },
    },
    {
      name: "status",
      type: "select",
      required: true,
      defaultValue: "pending",
      options: [
        { label: "Pending", value: "pending" },
        { label: "Published", value: "published" },
      ],
      admin: {
        description: "Whether this submission has been published as a real Testimonial yet.",
        position: "sidebar",
      },
    },
  ],
  timestamps: true,
};
