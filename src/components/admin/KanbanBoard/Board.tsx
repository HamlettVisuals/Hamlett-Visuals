"use client";

import { useMemo, useRef, useState } from "react";
import {
  closestCorners,
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Link, useConfig, useModal } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import KanbanColumn from "./Column";
import { CardContent } from "./Card";
import CalendarView from "./Calendar";
import MobileBoardList from "./MobileList";
import DetailDrawer, { DETAIL_DRAWER_SLUG } from "./DetailDrawer";
import AddCardDrawer, { ADD_CARD_DRAWER_SLUG } from "./AddCardDrawer";
import QuestionsDrawer, { QUESTIONS_DRAWER_SLUG } from "./QuestionsDrawer";
import TemplatesDrawer, { TEMPLATES_DRAWER_SLUG } from "./TemplatesDrawer";
import { getCategoryColor } from "@/lib/category-colors";
import type { Inquiry } from "@/payload-types";
import styles from "./KanbanBoard.module.css";
import { compareByStageDate } from "./format";
import {
  inquiryClient,
  isStageValue,
  STAGES,
  type BoardInquiry,
  type CategoryOption,
  type StageValue,
  type TemplateWithCategory,
} from "./types";

// Oldest/soonest-first within a column, ties by created date — see
// compareByStageDate. A fresh array each call (Array.prototype.sort mutates
// in place), since the inputs here are always a just-built .filter() result
// anyway.
function sortByStageDate(inquiries: BoardInquiry[]): BoardInquiry[] {
  return [...inquiries].sort(compareByStageDate);
}

type ViewMode = "board" | "calendar";

export default function KanbanBoard({
  inquiries,
  repeatClientIds,
  categories,
  questions,
  templates,
}: {
  inquiries: BoardInquiry[];
  repeatClientIds: number[];
  categories: CategoryOption[];
  questions: Inquiry[];
  templates: TemplateWithCategory[];
}) {
  const { config } = useConfig();
  const { toggleModal } = useModal();
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  const [view, setView] = useState<ViewMode>("board");
  const [items, setItems] = useState<BoardInquiry[]>(inquiries);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // The stage each dragged card started in, so a cancelled drag (dropped
  // nowhere) or a failed PATCH can put it back where it came from.
  const dragStartStage = useRef<Record<number, StageValue>>({});

  // enqueueFieldPatch's per-record queue: at most one PATCH in flight per
  // inquiry id at a time, shared by every path that can change a field on
  // an Inquiry — updateInquiryFields (drawer edits, including the Wrap-Up
  // checkboxes) and persistStageChange (drag-and-drop / the stage
  // <select>) alike. A patch that arrives while one is already in flight
  // gets merged into the next one instead of firing concurrently — two
  // overlapping PATCHes for the same record (e.g. checking
  // testimonialReceived then addedToSite in quick succession, or checking a
  // box right after a stage change) could otherwise each read/write the
  // record from a stale snapshot and silently drop whichever field the
  // other one had just set, which also meant the Wrap-Up auto-archive hook
  // could never see both checklist flags true at the same time.
  const fieldPatchQueue = useRef<Map<number, { patch: Partial<BoardInquiry>; resolvers: ((success: boolean) => void)[] }>>(
    new Map(),
  );
  const fieldPatchInFlight = useRef<Set<number>>(new Set());
  // The last server-confirmed value for any field with an unresolved patch
  // pending for that id, so a failed request reverts all the way back to
  // that value even when it's the second+ patch merged into the batch.
  const fieldRevertSnapshot = useRef<Map<number, Partial<BoardInquiry>>>(new Map());

  // Sends one merged PATCH for `id`, then keeps draining whatever else got
  // queued for it while that request was in flight.
  const runFieldPatchQueue = async (id: number) => {
    if (fieldPatchInFlight.current.has(id)) return;
    fieldPatchInFlight.current.add(id);
    while (true) {
      const next = fieldPatchQueue.current.get(id);
      if (!next) break;
      fieldPatchQueue.current.delete(id);

      let success = false;
      try {
        const res = await fetch(`${apiBase}/inquiries/${id}`, {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(next.patch),
        });
        if (!res.ok) throw new Error(`Update failed: ${res.status}`);
        // stage === "wrapup" with both checklist boxes checked auto-archives
        // via Inquiries.ts's beforeChange hook, whether the PATCH that
        // tipped it over was the stage change itself or a checkbox — once
        // that's happened server-side, the card no longer belongs on this
        // board.
        const body: { doc?: { archived?: boolean } } = await res.json();
        if (body.doc?.archived) {
          setItems((prev) => prev.filter((item) => item.id !== id));
        }
        success = true;
      } catch {
        const revert = fieldRevertSnapshot.current.get(id);
        if (revert) setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...revert } : item)));
      }
      fieldRevertSnapshot.current.delete(id);
      next.resolvers.forEach((resolve) => resolve(success));
    }
    fieldPatchInFlight.current.delete(id);
  };

  // `revertOverride` lets a caller supply the pre-change value explicitly
  // instead of reading it off `items` — needed for stage changes, since
  // handleDragOver already optimistically writes the dropped-on stage into
  // `items` *before* persistStageChange (which calls this) ever runs, so
  // `items` no longer holds the true previous stage by the time this fires.
  const enqueueFieldPatch = (
    id: number,
    patch: Partial<BoardInquiry>,
    revertOverride?: Partial<BoardInquiry>,
  ): Promise<boolean> => {
    const previous = items.find((item) => item.id === id);
    if (!previous) return Promise.resolve(false);

    const knownGood = fieldRevertSnapshot.current.get(id) ?? {};
    const newlyTracked: Partial<BoardInquiry> = {};
    for (const key of Object.keys(patch) as (keyof BoardInquiry)[]) {
      if (key in knownGood) continue;
      const value = revertOverride && key in revertOverride ? revertOverride[key] : previous[key];
      (newlyTracked as Record<string, unknown>)[key] = value;
    }
    if (Object.keys(newlyTracked).length > 0) {
      fieldRevertSnapshot.current.set(id, { ...knownGood, ...newlyTracked });
    }

    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));

    return new Promise<boolean>((resolve) => {
      const queued = fieldPatchQueue.current.get(id);
      fieldPatchQueue.current.set(
        id,
        queued
          ? { patch: { ...queued.patch, ...patch }, resolvers: [...queued.resolvers, resolve] }
          : { patch, resolvers: [resolve] },
      );
      void runFieldPatchQueue(id);
    });
  };

  // Plain state rather than a useMemo off the `repeatClientIds` prop —
  // AddCardDrawer's onCreated needs to grow this set the moment a second
  // Inquiry for the same Client is added, without waiting on a server
  // round-trip or a page reload.
  const [repeatSet, setRepeatSet] = useState<Set<number>>(() => new Set(repeatClientIds));

  // Every currently-open (non-archived) Inquiry on the board, grouped by
  // client id — feeds each card its sibling jobs for the location
  // distinguisher (see Card.tsx and getDistinguisherLocation). Recomputed
  // whenever `items` changes rather than kept as its own state, same as
  // every other derived-from-`items` value here.
  const siblingsByClient = useMemo(() => {
    const map = new Map<number, BoardInquiry[]>();
    for (const item of items) {
      const client = inquiryClient(item);
      if (!client) continue;
      const list = map.get(client.id);
      if (list) {
        list.push(item);
      } else {
        map.set(client.id, [item]);
      }
    }
    return map;
  }, [items]);

  // Each stage's cards, oldest/soonest-first — computed once per `items`
  // change rather than inline in JSX. A column's `inquiries` array feeds
  // KanbanColumn's SortableContext (via its own memoized id list — see
  // Column.tsx), so it needs a stable reference across renders that don't
  // actually change `items`; recomputing a fresh sorted array on every
  // render there was exactly the kind of unmemoized-value-feeding-
  // SortableContext bug that trips dnd-kit's internal effects into an
  // infinite "Maximum update depth exceeded" loop under real, frequent
  // pointermove-driven re-renders while dragging.
  const inquiriesByStage = useMemo(() => {
    const map = new Map<StageValue, BoardInquiry[]>();
    for (const stageMeta of STAGES) {
      map.set(stageMeta.value, sortByStageDate(items.filter((item) => item.stage === stageMeta.value)));
    }
    return map;
  }, [items]);

  // The Questions drawer's own data — separate from `items` above, since
  // question-type inquiries are excluded from the board's own query
  // entirely (see index.tsx).
  const [questionList, setQuestionList] = useState<Inquiry[]>(questions);
  const unhandledQuestionCount = questionList.filter((question) => !question.questionHandled).length;

  // The Templates drawer's own data — separate from `items`/`questionList`
  // above, same reasoning: it's its own independent list, not derived from
  // the board's inquiries.
  const [templateList, setTemplateList] = useState<TemplateWithCategory[]>(templates);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Without a distance threshold, dnd-kit treats the initial pointerdown
      // itself as the drag start, which swallows the click a plain card
      // click needs to open the detail drawer. This is the standard
      // dnd-kit recipe for telling a click and a drag apart.
      activationConstraint: { distance: 8 },
    }),
  );

  const stageOf = (id: number): StageValue | undefined =>
    items.find((item) => item.id === id)?.stage;

  const resolveOverStage = (overId: string | number): StageValue | undefined => {
    if (isStageValue(overId)) return overId;
    return items.find((item) => item.id === overId)?.stage;
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    const id = Number(active.id);
    setActiveId(id);
    const stage = stageOf(id);
    if (stage) dragStartStage.current[id] = stage;
  };

  const handleDragOver = ({ active, over }: DragOverEvent) => {
    if (!over) return;
    const id = Number(active.id);
    const overStage = resolveOverStage(over.id);
    if (!overStage) return;
    setItems((prev) =>
      prev.map((item) => (item.id === id && item.stage !== overStage ? { ...item, stage: overStage } : item)),
    );
  };

  const revertTo = (id: number, stage: StageValue) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, stage } : item)));
  };

  // Shared by both the drag-and-drop flow below and the drawer's stage
  // <select> (Phase 6, the only way to change stage at the mobile
  // breakpoint, where there's no drag-and-drop) — PATCHes the stage,
  // reflects the auto-archive hook if it fired, and reverts + surfaces an
  // error banner if the request fails.
  const persistStageChange = async (id: number, previousStage: StageValue, nextStage: StageValue) => {
    if (nextStage === previousStage) return;
    const success = await enqueueFieldPatch(id, { stage: nextStage }, { stage: previousStage });
    setError(success ? null : "Couldn't save that move — please try again.");
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    const id = Number(active.id);
    setActiveId(null);
    const startStage = dragStartStage.current[id];
    delete dragStartStage.current[id];

    if (!over) {
      if (startStage) revertTo(id, startStage);
      return;
    }

    // onDragOver already moved this item's stage in `items` live as it was
    // dragged over each column, so `stageOf(id)` here is wherever it was
    // dropped.
    const finalStage = stageOf(id);
    if (!finalStage || !startStage) return;
    void persistStageChange(id, startStage, finalStage);
  };

  const handleDragCancel = () => {
    const id = activeId;
    setActiveId(null);
    if (id === null) return;
    const startStage = dragStartStage.current[id];
    delete dragStartStage.current[id];
    if (startStage) revertTo(id, startStage);
  };

  const changeStage = (inquiry: BoardInquiry, nextStage: StageValue) => {
    void persistStageChange(inquiry.id, inquiry.stage, nextStage);
  };

  // Backs every inline-editable field DetailDrawer now has (price, payment
  // status, dates, notes, the prep checklist) — one PATCH of whatever
  // fields changed, optimistic update first, revert on failure, queued
  // per-record alongside stage changes (see enqueueFieldPatch above).
  // Returns success/failure instead of touching the shared `error` banner:
  // that banner lives in the main board, underneath the open Drawer's
  // overlay (the same reason QuestionsDrawer's actions do this too), so
  // DetailDrawer surfaces a failure inline, next to whatever field didn't
  // save.
  const updateInquiryFields = (id: number, patch: Partial<BoardInquiry>): Promise<boolean> =>
    enqueueFieldPatch(id, patch);

  const openCard = (inquiry: BoardInquiry) => {
    setSelectedId(inquiry.id);
    toggleModal(DETAIL_DRAWER_SLUG);
  };

  // AddCardDrawer already did the actual work (finding/creating the Client
  // and creating the Inquiry via /api/inquiries/add-lead) — this just drops
  // the result into the board's own state, the same "update local state
  // directly" pattern every other mutation here uses instead of a full
  // page/router refresh. New cards are always stage "lead", so they show up
  // in that column immediately via the existing per-stage filtering below.
  const handleCardCreated = (inquiry: BoardInquiry, isRepeatClient: boolean) => {
    setItems((prev) => [inquiry, ...prev]);
    if (isRepeatClient) {
      const clientId = inquiryClient(inquiry)?.id;
      if (clientId) setRepeatSet((prev) => new Set(prev).add(clientId));
    }
  };

  // Both Questions-drawer actions below intentionally don't touch the
  // shared `error` banner the way persistStageChange does — that banner
  // lives in the main board, underneath the Drawer's overlay, so it
  // wouldn't actually be visible while this drawer is open. They report
  // success/failure back to QuestionsDrawer instead, which surfaces a
  // failure inline on the row itself.

  const toggleQuestionHandled = async (question: Inquiry): Promise<boolean> => {
    const nextHandled = !question.questionHandled;
    setQuestionList((prev) =>
      prev.map((item) => (item.id === question.id ? { ...item, questionHandled: nextHandled } : item)),
    );
    try {
      const res = await fetch(`${apiBase}/inquiries/${question.id}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ questionHandled: nextHandled }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return true;
    } catch {
      setQuestionList((prev) =>
        prev.map((item) =>
          item.id === question.id ? { ...item, questionHandled: question.questionHandled } : item,
        ),
      );
      return false;
    }
  };

  // Flips inquiryType to "booking" and sets the chosen category in one
  // PATCH — Inquiries.ts's conditional validate sees both together against
  // the merged document, so this passes even though category is only
  // required once inquiryType is "booking". depth=1 so the response's
  // `category` comes back populated, matching what BoardInquiry (and every
  // card on the board) expects.
  const moveQuestionToLeads = async (question: Inquiry, categoryId: number): Promise<boolean> => {
    try {
      const res = await fetch(`${apiBase}/inquiries/${question.id}?depth=1`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inquiryType: "booking", category: categoryId }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      const body: { doc?: BoardInquiry } = await res.json();
      if (body.doc) {
        setItems((prev) => [body.doc as BoardInquiry, ...prev]);
      }
      setQuestionList((prev) => prev.filter((item) => item.id !== question.id));
      return true;
    } catch {
      return false;
    }
  };

  // Backs TemplateItemsEditor's add/edit/remove mutations (TemplatesDrawer.tsx)
  // — same optimistic-update-then-PATCH-then-revert shape as
  // updateInquiryFields above, just against the checklist-templates
  // collection's own REST endpoint instead of inquiries'. Reports
  // success/failure back rather than touching the shared `error` banner, for
  // the same reason toggleQuestionHandled/moveQuestionToLeads do: that banner
  // sits underneath this Drawer's overlay.
  const updateTemplateItems = async (
    templateId: number,
    items: { id?: string | null; text: string }[],
  ): Promise<boolean> => {
    const previous = templateList.find((template) => template.id === templateId);
    if (!previous) return false;

    setTemplateList((prev) =>
      prev.map((template) => (template.id === templateId ? { ...template, items } : template)),
    );
    try {
      const res = await fetch(`${apiBase}/checklist-templates/${templateId}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      if (!res.ok) throw new Error(`Update failed: ${res.status}`);
      return true;
    } catch {
      setTemplateList((prev) => prev.map((template) => (template.id === templateId ? previous : template)));
      return false;
    }
  };

  const activeInquiry = activeId !== null ? items.find((item) => item.id === activeId) ?? null : null;
  const selectedInquiry = selectedId !== null ? items.find((item) => item.id === selectedId) ?? null : null;
  const selectedIsRepeat = (() => {
    if (!selectedInquiry) return false;
    const client = inquiryClient(selectedInquiry);
    return client !== null && repeatSet.has(client.id);
  })();

  return (
    <div className={styles.board}>
      <div className={styles.topBar}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{view === "board" ? "Inquiries Board" : "Inquiries Calendar"}</h1>
          <p className={styles.subtitle}>
            {view === "board"
              ? `${items.length} active ${items.length === 1 ? "inquiry" : "inquiries"} — drag a card to move it through the pipeline.`
              : "Shoot dates and deadlines pulled from every active inquiry."}
          </p>
        </div>
        <div className={styles.topBarActions}>
          <div className={styles.viewToggle} role="group" aria-label="Board view">
            <button
              type="button"
              className={`${styles.viewToggleButton}${view === "board" ? ` ${styles.viewToggleButtonActive}` : ""}`}
              aria-pressed={view === "board"}
              onClick={() => setView("board")}
            >
              Board
            </button>
            <button
              type="button"
              className={`${styles.viewToggleButton}${view === "calendar" ? ` ${styles.viewToggleButtonActive}` : ""}`}
              aria-pressed={view === "calendar"}
              onClick={() => setView("calendar")}
            >
              Calendar
            </button>
          </div>
          <button
            type="button"
            className={styles.questionsButton}
            onClick={() => toggleModal(QUESTIONS_DRAWER_SLUG)}
          >
            Questions
            {unhandledQuestionCount > 0 && (
              <span className={styles.questionsBadge}>
                {unhandledQuestionCount > 99 ? "99+" : unhandledQuestionCount}
              </span>
            )}
          </button>
          <Link
            href={
              `${formatAdminURL({ adminRoute: config.routes.admin, path: "/collections/inquiries" })}?where[archived][equals]=true&from=kanban` as `/${string}`
            }
            prefetch={false}
            className={styles.questionsButton}
          >
            Archive
          </Link>
          <button
            type="button"
            className={styles.questionsButton}
            onClick={() => toggleModal(TEMPLATES_DRAWER_SLUG)}
          >
            Templates
          </button>
          <button
            type="button"
            className={styles.addButton}
            onClick={() => toggleModal(ADD_CARD_DRAWER_SLUG)}
          >
            + Add Card
          </button>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {view === "board" ? (
        <>
          {/* Desktop/tablet: horizontal-scroll drag-and-drop columns —
              hidden below the mobile breakpoint (see .columns in
              KanbanBoard.module.css) in favor of MobileBoardList below.
              Both are mounted at once and CSS decides which is visible,
              rather than a JS media-query check, so there's no
              hydration-mismatch risk or layout flash on first paint. */}
          <DndContext
            // A stable id, rather than dnd-kit's default auto-incrementing
            // counter, for the aria-describedby ids it generates — without one,
            // that counter's SSR vs. client-hydration value can drift (e.g.
            // under React 19 strict-mode's double render in dev), which throws
            // a hydration-mismatch warning even though nothing is functionally
            // wrong.
            id="kanban-board"
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className={styles.columns}>
              {STAGES.map((stageMeta) => (
                <KanbanColumn
                  key={stageMeta.value}
                  stage={stageMeta.value}
                  label={stageMeta.label}
                  inquiries={inquiriesByStage.get(stageMeta.value) ?? []}
                  repeatClientIds={repeatSet}
                  siblingsByClient={siblingsByClient}
                  onOpenCard={openCard}
                />
              ))}
            </div>

            <DragOverlay>
              {activeInquiry && (
                <div
                  className={`${styles.card} ${styles.dragOverlayCard}`}
                  style={{ borderLeftColor: getCategoryColor(activeInquiry.category.id).solid }}
                >
                  <CardContent
                    inquiry={activeInquiry}
                    isRepeat={(() => {
                      const client = inquiryClient(activeInquiry);
                      return client !== null && repeatSet.has(client.id);
                    })()}
                    siblings={(() => {
                      const client = inquiryClient(activeInquiry);
                      if (!client) return [];
                      return (siblingsByClient.get(client.id) ?? []).filter(
                        (sibling) => sibling.id !== activeInquiry.id,
                      );
                    })()}
                  />
                </div>
              )}
            </DragOverlay>
          </DndContext>

          {/* Mobile: vertical, filterable, collapsible list — no
              drag-and-drop; stage changes happen via the drawer's <select>
              instead. Hidden above the mobile breakpoint. */}
          <MobileBoardList items={items} onOpenCard={openCard} />
        </>
      ) : (
        <CalendarView inquiries={items} onOpenCard={openCard} />
      )}

      <DetailDrawer
        inquiry={selectedInquiry}
        isRepeat={selectedIsRepeat}
        adminRoute={config.routes.admin}
        templates={templateList}
        onStageChange={changeStage}
        onUpdateFields={updateInquiryFields}
      />

      <AddCardDrawer categories={categories} onCreated={handleCardCreated} />

      <QuestionsDrawer
        questions={questionList}
        categories={categories}
        onToggleHandled={toggleQuestionHandled}
        onMoveToLeads={moveQuestionToLeads}
      />

      <TemplatesDrawer templates={templateList} onUpdateItems={updateTemplateItems} />
    </div>
  );
}
