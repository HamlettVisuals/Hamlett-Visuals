// Client-side seam for the site's two contact forms (AskQuestionPanel,
// BookingForm) — both call submitInquiry and only react to its return value,
// so POST /api/inquiries (src/app/api/inquiries/route.ts) is the only thing
// that needs to change if the write path ever moves again. Field names
// mirror the Inquiries collection exactly (src/collections/Inquiries.ts),
// since this now posts straight into that schema.

export type InquiryType = "question" | "booking";

export type InquiryInput = {
  type: InquiryType;
  // The CRM-side booking/question split (see src/collections/Inquiries.ts) —
  // gates whether `category` is required. BookingForm sends "booking" with
  // its session-type select's value as `category`; AskQuestionPanel sends
  // "question" and omits `category` entirely, since it never collects one.
  inquiryType: InquiryType;
  name: string;
  email: string;
  phone?: string;
  message: string;
  preferredDate?: string;
  category?: number;
  location?: {
    street?: string;
    city?: string;
    state?: string;
  };
  sourcePage: string;
};

export type SubmitInquiryResult = { success: true } | { success: false };

export async function submitInquiry(
  data: InquiryInput,
): Promise<SubmitInquiryResult> {
  try {
    const response = await fetch("/api/inquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return response.ok ? { success: true } : { success: false };
  } catch {
    return { success: false };
  }
}
