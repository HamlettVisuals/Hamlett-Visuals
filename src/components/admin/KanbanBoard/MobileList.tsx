"use client";

import { useMemo, useState } from "react";
import { getCategoryColor } from "@/lib/category-colors";
import styles from "./KanbanBoard.module.css";
import { compareByStageDate, stageDateLabel } from "./format";
import { inquiryClient, STAGES, type BoardInquiry, type CategoryOption, type StageValue } from "./types";

// The mobile (< 768px, see KanbanBoard.module.css) replacement for the
// desktop drag-and-drop columns — same `items` data and the same
// DetailDrawer on click, but a vertical list: category filter chips up top,
// then each stage as a collapsible group of compact rows. There's no
// drag-and-drop here; moving stage happens via the drawer's <select>
// (see DetailDrawer.tsx and Board.tsx's changeStage).
export default function MobileBoardList({
  items,
  onOpenCard,
}: {
  items: BoardInquiry[];
  onOpenCard: (inquiry: BoardInquiry) => void;
}) {
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | "all">("all");
  const [collapsedStages, setCollapsedStages] = useState<Set<StageValue>>(() => new Set());

  // Chips reflect the categories actually represented on the board right
  // now, not every category ever created — consistent with how the board
  // and calendar both already work off `items` alone, with no separate
  // categories fetch of their own.
  const categories = useMemo<CategoryOption[]>(() => {
    const byId = new Map<number, string>();
    for (const item of items) byId.set(item.category.id, item.category.name);
    return Array.from(byId, ([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [items]);

  const filtered =
    selectedCategoryId === "all" ? items : items.filter((item) => item.category.id === selectedCategoryId);

  const toggleStage = (stage: StageValue) => {
    setCollapsedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stage)) {
        next.delete(stage);
      } else {
        next.add(stage);
      }
      return next;
    });
  };

  return (
    <div className={styles.mobileList}>
      <div className={styles.mobileChipRow}>
        <button
          type="button"
          className={`${styles.chip}${selectedCategoryId === "all" ? ` ${styles.chipActive}` : ""}`}
          onClick={() => setSelectedCategoryId("all")}
        >
          All
        </button>
        {categories.map((category) => {
          const isActive = selectedCategoryId === category.id;
          const color = getCategoryColor(category.id);
          return (
            <button
              key={category.id}
              type="button"
              className={`${styles.chip}${isActive ? ` ${styles.chipActive}` : ""}`}
              style={isActive ? { background: color.tint, borderColor: color.solid, color: color.solid } : undefined}
              onClick={() => setSelectedCategoryId(category.id)}
            >
              <span className={styles.chipDot} style={{ background: color.solid }} />
              {category.name}
            </button>
          );
        })}
      </div>

      {STAGES.map((stageMeta) => {
        const stageItems = filtered
          .filter((item) => item.stage === stageMeta.value)
          .sort(compareByStageDate);
        const isCollapsed = collapsedStages.has(stageMeta.value);

        return (
          <div key={stageMeta.value} className={styles.mobileGroup}>
            <button
              type="button"
              className={styles.mobileGroupHeader}
              aria-expanded={!isCollapsed}
              onClick={() => toggleStage(stageMeta.value)}
            >
              <span
                className={`${styles.mobileGroupChevron}${isCollapsed ? "" : ` ${styles.mobileGroupChevronOpen}`}`}
              >
                ›
              </span>
              <span className={styles.mobileGroupTitle}>{stageMeta.label}</span>
              <span className={styles.columnCount}>{stageItems.length}</span>
            </button>

            {!isCollapsed &&
              (stageItems.length === 0 ? (
                <div className={styles.emptyColumn}>No inquiries</div>
              ) : (
                <div className={styles.mobileRows}>
                  {stageItems.map((inquiry) => {
                    const client = inquiryClient(inquiry);
                    const date = stageDateLabel(inquiry);
                    const checklist = inquiry.prepChecklist ?? [];
                    const checklistDone = checklist.filter((row) => row.completed).length;
                    const showPrep = inquiry.stage === "prep" && checklist.length > 0;
                    return (
                      <button
                        key={inquiry.id}
                        type="button"
                        className={styles.mobileRow}
                        onClick={() => onOpenCard(inquiry)}
                      >
                        <span className={styles.mobileRowMain}>
                          <span
                            className={styles.mobileRowDot}
                            style={{ background: getCategoryColor(inquiry.category.id).solid }}
                          />
                          <span className={styles.mobileRowName}>{client?.name ?? inquiry.name}</span>
                          {date && (
                            <span className={styles.mobileRowMeta}>
                              {date}
                              {/* Same "!"/✓ treatment as the desktop card face
                                  (Card.tsx) — prep is the only stage whose date
                                  comes from shootDate, so it's the only one
                                  shootDateConfirmed is relevant to. */}
                              {inquiry.stage === "prep" &&
                                (inquiry.shootDateConfirmed ? (
                                  <span className={styles.confirmedMark} title="Confirmed shoot date">
                                    ✓
                                  </span>
                                ) : (
                                  <span
                                    className={styles.tentativeMark}
                                    title="Tentative shoot date — not yet confirmed"
                                  >
                                    !
                                  </span>
                                ))}
                            </span>
                          )}
                        </span>
                        {/* Compact echo of the desktop card's "X/Y prepped"
                            pill (Card.tsx) — plain text on its own line rather
                            than a full pill so a narrow row doesn't get
                            cramped; only Prep-stage rows get this second line,
                            every other stage stays single-line as before. */}
                        {showPrep && (
                          <span
                            className={`${styles.mobileRowPrep}${checklistDone === checklist.length ? ` ${styles.mobileRowPrepDone}` : ""}`}
                          >
                            {checklistDone === checklist.length ? "Prepped ✓" : `${checklistDone}/${checklist.length} prepped`}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
