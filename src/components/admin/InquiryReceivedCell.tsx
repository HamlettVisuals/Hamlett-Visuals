"use client";

import { useConfig, useTranslation } from "@payloadcms/ui";
import { formatDate } from "@payloadcms/ui/shared";
import type { DefaultCellComponentProps } from "payload";

// The Inquiries list's Received column (its createdAt). Renders both the
// full date, in the admin's usual format, and a short one ("Sep 26", plus
// the year when it isn't this year); admin-overrides.css shows the short
// one on phones so Name, Stage and the date fit without scrolling sideways.
export default function InquiryReceivedCell({ cellData }: DefaultCellComponentProps) {
  const { config } = useConfig();
  const { i18n } = useTranslation();

  if (typeof cellData !== "string" || !cellData) return null;

  const sameYear = new Date(cellData).getFullYear() === new Date().getFullYear();

  return (
    <>
      <span className="inquiry-received__full">
        {formatDate({ date: cellData, i18n, pattern: config.admin.dateFormat })}
      </span>
      <span className="inquiry-received__short">
        {formatDate({ date: cellData, i18n, pattern: sameYear ? "MMM d" : "MMM d, yyyy" })}
      </span>
    </>
  );
}
