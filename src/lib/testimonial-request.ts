// Client-side seam for the public testimonial submission form
// (TestimonialRequestForm.tsx, /testimonial-request/[token]) — mirrors
// src/lib/inquiries.ts's submitInquiry. Photos are uploaded one at a time
// via uploadTestimonialPhoto, each straight from the browser to R2 (see
// lib/testimonial-uploads.ts), before the final submitTestimonialRequest
// call.

export type UploadPhotoResult = { success: true; id: number } | { success: false; error: string };

const UPLOAD_FAILED = "Failed to upload that photo.";

async function postJSON(url: string, body: unknown) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await response.json().catch(() => null);
  return { ok: response.ok, json };
}

export async function uploadTestimonialPhoto(
  token: string,
  file: File,
): Promise<UploadPhotoResult> {
  try {
    // 1. A signed link for this one photo.
    const link = await postJSON("/api/testimonial-photos/upload-link", {
      token,
      size: file.size,
      type: file.type,
    });
    if (!link.ok || !link.json?.url) {
      return { success: false, error: link.json?.error ?? UPLOAD_FAILED };
    }

    // 2. The photo itself, straight to storage. The link only accepts this
    //    exact size and type.
    const put = await fetch(link.json.url, {
      method: "PUT",
      headers: { "Content-Type": link.json.contentType },
      body: file,
    });
    if (!put.ok) return { success: false, error: UPLOAD_FAILED };

    // 3. Checked and saved.
    const saved = await postJSON("/api/testimonial-photos", {
      token,
      slot: link.json.slot,
      name: file.name,
    });
    if (!saved.ok || !saved.json?.success) {
      return { success: false, error: saved.json?.error ?? UPLOAD_FAILED };
    }
    return { success: true, id: saved.json.id };
  } catch {
    return { success: false, error: UPLOAD_FAILED };
  }
}

export type SubmitTestimonialInput = {
  token: string;
  testimonialText: string;
  socialLink?: string;
  privateNotes?: string;
  photoIds: number[];
};

export type SubmitTestimonialResult = { success: true } | { success: false; error: string };

export async function submitTestimonialRequest(
  input: SubmitTestimonialInput,
): Promise<SubmitTestimonialResult> {
  try {
    const response = await fetch("/api/testimonial-submissions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      return { success: false, error: body?.error ?? "Failed to save your testimonial." };
    }
    return { success: true };
  } catch {
    return { success: false, error: "Failed to save your testimonial." };
  }
}
