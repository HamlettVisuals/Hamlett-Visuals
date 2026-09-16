// Data-layer seam for the site's two contact forms (AskQuestionPanel today,
// BookingForm eventually). `Inquiry` models the future shared `inquiries`
// table; `InquiryInput` is the subset a client actually submits — `id`,
// `status` and `created_at` are server-side concerns (primary key, default
// 'new', insert timestamp) and never come from the browser.
//
// submitInquiry is the only thing that needs to change once there's a real
// API route: swap its body for `await fetch("/api/inquiries", { method:
// "POST", body: JSON.stringify(data) })` and everything upstream (the
// submitting/success/error state machine in AskQuestionPanel) keeps working
// unmodified, since it already only reacts to this function's return value.

export type InquiryType = "question" | "booking";
export type InquiryStatus = "new" | "read" | "replied" | "archived";

export type Inquiry = {
  id: string; // uuid, server-generated
  type: InquiryType;
  name: string;
  email: string;
  message: string;
  source_page: string;
  status: InquiryStatus; // defaults to 'new', set server-side
  created_at: string; // ISO timestamp, set server-side
};

export type InquiryInput = Pick<
  Inquiry,
  "type" | "name" | "email" | "message" | "source_page"
>;

export type SubmitInquiryResult = { success: true } | { success: false };

// Stands in for the real network latency until there's an endpoint to hit.
const SIMULATED_LATENCY_MS = 600;

export async function submitInquiry(
  data: InquiryInput,
): Promise<SubmitInquiryResult> {
  console.log("[inquiries] submitInquiry", data);
  await new Promise((resolve) => setTimeout(resolve, SIMULATED_LATENCY_MS));
  return { success: true };
}
