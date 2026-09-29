"use client";

import { useState } from "react";
import { Drawer } from "@payloadcms/ui";
import type { Inquiry } from "@/payload-types";
import styles from "./KanbanBoard.module.css";
import { drawerScrollRef } from "./drawer-scroll";
import { formatTimestamp } from "./format";
import type { CategoryOption } from "./types";

export const QUESTIONS_DRAWER_SLUG = "kanban-questions";

// The same Drawer pattern DetailDrawer and AddCardDrawer already use,
// mounted once by Board.tsx and toggled via the top bar's "Questions"
// button/badge. Unhandled questions are always shown expanded (that's the
// whole point of the badge); Handled ones are tucked behind their own
// collapsible section (collapsed by default) so they don't compete for
// attention — same collapsible-group styling MobileList's stage groups use.
//
// Both actions (toggle handled, move to Leads) are owned by Board.tsx —
// this component only renders state and reports intent. They return
// Promise<boolean> rather than folding into Board's shared `error` banner:
// that banner lives in the main board underneath this Drawer's overlay, so
// a failure here needs its own inline surface to actually be seen.
export default function QuestionsDrawer({
  questions,
  categories,
  onToggleHandled,
  onMoveToLeads,
}: {
  questions: Inquiry[];
  categories: CategoryOption[];
  onToggleHandled: (question: Inquiry) => Promise<boolean>;
  onMoveToLeads: (question: Inquiry, categoryId: number) => Promise<boolean>;
}) {
  const [showHandled, setShowHandled] = useState(false);

  const unhandled = questions.filter((question) => !question.questionHandled);
  const handled = questions.filter((question) => question.questionHandled);

  return (
    <Drawer slug={QUESTIONS_DRAWER_SLUG} className="kanban-drawer" title="Questions">
      <div className={styles.questionsBody} ref={drawerScrollRef}>
        <div>
          <h3 className={styles.drawerSectionTitle}>Unhandled ({unhandled.length})</h3>
          {unhandled.length === 0 ? (
            <div className={styles.emptyColumn}>Nothing waiting on a reply.</div>
          ) : (
            <div className={styles.questionsList}>
              {unhandled.map((question) => (
                <QuestionRow
                  key={question.id}
                  question={question}
                  categories={categories}
                  onToggleHandled={onToggleHandled}
                  onMoveToLeads={onMoveToLeads}
                />
              ))}
            </div>
          )}
        </div>

        <div className={styles.mobileGroup}>
          <button
            type="button"
            className={styles.mobileGroupHeader}
            aria-expanded={showHandled}
            onClick={() => setShowHandled((prev) => !prev)}
          >
            <span
              className={`${styles.mobileGroupChevron}${showHandled ? ` ${styles.mobileGroupChevronOpen}` : ""}`}
            >
              ›
            </span>
            <span className={styles.mobileGroupTitle}>Handled</span>
            <span className={styles.columnCount}>{handled.length}</span>
          </button>

          {showHandled &&
            (handled.length === 0 ? (
              <div className={styles.emptyColumn}>No handled questions yet.</div>
            ) : (
              <div className={styles.questionsList}>
                {handled.map((question) => (
                  <QuestionRow
                    key={question.id}
                    question={question}
                    categories={categories}
                    onToggleHandled={onToggleHandled}
                    onMoveToLeads={onMoveToLeads}
                  />
                ))}
              </div>
            ))}
        </div>
      </div>
    </Drawer>
  );
}

function QuestionRow({
  question,
  categories,
  onToggleHandled,
  onMoveToLeads,
}: {
  question: Inquiry;
  categories: CategoryOption[];
  onToggleHandled: (question: Inquiry) => Promise<boolean>;
  onMoveToLeads: (question: Inquiry, categoryId: number) => Promise<boolean>;
}) {
  const [isPickingCategory, setIsPickingCategory] = useState(false);
  const [categoryId, setCategoryId] = useState(categories[0] ? String(categories[0].id) : "");
  const [isToggling, setIsToggling] = useState(false);
  const [isMoving, setIsMoving] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const handleToggle = async () => {
    setIsToggling(true);
    setRowError(null);
    const success = await onToggleHandled(question);
    setIsToggling(false);
    if (!success) setRowError("Couldn't update — please try again.");
  };

  const confirmMove = async () => {
    if (!categoryId) return;
    setIsMoving(true);
    setRowError(null);
    const success = await onMoveToLeads(question, Number(categoryId));
    setIsMoving(false);
    // On success this row's Inquiry is no longer inquiryType "question", so
    // Board.tsx drops it from `questions` and this component unmounts —
    // nothing left to reset here. On failure it stays put, picker open, so
    // she can just retry.
    if (!success) setRowError("Couldn't move that to Leads — please try again.");
  };

  return (
    <div className={styles.questionRow}>
      <div className={styles.questionRowHeader}>
        <span className={styles.questionRowName}>{question.name}</span>
        <span className={styles.questionRowDate}>{formatTimestamp(question.createdAt)}</span>
      </div>
      <div className={styles.questionRowEmail}>{question.email}</div>
      <p className={styles.questionMessage}>{question.message}</p>

      <div className={styles.questionActions}>
        <button type="button" className={styles.drawerSecondaryButton} onClick={handleToggle} disabled={isToggling}>
          {isToggling ? "Saving…" : question.questionHandled ? "Mark unhandled" : "Mark handled"}
        </button>

        {!isPickingCategory && (
          <button
            type="button"
            className={styles.drawerSecondaryButton}
            onClick={() => setIsPickingCategory(true)}
            disabled={categories.length === 0}
            title={categories.length === 0 ? "No categories exist yet" : undefined}
          >
            Move to Leads
          </button>
        )}
      </div>

      {isPickingCategory && (
        <div className={styles.inlineCategoryPicker}>
          <select
            className={styles.inlineCategorySelect}
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            disabled={isMoving}
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className={styles.drawerSecondaryButton}
            onClick={confirmMove}
            disabled={isMoving || !categoryId}
          >
            {isMoving ? "Moving…" : "Confirm"}
          </button>
          <button
            type="button"
            className={styles.drawerTextButton}
            onClick={() => setIsPickingCategory(false)}
            disabled={isMoving}
          >
            Cancel
          </button>
        </div>
      )}

      {rowError && <p className={styles.rowError}>{rowError}</p>}
    </div>
  );
}
