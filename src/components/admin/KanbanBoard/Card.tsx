"use client";

import type { CSSProperties } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { getCategoryColor } from "@/lib/category-colors";
import { getDistinguisherLocation } from "@/hooks/repeatClient";
import styles from "./KanbanBoard.module.css";
import { PAYMENT_STATUS_LABELS, POST_PRODUCTION_LABELS, stageDateLabel } from "./format";
import { inquiryClient, type BoardInquiry } from "./types";

// Unpaid is the one that deserves a second look at a glance; paid-in-full is
// good news worth the same green as every other "done" pill elsewhere on the
// card; deposit sits in between, so it just gets the plain neutral pill.
const PAYMENT_PILL_CLASS: Record<string, string> = {
  unpaid: styles.pillWarning,
  deposit: styles.pill,
  paid: styles.pillSuccess,
};

// The card's actual content, with no dnd-kit hooks of its own — reused both
// by the real sortable card below and by Board.tsx's DragOverlay, which
// renders a plain floating clone while a drag is in progress (DragOverlay
// content isn't itself a drop/drag target, so it can't use useSortable).
//
// `siblings` is every OTHER currently-open (non-archived) Inquiry on the
// board for this same client — Board.tsx groups `items` by client once and
// hands each card its own slice, so getDistinguisherLocation never has to
// see the full board.
export function CardContent({
  inquiry,
  isRepeat,
  siblings,
}: {
  inquiry: BoardInquiry;
  isRepeat: boolean;
  siblings: BoardInquiry[];
}) {
  const client = inquiryClient(inquiry);
  const dateLabel = stageDateLabel(inquiry);
  const distinguisher = getDistinguisherLocation(inquiry, siblings);
  const checklist = inquiry.prepChecklist ?? [];
  const checklistDone = checklist.filter((row) => row.completed).length;
  const postChecklist = inquiry.postProductionChecklist ?? [];
  const postChecklistDone = postChecklist.filter((row) => row.completed).length;

  return (
    <>
      <div className={styles.cardTop}>
        <div className={styles.cardTopLeft}>
          <span className={styles.categoryLabel}>
            <span
              className={styles.categoryDot}
              style={{ background: getCategoryColor(inquiry.category.id).solid }}
            />
            {inquiry.category.name}
          </span>
          {inquiry.paymentStatus && (
            <span className={`${styles.pill} ${PAYMENT_PILL_CLASS[inquiry.paymentStatus] ?? styles.pill}`}>
              {PAYMENT_STATUS_LABELS[inquiry.paymentStatus]}
            </span>
          )}
        </div>
        {isRepeat && <span className={styles.repeatBadge}>Repeat client</span>}
      </div>

      <p className={styles.clientName}>{client?.name ?? inquiry.name}</p>

      {distinguisher && <p className={styles.cardLocation}>{distinguisher}</p>}

      {dateLabel && (
        <div className={styles.cardMeta}>
          <span>{dateLabel}</span>
          {/* Prep is the only stage whose date comes from shootDate — see
              stageDateLabel — so it's the only one shootDateConfirmed is
              relevant to. Two states, same story the drawer tells: a
              positive checkmark once confirmed, not just the absence of
              the warning mark. */}
          {inquiry.stage === "prep" &&
            (inquiry.shootDateConfirmed ? (
              <span className={styles.confirmedMark} title="Confirmed shoot date">
                ✓
              </span>
            ) : (
              <span className={styles.tentativeMark} title="Tentative shoot date — not yet confirmed">
                !
              </span>
            ))}
        </div>
      )}

      {inquiry.stage === "prep" && checklist.length > 0 && (
        <div className={styles.pillRow}>
          <span
            className={`${styles.pill} ${checklistDone === checklist.length ? styles.pillSuccess : styles.pillMuted}`}
          >
            {checklistDone === checklist.length ? "Prepped ✓" : `${checklistDone}/${checklist.length} prepped`}
          </span>
        </div>
      )}

      {inquiry.stage === "post" && (inquiry.postProductionStatus || postChecklist.length > 0) && (
        <div className={styles.pillRow}>
          {inquiry.postProductionStatus && (
            <span className={styles.pill}>{POST_PRODUCTION_LABELS[inquiry.postProductionStatus]}</span>
          )}
          {/* Mirrors the Prep pill above — same empty-checklist-shows-nothing
              rule, just against postProductionChecklist instead. */}
          {postChecklist.length > 0 && (
            <span
              className={`${styles.pill} ${postChecklistDone === postChecklist.length ? styles.pillSuccess : styles.pillMuted}`}
            >
              {postChecklistDone === postChecklist.length ? "Done ✓" : `${postChecklistDone}/${postChecklist.length} done`}
            </span>
          )}
        </div>
      )}

      {inquiry.stage === "wrapup" && (
        <div className={styles.pillRow}>
          <span
            className={`${styles.pill} ${inquiry.testimonialReceived ? styles.pillSuccess : styles.pillMuted}`}
          >
            {inquiry.testimonialReceived ? "Testimonial ✓" : "Testimonial —"}
          </span>
          <span className={`${styles.pill} ${inquiry.addedToSite ? styles.pillSuccess : styles.pillMuted}`}>
            {inquiry.addedToSite ? "On site ✓" : "On site —"}
          </span>
        </div>
      )}
    </>
  );
}

export default function KanbanCard({
  inquiry,
  isRepeat,
  siblings,
  onOpen,
}: {
  inquiry: BoardInquiry;
  isRepeat: boolean;
  siblings: BoardInquiry[];
  onOpen: (inquiry: BoardInquiry) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useSortable({
    id: inquiry.id,
  });

  const style: CSSProperties = {
    borderLeftColor: getCategoryColor(inquiry.category.id).solid,
    transform: transform
      ? `translate3d(${Math.round(transform.x)}px, ${Math.round(transform.y)}px, 0)`
      : undefined,
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen(inquiry);
    }
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={style}
      className={`${styles.card}${isDragging ? ` ${styles.cardDragging}` : ""}`}
      onClick={() => onOpen(inquiry)}
      onKeyDown={handleKeyDown}
    >
      <CardContent inquiry={inquiry} isRepeat={isRepeat} siblings={siblings} />
    </div>
  );
}
