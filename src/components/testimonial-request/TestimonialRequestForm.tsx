"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  submitTestimonialRequest,
  uploadTestimonialPhoto,
} from "@/lib/testimonial-request";
import { MB, PUBLIC_PHOTO_MAX_MB } from "@/lib/upload-sizes";

// The real form on /testimonial-request/[token], once the page has already
// validated the token server-side and rendered the read-only name/email/
// category/event context above this. Only `token` is needed here for the
// actual submit — the carried-forward fields live server-side (see
// /api/testimonial-submissions/route.ts), never as editable inputs.
//
// Selected photos upload one at a time, each straight to storage (see
// uploadTestimonialPhoto and lib/testimonial-uploads.ts), before the final
// submit. The size and count caps here match the server's own, so a photo
// that's too big or one too many is caught before anything is sent.
const MAX_PHOTO_BYTES = PUBLIC_PHOTO_MAX_MB * MB;
const MAX_PHOTOS = 10; // lib/testimonial-uploads.ts, MAX_PHOTOS_PER_LINK

type Status = "idle" | "submitting" | "success" | "error";

export default function TestimonialRequestForm({
  token,
  name,
  ownerLabel,
}: {
  token: string;
  name: string;
  ownerLabel: string;
}) {
  const [status, setStatus] = useState<Status>("idle");
  const [textError, setTextError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [files, setFiles] = useState<File[]>([]);

  const textRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  // Photos already uploaded, so "Try again" after a failed submit doesn't
  // upload them a second time (and count them twice towards the cap).
  const uploadedIds = useRef(new Map<File, number>());

  // A client's camera roll is all indistinguishable IMG_XXXX.jpg names —
  // the thumbnail, not the filename, is what actually lets them confirm
  // which photo is which before submitting. Derived (not stored as its
  // own state) so it's always in sync with `files`, including a single
  // removal; the list is always small enough that recomputing is cheap.
  const previewUrls = useMemo(
    () => files.map((file) => URL.createObjectURL(file)),
    [files],
  );
  useEffect(() => {
    return () => {
      previewUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [previewUrls]);

  const handleFilesChosen = (fileList: FileList | null) => {
    const chosen = fileList ? Array.from(fileList) : [];
    const oversized = chosen.filter((file) => file.size > MAX_PHOTO_BYTES);
    const refuse = (message: string) => {
      setFileError(message);
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    if (oversized.length > 0) {
      refuse(
        `${oversized.map((file) => file.name).join(", ")} — over ${PUBLIC_PHOTO_MAX_MB}MB. Please choose smaller photos.`,
      );
      return;
    }
    if (chosen.length > MAX_PHOTOS) {
      refuse(`Please choose up to ${MAX_PHOTOS} photos.`);
      return;
    }
    setFileError(null);
    setFiles(chosen);
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const testimonialText = String(data.get("testimonialText") ?? "").trim();
    const socialLink = String(data.get("socialLink") ?? "").trim();
    const privateNotes = String(data.get("privateNotes") ?? "").trim();

    if (!testimonialText) {
      setTextError("Please share a few words before submitting.");
      textRef.current?.focus();
      return;
    }
    setTextError(null);
    setSubmitError(null);
    setStatus("submitting");

    try {
      const photoIds: number[] = [];
      for (const file of files) {
        let id = uploadedIds.current.get(file);
        if (id === undefined) {
          const result = await uploadTestimonialPhoto(token, file);
          if (!result.success) throw new Error(result.error);
          id = result.id;
          uploadedIds.current.set(file, id);
        }
        photoIds.push(id);
      }

      const result = await submitTestimonialRequest({
        token,
        testimonialText,
        socialLink: socialLink || undefined,
        privateNotes: privateNotes || undefined,
        photoIds,
      });
      if (!result.success) throw new Error(result.error);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setSubmitError(err instanceof Error ? err.message : "Something went wrong.");
    }
  };

  if (status === "success") {
    return (
      <section>
        <h2 className="font-display text-heading text-ink">
          Thank you, {name.trim().split(/\s+/)[0] || "there"}.
        </h2>
        <p className="mt-3 max-w-measure text-body text-muted">
          Your testimonial has been received. It means a lot — thank you for
          taking the time.
        </p>
      </section>
    );
  }

  const pending = status === "submitting";

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className="flex flex-col gap-8 bg-canvas-raised p-6 sm:p-8"
    >
      <div>
        <label htmlFor="testimonialText" className="field-label">
          Your testimonial <span className="text-accent-text">*</span>
        </label>
        <textarea
          id="testimonialText"
          name="testimonialText"
          ref={textRef}
          required
          rows={6}
          placeholder="What was your experience like?"
          onChange={() => setTextError(null)}
          className={`field-input ${textError ? "border-accent-text" : ""}`}
        />
        {textError && (
          <p className="mt-2 text-caption text-accent-text">{textError}</p>
        )}
      </div>

      <div>
        <label htmlFor="photos" className="field-label">
          Photos (optional)
        </label>
        <input
          type="file"
          id="photos"
          name="photos"
          ref={fileInputRef}
          accept="image/*"
          multiple
          onChange={(event) => handleFilesChosen(event.target.files)}
          className="field-input"
        />
        <p className="mt-2 text-caption text-muted">
          Up to {MAX_PHOTOS} photos, {PUBLIC_PHOTO_MAX_MB}MB each. These stay
          private until she chooses to feature one.
        </p>
        {fileError && (
          <p className="mt-2 text-caption text-accent-text">{fileError}</p>
        )}
        {files.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {files.map((file, index) => (
              <li
                key={`${file.name}-${index}`}
                className="flex items-center gap-3"
              >
                {previewUrls[index] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={previewUrls[index]}
                    alt=""
                    width={40}
                    height={40}
                    className="h-10 w-10 shrink-0 rounded object-cover"
                  />
                ) : (
                  <span
                    className="h-10 w-10 shrink-0 rounded border border-hairline bg-canvas"
                    aria-hidden="true"
                  />
                )}
                <span className="flex-1 truncate text-caption text-muted">
                  {file.name}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded px-3 text-caption text-ink underline decoration-1 underline-offset-2 hover:no-underline"
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label htmlFor="socialLink" className="field-label">
          Instagram / Facebook link (optional)
        </label>
        <input
          type="text"
          id="socialLink"
          name="socialLink"
          placeholder="https://instagram.com/yourhandle"
          className="field-input"
        />
      </div>

      <div>
        <label htmlFor="privateNotes" className="field-label">
          Private note — just for {ownerLabel} (optional, won&rsquo;t be published)
        </label>
        <textarea
          id="privateNotes"
          name="privateNotes"
          rows={3}
          className="field-input"
        />
      </div>

      {submitError && (
        <p className="text-caption text-accent-text">{submitError}</p>
      )}

      <div>
        <button type="submit" className="btn" disabled={pending} aria-busy={pending}>
          {pending ? (
            <>
              Sending
              <span className="btn-dots" aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </>
          ) : status === "error" ? (
            "Try again"
          ) : (
            "Submit"
          )}
        </button>
      </div>
    </form>
  );
}
