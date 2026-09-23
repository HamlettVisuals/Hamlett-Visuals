// Client-side seam for the public testimonial submission form
// (TestimonialRequestForm.tsx, /testimonial-request/[token]) — mirrors
// src/lib/inquiries.ts's submitInquiry. Photos are uploaded one at a time
// via uploadTestimonialPhoto (each its own small request) before the final
// submitTestimonialRequest call, rather than bundling files + text into one
// multipart POST — see /api/testimonial-photos/route.ts's header comment
// for why.

export type UploadPhotoResult = { success: true; id: number } | { success: false; error: string };

export async function uploadTestimonialPhoto(
  token: string,
  file: File,
): Promise<UploadPhotoResult> {
  try {
    const formData = new FormData();
    formData.set("token", token);
    formData.set("file", file);
    const response = await fetch("/api/testimonial-photos", {
      method: "POST",
      body: formData,
    });
    const body = await response.json().catch(() => null);
    if (!response.ok || !body?.success) {
      return { success: false, error: body?.error ?? "Failed to upload that photo." };
    }
    return { success: true, id: body.id };
  } catch {
    return { success: false, error: "Failed to upload that photo." };
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
