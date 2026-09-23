"use client";

import { useMemo } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import styles from "./KanbanBoard.module.css";
import KanbanCard from "./Card";
import { inquiryClient, type BoardInquiry, type StageValue } from "./types";

export default function KanbanColumn({
  stage,
  label,
  inquiries,
  repeatClientIds,
  siblingsByClient,
  onOpenCard,
}: {
  stage: StageValue;
  label: string;
  inquiries: BoardInquiry[];
  repeatClientIds: Set<number>;
  siblingsByClient: Map<number, BoardInquiry[]>;
  onOpenCard: (inquiry: BoardInquiry) => void;
}) {
  // A plain droppable on the column body, separate from the cards'
  // SortableContext below, so an empty (or nearly empty) column still has
  // somewhere to catch a drop — see Board.tsx's resolveOverStage.
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  // A stable reference across renders that don't actually change which
  // cards are in this column (`inquiries` itself is already memoized in
  // Board.tsx). SortableContext compares its `items` prop by value
  // internally, but a fresh array here on every render still means its own
  // effects re-run every render too — the difference between "harmless
  // no-op" and dnd-kit's internal remeasuring loop tripping React's update
  // depth limit during a real, high-frequency drag.
  const sortableIds = useMemo(() => inquiries.map((inquiry) => inquiry.id), [inquiries]);

  return (
    <div className={styles.column}>
      <div className={styles.columnHeader}>
        <h3 className={styles.columnTitle}>{label}</h3>
        <span className={styles.columnCount}>{inquiries.length}</span>
      </div>
      <div
        ref={setNodeRef}
        className={`${styles.columnBody}${isOver ? ` ${styles.columnBodyOver}` : ""}`}
      >
        <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
          {inquiries.length === 0 ? (
            <div className={styles.emptyColumn}>No inquiries</div>
          ) : (
            inquiries.map((inquiry) => {
              const client = inquiryClient(inquiry);
              const siblings = client
                ? (siblingsByClient.get(client.id) ?? []).filter((sibling) => sibling.id !== inquiry.id)
                : [];
              return (
                <KanbanCard
                  key={inquiry.id}
                  inquiry={inquiry}
                  isRepeat={client !== null && repeatClientIds.has(client.id)}
                  siblings={siblings}
                  onOpen={onOpenCard}
                />
              );
            })
          )}
        </SortableContext>
      </div>
    </div>
  );
}
