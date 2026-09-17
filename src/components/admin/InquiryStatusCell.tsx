"use client";

import { useState, useTransition } from "react";
import { useConfig } from "@payloadcms/ui";
import type { DefaultCellComponentProps } from "payload";

// Lets a status be changed directly from the Inquiries list view instead of
// opening the document. Payload's default list cells are read-only, so this
// replaces the `status` column's cell (wired up via
// Inquiries.fields status.admin.components.Cell) with a <select> that PATCHes
// the field on change.

const STATUS_OPTIONS = [
  { label: "New", value: "new" },
  { label: "Contacted", value: "contacted" },
  { label: "Booked", value: "booked" },
  { label: "Declined", value: "declined" },
  { label: "Completed", value: "completed" },
];

export default function InquiryStatusCell({
  cellData,
  rowData,
  collectionSlug,
}: DefaultCellComponentProps) {
  const { config } = useConfig();
  const [value, setValue] = useState(
    typeof cellData === "string" ? cellData : "new",
  );
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nextValue = e.target.value;
    const previousValue = value;
    setValue(nextValue);
    setError(false);

    startTransition(async () => {
      try {
        const res = await fetch(
          `${config.serverURL ?? ""}${config.routes.api}/${collectionSlug}/${rowData.id}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: nextValue }),
          },
        );
        if (!res.ok) throw new Error(`Status update failed: ${res.status}`);
      } catch {
        setValue(previousValue);
        setError(true);
      }
    });
  };

  return (
    <select
      value={value}
      disabled={isPending}
      onClick={(e) => e.stopPropagation()}
      onChange={handleChange}
      style={{
        width: "100%",
        padding: "4px 6px",
        borderRadius: 4,
        border: error
          ? "1px solid var(--theme-error-500, #e53e3e)"
          : "1px solid var(--theme-elevation-150)",
        background: "var(--theme-input-bg)",
        color: "var(--theme-elevation-800)",
        opacity: isPending ? 0.6 : 1,
      }}
    >
      {STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
