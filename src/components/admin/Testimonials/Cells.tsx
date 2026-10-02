"use client";

import type { DefaultCellComponentProps } from "payload";

// Published / Hidden in Payload's own Trash list (the grouped list has its
// own pill that toggles). Same pill styles as categories and albums.
export function PublishedCell({ cellData }: DefaultCellComponentProps) {
  const on = cellData !== false;
  return (
    <span className={`category-status category-status--${on ? "live" : "hidden"}`}>{on ? "Published" : "Hidden"}</span>
  );
}
