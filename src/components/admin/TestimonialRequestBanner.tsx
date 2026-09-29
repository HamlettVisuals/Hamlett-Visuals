"use client";

import { useState } from "react";
import { useDocumentInfo } from "@payloadcms/ui";

// The "Request a testimonial" banner on a Wrap-Up Inquiry's edit view
// (wired up via Inquiries.ts's testimonialRequestBanner ui field, visible
// only when stage === "wrapup", archived or not). Posts to
// /api/inquiries/[id]/testimonial-request (an admin-only Next route, not a
// Payload REST endpoint — see that route's own header comment for why),
// which generates the token, sends the email, and updates the Inquiry
// server-side; this component just triggers that and reflects the result
// via setData rather than reloading the page.
export default function TestimonialRequestBanner() {
  const { id, data, setData } = useDocumentInfo();
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!id) return null;

  const name = typeof data?.name === "string" && data.name.length > 0 ? data.name : "this client";
  const sent = Boolean(data?.testimonialRequestSent);
  const sentAt = typeof data?.testimonialRequestSentAt === "string" ? data.testimonialRequestSentAt : null;

  const send = async () => {
    setIsSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/inquiries/${id}/testimonial-request`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(typeof body?.error === "string" ? body.error : "Failed to send.");
      }
      setData({
        ...data,
        testimonialRequestSent: body.testimonialRequestSent,
        testimonialRequestSentAt: body.testimonialRequestSentAt,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send.");
    } finally {
      setIsSending(false);
    }
  };

  if (!sent) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "14px 18px",
          marginBottom: 24,
          borderRadius: 6,
          border: "1px solid var(--theme-success-500)",
          background: "var(--theme-success-100)",
        }}
      >
        <p style={{ margin: 0, color: "var(--theme-elevation-800)" }}>
          Request a testimonial from {name}?
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          {error && (
            <span style={{ color: "var(--theme-error-500)", fontSize: 13 }}>{error}</span>
          )}
          <button
            type="button"
            onClick={send}
            disabled={isSending}
            style={{
              padding: "8px 16px",
              borderRadius: 4,
              border: "none",
              background: "var(--theme-success-500)",
              color: "var(--theme-base-0)",
              cursor: isSending ? "default" : "pointer",
              opacity: isSending ? 0.7 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {isSending ? "Sending…" : "Send request"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ marginBottom: 24, fontSize: 13, color: "var(--theme-elevation-500)" }}>
      Testimonial request sent{sentAt ? ` ${new Date(sentAt).toLocaleString()}` : ""}.{" "}
      <button
        type="button"
        onClick={send}
        disabled={isSending}
        style={{
          border: "none",
          background: "none",
          padding: 0,
          color: "var(--theme-text)",
          textDecoration: "underline",
          cursor: isSending ? "default" : "pointer",
          opacity: isSending ? 0.6 : 1,
        }}
      >
        {isSending ? "Resending…" : "Resend"}
      </button>
      {error && (
        <span style={{ color: "var(--theme-error-500)", marginLeft: 8 }}>{error}</span>
      )}
    </div>
  );
}
