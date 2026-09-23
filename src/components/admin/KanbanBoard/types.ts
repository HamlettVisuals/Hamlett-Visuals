import type { Category, ChecklistTemplate, Client, Inquiry } from "@/payload-types";

// Matches Inquiries.ts's `stage` field options exactly, in the order the
// board's columns should render — see src/collections/Inquiries.ts.
export const STAGES = [
  { value: "lead", label: "Lead" },
  { value: "planning", label: "Planning" },
  { value: "prep", label: "Prep" },
  { value: "shoot", label: "Shoot Complete" },
  { value: "post", label: "Post-Production" },
  { value: "wrapup", label: "Wrap-Up" },
] as const;

export type StageValue = (typeof STAGES)[number]["value"];

export const STAGE_VALUES: readonly StageValue[] = STAGES.map((stage) => stage.value);

export function isStageValue(value: unknown): value is StageValue {
  return typeof value === "string" && (STAGE_VALUES as readonly string[]).includes(value);
}

// The board only ever deals with non-archived inquiries whose `category` has
// been resolved (depth: 1 on the server fetch), so `category` narrows to the
// populated object rather than the raw id the base Inquiry type allows.
export type BoardInquiry = Omit<Inquiry, "category"> & { category: Category };

export type BoardData = {
  inquiries: BoardInquiry[];
  /** Client ids with more than one Inquiry on file — see isRepeatClient. */
  repeatClientIds: number[];
};

// Shared by MobileList's filter chips and AddCardDrawer's category picker —
// both just need every category's id + name, not the full Category shape.
export type CategoryOption = { id: number; name: string };

export function inquiryClient(inquiry: BoardInquiry): Client | null {
  return typeof inquiry.client === "object" && inquiry.client !== null ? inquiry.client : null;
}

// The Templates drawer's own data (TemplatesDrawer.tsx) — `category` resolved
// to the full object (or null for the Standard template) via depth: 1 on the
// server fetch, same narrowing BoardInquiry does for `category` above.
export type TemplateWithCategory = Omit<ChecklistTemplate, "category"> & { category: Category | null };
