"use client";

import { useState, type ChangeEvent, type KeyboardEvent, type ReactNode } from "react";
import { Drawer, Link } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";
import styles from "./KanbanBoard.module.css";
import { drawerScrollRef } from "./drawer-scroll";
import { PAYMENT_STATUS_LABELS, POST_PRODUCTION_LABELS, SOURCE_LABELS, toDateInputValue } from "./format";
import { inquiryClient, STAGES, type BoardInquiry, type StageValue, type TemplateWithCategory } from "./types";

export const DETAIL_DRAWER_SLUG = "kanban-inquiry-detail";

type ChecklistRow = { id?: string | null; item: string; completed: boolean };

type ChecklistTemplateType = TemplateWithCategory["type"];

// The two template options ChecklistEditor's "Apply template" row offers for
// a given checklist: the Standard template (always first, if it exists) and
// this job's own category's template (if it has one) — never every
// category's template, just the one relevant to this job. Sourced from the
// same `templates` list TemplatesDrawer.tsx edits, so an edit made there
// shows up here the moment this drawer is (re)opened, no reload needed.
function templateOptionsFor(
  templates: TemplateWithCategory[],
  type: ChecklistTemplateType,
  categoryId: number,
): { label: string; items: { text?: string | null }[] }[] {
  const options: { label: string; items: { text?: string | null }[] }[] = [];

  const standard = templates.find((template) => template.type === type && !template.category);
  if (standard) options.push({ label: "Standard", items: standard.items ?? [] });

  const forCategory = templates.find(
    (template) => template.type === type && template.category?.id === categoryId,
  );
  if (forCategory?.category) {
    options.push({ label: forCategory.category.name, items: forCategory.items ?? [] });
  }

  return options;
}

// A single Drawer instance, mounted once by Board.tsx and toggled via
// useModal().toggleModal(DETAIL_DRAWER_SLUG) whenever a card is clicked —
// same Drawer + useModal pairing @payloadcms/ui's own CopyLocaleData panel
// uses. Its content is driven entirely by the `inquiry` prop rather than
// fetching anything itself: the board already has full field data for every
// non-archived Inquiry from the server-rendered initial load.
//
// The stage <select> was the only editable field here through Phase 6/7 —
// everything below it now follows the same live-PATCH pattern for the
// fields that make sense to edit routinely (price, payment status,
// location, source, the three dates, the prep checklist, notes), so "Open
// full record" at the bottom is a fallback for the rare stuff (deleting the
// record) rather than a required step.
//
// Every editable field's local state is keyed off `inquiry.id` (see the
// wrapping div's `key` below) so switching to a different card fully resets
// it, rather than a stale value from the previous card lingering in some
// uncontrolled input.
export default function DetailDrawer({
  inquiry,
  isRepeat,
  adminRoute,
  templates,
  onStageChange,
  onUpdateFields,
}: {
  inquiry: BoardInquiry | null;
  isRepeat: boolean;
  adminRoute: string;
  templates: TemplateWithCategory[];
  onStageChange: (inquiry: BoardInquiry, stage: StageValue) => void;
  onUpdateFields: (id: number, patch: Partial<BoardInquiry>) => Promise<boolean>;
}) {
  const client = inquiry ? inquiryClient(inquiry) : null;

  return (
    <Drawer
      slug={DETAIL_DRAWER_SLUG}
      className="kanban-drawer"
      title={client?.name ?? inquiry?.name ?? "Inquiry"}
    >
      {inquiry && (
        <div className={styles.drawerBody} key={inquiry.id} ref={drawerScrollRef}>
          <div className={styles.drawerHeader}>
            <h2 className={styles.drawerClientName}>{client?.name ?? inquiry.name}</h2>
            <div className={styles.drawerBadgeRow}>
              <span className={styles.pill}>{inquiry.category.name}</span>
              {isRepeat && <span className={styles.repeatBadge}>Repeat client</span>}
            </div>
          </div>

          <div className={styles.stageField}>
            <label className={styles.detailLabel} htmlFor="drawer-stage-select">
              Stage
            </label>
            <select
              id="drawer-stage-select"
              className={styles.stageSelect}
              value={inquiry.stage}
              onChange={(event) => onStageChange(inquiry, event.target.value as StageValue)}
            >
              {STAGES.map((stage) => (
                <option key={stage.value} value={stage.value}>
                  {stage.label}
                </option>
              ))}
            </select>
          </div>

          {isRepeat && client && (
            <div className={styles.repeatNotice}>
              {client.name} has booked with you before —{" "}
              <Link
                href={
                  `${formatAdminURL({ adminRoute, path: "/collections/inquiries" })}?where[client][equals]=${client.id}&from=kanban` as `/${string}`
                }
                prefetch={false}
              >
                see their other jobs
              </Link>
              .
            </div>
          )}

          <div className={styles.detailGrid}>
            <EditableLocationField
              label="Location"
              initialValue={{
                street: inquiry.location?.street ?? "",
                city: inquiry.location?.city ?? "",
                state: inquiry.location?.state ?? "",
              }}
              onCommit={(value) =>
                onUpdateFields(inquiry.id, {
                  location: {
                    street: value.street || null,
                    city: value.city || null,
                    state: value.state || null,
                  },
                })
              }
            />

            <EditableSelectField
              label="Source"
              initialValue={inquiry.source ?? ""}
              options={[
                { value: "", label: "Not set" },
                { value: "website", label: SOURCE_LABELS.website },
                { value: "manual_social", label: SOURCE_LABELS.manual_social },
                { value: "manual_email", label: SOURCE_LABELS.manual_email },
                { value: "manual_referral", label: SOURCE_LABELS.manual_referral },
              ]}
              onCommit={(value) =>
                onUpdateFields(inquiry.id, { source: (value || null) as BoardInquiry["source"] })
              }
            />

            <EditableTextField
              label="Price"
              type="number"
              initialValue={inquiry.price != null ? String(inquiry.price) : ""}
              placeholder="Not set"
              onCommit={(value) => {
                const trimmed = value.trim();
                if (trimmed === "") return onUpdateFields(inquiry.id, { price: null });
                const price = Number(trimmed);
                if (Number.isNaN(price)) return Promise.resolve(false);
                return onUpdateFields(inquiry.id, { price });
              }}
            />

            <EditableSelectField
              label="Payment status"
              initialValue={inquiry.paymentStatus ?? ""}
              options={[
                { value: "", label: "Not set" },
                { value: "unpaid", label: PAYMENT_STATUS_LABELS.unpaid },
                { value: "deposit", label: PAYMENT_STATUS_LABELS.deposit },
                { value: "paid", label: PAYMENT_STATUS_LABELS.paid },
              ]}
              onCommit={(value) =>
                onUpdateFields(inquiry.id, {
                  paymentStatus: (value || null) as BoardInquiry["paymentStatus"],
                })
              }
            />

            {inquiry.stage === "post" && (
              <EditableSelectField
                label="Post-production status"
                initialValue={inquiry.postProductionStatus ?? ""}
                options={[
                  { value: "", label: "Not set" },
                  { value: "editing", label: POST_PRODUCTION_LABELS.editing },
                  { value: "edited", label: POST_PRODUCTION_LABELS.edited },
                  { value: "sent", label: POST_PRODUCTION_LABELS.sent },
                ]}
                onCommit={(value) =>
                  onUpdateFields(inquiry.id, {
                    postProductionStatus: (value || null) as BoardInquiry["postProductionStatus"],
                  })
                }
              />
            )}

            <EditableDateField
              label="Shoot date"
              initialValue={toDateInputValue(inquiry.shootDate)}
              labelExtra={
                inquiry.shootDate ? (
                  inquiry.shootDateConfirmed ? (
                    <span
                      className={styles.confirmedMark}
                      title="Confirmed — this is the locked-in shoot date, not a placeholder"
                    >
                      ✓
                    </span>
                  ) : (
                    <span className={styles.tentativeIndicator}>
                      <span
                        className={styles.tentativeMark}
                        title="Tentative — copied from the client's requested date, not yet confirmed"
                      >
                        !
                      </span>
                      <button
                        type="button"
                        className={styles.confirmLink}
                        onClick={() => onUpdateFields(inquiry.id, { shootDateConfirmed: true })}
                      >
                        Confirm
                      </button>
                    </span>
                  )
                ) : null
              }
              // Actively changing the date is itself a confirming action —
              // no separate click needed, so this bundles shootDateConfirmed
              // into the same PATCH as the date value. Clicking "Confirm"
              // above (when the date hasn't been touched) sends its own
              // PATCH instead, deliberately not going through this onCommit,
              // so it never touches shootDate itself.
              onCommit={(value) =>
                onUpdateFields(inquiry.id, { shootDate: value || null, shootDateConfirmed: true })
              }
            />
            <EditableDateField
              label="Delivery deadline"
              initialValue={toDateInputValue(inquiry.deliveryDeadline)}
              onCommit={(value) => onUpdateFields(inquiry.id, { deliveryDeadline: value || null })}
            />
          </div>

          <div>
            <h3 className={styles.drawerSectionTitle}>Testimonial &amp; gallery</h3>
            <div className={styles.pillRow}>
              {/* Real checkboxes, not read-only status — these are the only
                  UI path to trigger the Wrap-Up auto-archive hook (both true
                  archives the record; see Inquiries.ts's autoArchive). No
                  local component state, same as the Stage <select> above:
                  `checked` reads straight off the `inquiry` prop, and
                  onUpdateFields' own optimistic update (with revert on
                  failure) in Board.tsx is what actually drives the re-render. */}
              <label
                className={`${styles.pill} ${styles.pillCheckbox} ${inquiry.testimonialReceived ? styles.pillSuccess : styles.pillMuted}`}
              >
                <input
                  type="checkbox"
                  checked={inquiry.testimonialReceived ?? false}
                  onChange={() =>
                    onUpdateFields(inquiry.id, { testimonialReceived: !inquiry.testimonialReceived })
                  }
                />
                Testimonial received
              </label>
              <label
                className={`${styles.pill} ${styles.pillCheckbox} ${inquiry.addedToSite ? styles.pillSuccess : styles.pillMuted}`}
              >
                <input
                  type="checkbox"
                  checked={inquiry.addedToSite ?? false}
                  onChange={() => onUpdateFields(inquiry.id, { addedToSite: !inquiry.addedToSite })}
                />
                Added to site
              </label>
              <span
                className={`${styles.pill} ${inquiry.testimonialRequestSent ? styles.pillSuccess : styles.pillMuted}`}
              >
                {inquiry.testimonialRequestSent ? "Request sent" : "Request not sent"}
              </span>
            </div>
          </div>

          <ChecklistEditor
            title="Prep checklist"
            placeholder="Add a prep task…"
            initialItems={inquiry.prepChecklist ?? []}
            templateOptions={templateOptionsFor(templates, "prep", inquiry.category.id)}
            onCommit={(items) => onUpdateFields(inquiry.id, { prepChecklist: items })}
          />

          <ChecklistEditor
            title="Post-production checklist"
            placeholder="Add a post-production task…"
            initialItems={inquiry.postProductionChecklist ?? []}
            templateOptions={templateOptionsFor(templates, "postProduction", inquiry.category.id)}
            onCommit={(items) => onUpdateFields(inquiry.id, { postProductionChecklist: items })}
          />

          <div>
            <h3 className={styles.drawerSectionTitle}>Client&apos;s message</h3>
            <p className={styles.readOnlyMessage}>{inquiry.message}</p>
          </div>

          <EditableTextField
            label="Notes"
            multiline
            initialValue={inquiry.notes ?? ""}
            placeholder="Private notes — the client never sees these."
            onCommit={(value) => onUpdateFields(inquiry.id, { notes: value || null })}
          />

          <div className={styles.drawerFooter}>
            <Link
              href={
                `${formatAdminURL({ adminRoute, path: `/collections/inquiries/${inquiry.id}` })}?from=kanban` as `/${string}`
              }
              prefetch={false}
            >
              Open full record →
            </Link>
          </div>
        </div>
      )}
    </Drawer>
  );
}

// Commits on blur, not on every keystroke — the same "settle, then save"
// behavior a text field editing pattern needs (unlike the select/date
// fields below, where a single onChange already is the settled value).
function EditableTextField({
  label,
  initialValue,
  type = "text",
  placeholder,
  multiline = false,
  onCommit,
}: {
  label: string;
  initialValue: string;
  type?: "text" | "number";
  placeholder?: string;
  multiline?: boolean;
  onCommit: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = async () => {
    if (value === initialValue) return;
    setIsSaving(true);
    setError(null);
    const success = await onCommit(value);
    setIsSaving(false);
    if (!success) {
      setValue(initialValue);
      setError("Couldn't save — please try again.");
    }
  };

  return (
    <div className={`${styles.stageField} ${styles.detailGridField}`}>
      <label className={styles.detailLabel}>{label}</label>
      {multiline ? (
        <textarea
          className={styles.notesTextarea}
          value={value}
          placeholder={placeholder}
          disabled={isSaving}
          onChange={(event: ChangeEvent<HTMLTextAreaElement>) => setValue(event.target.value)}
          onBlur={handleBlur}
        />
      ) : (
        <input
          type={type}
          className={styles.stageSelect}
          value={value}
          placeholder={placeholder}
          disabled={isSaving}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
          onBlur={handleBlur}
        />
      )}
      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}

type LocationValue = { street: string; city: string; state: string };

// Three separate street/city/state inputs, each committing on blur — same
// "settle, then save" pattern as EditableTextField above, just spread across
// a small group of fields instead of one. Always renders the inputs (with a
// "Not set" placeholder) rather than falling back to a static display when
// empty, so Location behaves like Price/Payment status instead of
// disappearing when nothing's been entered yet.
function EditableLocationField({
  label,
  initialValue,
  onCommit,
}: {
  label: string;
  initialValue: LocationValue;
  onCommit: (value: LocationValue) => Promise<boolean>;
}) {
  const [value, setValue] = useState<LocationValue>(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = async () => {
    if (
      value.street === initialValue.street &&
      value.city === initialValue.city &&
      value.state === initialValue.state
    ) {
      return;
    }
    setIsSaving(true);
    setError(null);
    const success = await onCommit(value);
    setIsSaving(false);
    if (!success) {
      setValue(initialValue);
      setError("Couldn't save — please try again.");
    }
  };

  return (
    <div className={`${styles.stageField} ${styles.detailGridField}`}>
      <label className={styles.detailLabel}>{label}</label>
      <div className={styles.locationInputs}>
        <input
          type="text"
          className={styles.stageSelect}
          value={value.street}
          placeholder="Street — not set"
          disabled={isSaving}
          onChange={(event: ChangeEvent<HTMLInputElement>) => setValue((prev) => ({ ...prev, street: event.target.value }))}
          onBlur={handleBlur}
        />
        <div className={styles.locationCityState}>
          <input
            type="text"
            className={styles.stageSelect}
            value={value.city}
            placeholder="City — not set"
            disabled={isSaving}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setValue((prev) => ({ ...prev, city: event.target.value }))}
            onBlur={handleBlur}
          />
          <input
            type="text"
            className={styles.stageSelect}
            value={value.state}
            placeholder="State — not set"
            disabled={isSaving}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setValue((prev) => ({ ...prev, state: event.target.value }))}
            onBlur={handleBlur}
          />
        </div>
      </div>
      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}

// Select/date inputs commit immediately on change — there's no "typing in
// progress" state to wait out the way a text field has.
function EditableSelectField({
  label,
  initialValue,
  options,
  onCommit,
}: {
  label: string;
  initialValue: string;
  options: { value: string; label: string }[];
  onCommit: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState<string | null>(null);

  const handleChange = async (event: ChangeEvent<HTMLSelectElement>) => {
    const next = event.target.value;
    const previous = value;
    setValue(next);
    setError(null);
    const success = await onCommit(next);
    if (!success) {
      setValue(previous);
      setError("Couldn't save — please try again.");
    }
  };

  return (
    <div className={`${styles.stageField} ${styles.detailGridField}`}>
      <label className={styles.detailLabel}>{label}</label>
      <select className={styles.stageSelect} value={value} onChange={handleChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}

// Commits on blur, not on every change — same "settle, then save" pattern
// as EditableTextField above. A native date input fires onChange on every
// keystroke while typing digit-by-digit (including intermediate,
// not-yet-valid values, not just a picker's one clean selection), so
// committing there sends one PATCH per keystroke; overlapping requests can
// then resolve out of order and let an earlier, incomplete value overwrite
// the final one. Picking a date via the calendar widget still works the
// same way it did before: that single onChange updates local state, and
// the commit fires the next time the field blurs.
function EditableDateField({
  label,
  initialValue,
  labelExtra,
  onCommit,
}: {
  label: string;
  initialValue: string;
  labelExtra?: ReactNode;
  onCommit: (value: string) => Promise<boolean>;
}) {
  const [value, setValue] = useState(initialValue);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBlur = async () => {
    if (value === initialValue) return;
    setIsSaving(true);
    setError(null);
    const success = await onCommit(value);
    setIsSaving(false);
    if (!success) {
      setValue(initialValue);
      setError("Couldn't save — please try again.");
    }
  };

  return (
    <div className={`${styles.stageField} ${styles.detailGridField}`}>
      <div className={styles.dateLabelRow}>
        <label className={styles.detailLabel}>{label}</label>
        {labelExtra}
      </div>
      <input
        type="date"
        className={styles.stageSelect}
        value={value}
        disabled={isSaving}
        onChange={(event: ChangeEvent<HTMLInputElement>) => setValue(event.target.value)}
        onBlur={handleBlur}
      />
      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}

// Shared by the Prep and Post-Production checklist sections above — both are
// otherwise identical. Any add/edit/remove/apply replaces the whole array in
// one PATCH — Payload's array fields don't support patching a single row in
// place. Existing rows keep their `id` (so their identity survives the
// rewrite); a freshly added row has none yet and gets one assigned
// server-side.
function ChecklistEditor({
  title,
  placeholder,
  initialItems,
  templateOptions,
  onCommit,
}: {
  title: string;
  placeholder: string;
  initialItems: { id?: string | null; item?: string | null; completed?: boolean | null }[];
  templateOptions: { label: string; items: { text?: string | null }[] }[];
  onCommit: (items: ChecklistRow[]) => Promise<boolean>;
}) {
  const [items, setItems] = useState<ChecklistRow[]>(() =>
    initialItems.map((row) => ({ id: row.id, item: row.item ?? "", completed: row.completed ?? false })),
  );
  const [newItem, setNewItem] = useState("");
  const [templateIndex, setTemplateIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (nextItems: ChecklistRow[]) => {
    setIsSaving(true);
    setError(null);
    const success = await onCommit(nextItems);
    setIsSaving(false);
    if (!success) setError("Couldn't save the checklist — please try again.");
  };

  const updateItemText = (index: number, text: string) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, item: text } : row)));
  };

  // Toggling completion PATCHes right away — unlike the text edits above,
  // there's no "settle, then save" step to wait for.
  const toggleCompleted = (index: number) => {
    const next = items.map((row, i) => (i === index ? { ...row, completed: !row.completed } : row));
    setItems(next);
    void save(next);
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    void save(next);
  };

  const addItem = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    const next = [...items, { item: trimmed, completed: false }];
    setItems(next);
    setNewItem("");
    void save(next);
  };

  const handleNewItemKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  // Only ever appends — never touches an existing row's text, completion
  // state, or presence — so applying is safe to click as many times as she
  // likes. "Already present" is a plain trimmed-text match against the
  // current list (including anything typed but not yet its own template),
  // so re-applying the same template is a no-op, and applying to a
  // checklist that already has some custom items only fills in whatever's
  // still missing.
  const applyTemplate = () => {
    const template = templateOptions[templateIndex];
    if (!template) return;

    const existingTexts = new Set(items.map((row) => row.item.trim()));
    const additions: ChecklistRow[] = [];
    for (const row of template.items) {
      const text = (row.text ?? "").trim();
      if (!text || existingTexts.has(text)) continue;
      existingTexts.add(text);
      additions.push({ item: text, completed: false });
    }
    if (additions.length === 0) return;

    const next = [...items, ...additions];
    setItems(next);
    void save(next);
  };

  return (
    <div>
      <h3 className={styles.drawerSectionTitle}>{title}</h3>

      {templateOptions.length > 0 && (
        <div className={styles.inlineCategoryPicker}>
          <select
            className={styles.inlineCategorySelect}
            value={templateIndex}
            disabled={isSaving}
            onChange={(event) => setTemplateIndex(Number(event.target.value))}
          >
            {templateOptions.map((option, index) => (
              <option key={option.label} value={index}>
                {option.label}
              </option>
            ))}
          </select>
          <button type="button" className={styles.primaryButton} onClick={applyTemplate} disabled={isSaving}>
            Apply
          </button>
        </div>
      )}

      {items.length > 0 && (
        <div className={styles.checklistEditList}>
          {items.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className={styles.checklistEditRow}>
              <input
                type="checkbox"
                className={styles.checklistCheckbox}
                checked={row.completed}
                disabled={isSaving}
                onChange={() => toggleCompleted(index)}
                aria-label={row.item ? `Mark "${row.item}" ${row.completed ? "incomplete" : "complete"}` : "Toggle complete"}
              />
              <input
                type="text"
                className={`${styles.checklistInput} ${row.completed ? styles.checklistInputCompleted : ""}`}
                value={row.item}
                disabled={isSaving}
                onChange={(event) => updateItemText(index, event.target.value)}
                onBlur={() => save(items)}
              />
              <button
                type="button"
                className={styles.checklistRemoveButton}
                onClick={() => removeItem(index)}
                disabled={isSaving}
                aria-label={row.item ? `Remove "${row.item}"` : "Remove item"}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <div className={styles.checklistAddRow}>
        <input
          type="text"
          className={styles.checklistInput}
          placeholder={placeholder}
          value={newItem}
          disabled={isSaving}
          onChange={(event) => setNewItem(event.target.value)}
          onKeyDown={handleNewItemKeyDown}
        />
        <button
          type="button"
          className={styles.checklistAddButton}
          onClick={addItem}
          disabled={isSaving || !newItem.trim()}
        >
          Add
        </button>
      </div>

      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}
