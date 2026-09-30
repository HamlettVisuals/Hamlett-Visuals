"use client";

import { useState, type KeyboardEvent } from "react";
import { Drawer } from "@payloadcms/ui";
import styles from "./KanbanBoard.module.css";
import type { TemplateWithCategory } from "./types";

export const TEMPLATES_DRAWER_SLUG = "kanban-templates";

type TemplateType = "prep" | "postProduction";

const TEMPLATE_TABS: { value: TemplateType; label: string }[] = [
  { value: "prep", label: "Prep" },
  { value: "postProduction", label: "Post-Production" },
];

// Mounted once by Board.tsx and toggled via the top bar's "Templates"
// button — same Drawer pattern as QuestionsDrawer/DetailDrawer/AddCardDrawer.
// Every checklist-templates record is editable in place here: the Standard
// template (category unset — the fallback any category without its own
// falls back to) plus one per category that has its own, grouped by type and
// sorted by category name. New categories get their own blank pair
// automatically (Categories.ts's createBlankChecklistTemplates hook) — they
// show up here the next time this view is server-rendered, same as every
// other list this board is seeded with (there's no client-side polling).
export default function TemplatesDrawer({
  templates,
  onUpdateItems,
}: {
  templates: TemplateWithCategory[];
  onUpdateItems: (templateId: number, items: { id?: string | null; text: string }[]) => Promise<boolean>;
}) {
  const [activeTab, setActiveTab] = useState<TemplateType>("prep");

  const forType = templates.filter((template) => template.type === activeTab);
  const standard = forType.find((template) => !template.category) ?? null;
  const byCategory = forType
    .filter((template): template is TemplateWithCategory & { category: NonNullable<TemplateWithCategory["category"]> } =>
      Boolean(template.category),
    )
    .sort((a, b) => a.category.name.localeCompare(b.category.name));

  return (
    <Drawer slug={TEMPLATES_DRAWER_SLUG} className="kanban-drawer" title="Checklist Templates">
      <div className={styles.questionsBody}>
        <div className={styles.viewToggle} role="group" aria-label="Template type">
          {TEMPLATE_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              className={`${styles.viewToggleButton}${activeTab === tab.value ? ` ${styles.viewToggleButtonActive}` : ""}`}
              aria-pressed={activeTab === tab.value}
              onClick={() => setActiveTab(tab.value)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {standard ? (
          <TemplateSection key={standard.id} label="Standard" template={standard} onUpdateItems={onUpdateItems} />
        ) : (
          <div className={styles.emptyColumn}>No Standard template found for this type.</div>
        )}

        {byCategory.map((template) => (
          <TemplateSection
            key={template.id}
            label={template.category.name}
            template={template}
            onUpdateItems={onUpdateItems}
          />
        ))}
      </div>
    </Drawer>
  );
}

function TemplateSection({
  label,
  template,
  onUpdateItems,
}: {
  label: string;
  template: TemplateWithCategory;
  onUpdateItems: (templateId: number, items: { id?: string | null; text: string }[]) => Promise<boolean>;
}) {
  return (
    <div>
      <h3 className={styles.drawerSectionTitle}>{label}</h3>
      <TemplateItemsEditor
        initialItems={template.items ?? []}
        onCommit={(items) => onUpdateItems(template.id, items)}
      />
    </div>
  );
}

type TemplateRow = { id?: string | null; text: string };

// Same "replace the whole array in one PATCH" pattern as DetailDrawer's
// PrepChecklistEditor — Payload's array fields don't support patching a
// single row in place — just without a completed checkbox: a template only
// ever holds { text }, since whether an item is done only exists once it's
// copied onto a specific job's own checklist (Chunk 3), never on the
// template itself.
function TemplateItemsEditor({
  initialItems,
  onCommit,
}: {
  initialItems: { id?: string | null; text?: string | null }[];
  onCommit: (items: TemplateRow[]) => Promise<boolean>;
}) {
  const [items, setItems] = useState<TemplateRow[]>(() =>
    initialItems.map((row) => ({ id: row.id, text: row.text ?? "" })),
  );
  const [newText, setNewText] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (nextItems: TemplateRow[]) => {
    setIsSaving(true);
    setError(null);
    const success = await onCommit(nextItems);
    setIsSaving(false);
    if (!success) setError("Couldn't save — please try again.");
  };

  const updateItemText = (index: number, text: string) => {
    setItems((prev) => prev.map((row, i) => (i === index ? { ...row, text } : row)));
  };

  const removeItem = (index: number) => {
    const next = items.filter((_, i) => i !== index);
    setItems(next);
    void save(next);
  };

  const addItem = () => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const next = [...items, { text: trimmed }];
    setItems(next);
    setNewText("");
    void save(next);
  };

  const handleNewItemKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addItem();
    }
  };

  return (
    <div>
      {items.length > 0 && (
        <div className={styles.checklistEditList}>
          {items.map((row, index) => (
            <div key={row.id ?? `new-${index}`} className={styles.checklistEditRow}>
              <input
                type="text"
                className={styles.checklistInput}
                value={row.text}
                disabled={isSaving}
                onChange={(event) => updateItemText(index, event.target.value)}
                onBlur={() => save(items)}
              />
              <button
                type="button"
                className={styles.checklistRemoveButton}
                onClick={() => removeItem(index)}
                disabled={isSaving}
                aria-label={row.text ? `Remove "${row.text}"` : "Remove item"}
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
          placeholder="Add an item…"
          value={newText}
          disabled={isSaving}
          onChange={(event) => setNewText(event.target.value)}
          onKeyDown={handleNewItemKeyDown}
        />
        <button
          type="button"
          className={styles.checklistAddButton}
          onClick={addItem}
          disabled={isSaving || !newText.trim()}
        >
          Add
        </button>
      </div>

      {error && <p className={styles.rowError}>{error}</p>}
    </div>
  );
}
