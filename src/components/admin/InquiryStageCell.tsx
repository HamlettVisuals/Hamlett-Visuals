import type { DefaultCellComponentProps } from "payload";
import { STAGES } from "./KanbanBoard/types";

// The Inquiries list's Stage column: a read-only label in the same type as
// the board's column titles (uppercase, letter-spaced), so the list and the
// board name each stage the same way. Stage is changed on the board, not
// here. Archived inquiries have left the board, so they read "Archived"
// rather than the Wrap-Up stage they finished in. Styles: .inquiry-stage in
// admin-overrides.css.
export default function InquiryStageCell({ cellData, rowData }: DefaultCellComponentProps) {
  if (rowData?.archived) {
    return <span className="inquiry-stage inquiry-stage--archived">Archived</span>;
  }

  const label = STAGES.find((stage) => stage.value === cellData)?.label;
  if (!label) return null;

  return <span className="inquiry-stage">{label}</span>;
}
