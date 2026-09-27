"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import type { FormState } from "payload";
import {
  ConfirmationModal,
  useAllFormFields,
  useDocumentInfo,
  useForm,
  useFormModified,
  useModal,
  useUploadEdits,
} from "@payloadcms/ui";

// Undo / Redo / Discard for the website-editor screens (every global plus
// the six website collections), wired via each one's beforeDocumentControls
// slot so it sits just left of the Live Preview eye and Publish/Save.
//
// It works on Payload's whole client-side form state: every change is
// recorded as a snapshot, and undo/redo/discard dispatch REPLACE_STATE with
// an earlier one. Payload's own replaceState()/reset() aren't used because
// both force the form to "not modified" (and reset() round-trips to the
// server). Nothing here ever submits — only Publish/Save writes anything, so
// an undone or discarded edit can't reach the live site or History. Live
// Preview reads the same form state, so it follows every restore on its own.

const discardModalSlug = "discard-unsaved-changes";

// Typing into the same field with less than this gap between changes is one
// undo step; a longer pause (or leaving the field) starts a new one.
const typingGroupMs = 1000;

// On upload collections (Photos, Backstage) the pending file and its crop /
// focal-point edits live in Payload's UploadEdits provider, outside form
// state, so a snapshot can't bring them back. These fields are left out of
// undo/redo (always kept as they currently are). Discard clears the pending
// crop / focal-point edits (they'd otherwise ride along with the next Save,
// in the form's action URL) and handles a pending file change by reloading
// the page — see discard() below.
const uploadMetaPaths = new Set([
  "file",
  "filename",
  "mimeType",
  "filesize",
  "width",
  "height",
  "focalX",
  "focalY",
  "url",
  "thumbnailURL",
]);
const isUploadMeta = (path: string) =>
  uploadMetaPaths.has(path) || path.startsWith("sizes.");

// Only what the editor actually typed/picked counts as a change — not the
// validation errors, custom components, or loading flags the server merges
// back in after every edit.
type Projection = Record<string, { v: unknown; rows?: string[] }>;

type Entry = {
  state: FormState;
  proj: Projection;
  at: number;
  // The single field this step's typing is grouped under, if any.
  groupPath: string | null;
};

// The undo/redo stack. entries[0] is the last saved state; `index` is where
// the form currently is. Lives outside React state so recording a change
// never re-renders the form; the buttons subscribe via useSyncExternalStore.
class History {
  private entries: Entry[] = [];
  private index = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  // Set while a restore is in flight: the form can re-render with its old
  // state before REPLACE_STATE lands, and that stale state mustn't be
  // recorded as a new edit. Expires in case the restore never lands exactly.
  private awaiting: { proj: Projection; until: number } | null = null;

  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => void this.listeners.delete(listener);
  };

  getVersion = () => this.version;

  private notify() {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  canUndo = () => this.index > 0;
  canRedo = () => this.index < this.entries.length - 1;
  position = () => this.index;
  entry = (index: number) => this.entries[index];
  baseline = () => this.entries[0];

  reset(state: FormState) {
    this.entries = [{ state, proj: project(state), at: 0, groupPath: null }];
    this.index = 0;
    this.awaiting = null;
    this.notify();
  }

  moveTo(index: number) {
    this.index = index;
    this.awaiting = { proj: this.entries[index].proj, until: Date.now() + 1000 };
    this.notify();
  }

  // Folds a new form state into the history: ignored, merged into the
  // current step, or pushed as a new step (dropping any redo steps).
  // Returns true only when a new step was pushed.
  record(state: FormState, { modified, groupBroken }: { modified: boolean; groupBroken: boolean }) {
    if (this.entries.length === 0) return false;
    const current = this.entries[this.index];
    const proj = project(state);
    if (this.awaiting) {
      const landed = changedPaths(this.awaiting.proj, proj).length === 0;
      if (!landed && Date.now() < this.awaiting.until) return false;
      this.awaiting = null;
    }
    const changed = changedPaths(current.proj, proj);
    if (changed.length === 0) {
      // Same values (e.g. the server merging validation or components back
      // in, or the state we just restored) — keep the freshest copy.
      current.state = state;
      return false;
    }

    // Unmodified form + nothing to undo: a non-editor change such as the
    // post-save refresh (e.g. a slug the server formatted). Baseline moves.
    if (!modified && this.entries.length === 1) {
      this.reset(state);
      return false;
    }

    // Only brand-new paths appearing: the server filling in a just-added
    // array row's defaults. Part of the step that added the row.
    if (changed.every((path) => !(path in current.proj))) {
      current.state = state;
      current.proj = proj;
      return false;
    }

    const now = Date.now();
    const singlePath = changed.length === 1 && !state[changed[0]]?.rows ? changed[0] : null;
    const entry = { state, proj, at: now, groupPath: singlePath };

    if (
      singlePath &&
      this.index > 0 &&
      this.index === this.entries.length - 1 &&
      current.groupPath === singlePath &&
      now - current.at < typingGroupMs &&
      !groupBroken
    ) {
      this.entries[this.index] = entry;
      return false;
    }

    this.entries = [...this.entries.slice(0, this.index + 1), entry];
    this.index = this.entries.length - 1;
    this.notify();
    return true;
  }
}

function project(state: FormState): Projection {
  const proj: Projection = {};
  for (const [path, field] of Object.entries(state)) {
    if (isUploadMeta(path)) continue;
    proj[path] = { v: field.value, rows: field.rows?.map((row) => String(row.id)) };
  }
  return proj;
}

function same(a: unknown, b: unknown): boolean {
  if (Object.is(a, b)) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a).filter((k) => (a as Record<string, unknown>)[k] !== undefined);
  const bKeys = Object.keys(b).filter((k) => (b as Record<string, unknown>)[k] !== undefined);
  if (aKeys.length !== bKeys.length) return false;
  return aKeys.every((k) =>
    same((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
  );
}

function changedPaths(from: Projection, to: Projection): string[] {
  const paths = new Set([...Object.keys(from), ...Object.keys(to)]);
  return [...paths].filter((path) => !same(from[path], to[path]));
}

// Lexical's rich-text editor keeps its own document and only reloads it from
// the form when the field's `initialValue` object changes (see
// handleInitialValueChange in @payloadcms/richtext-lexical's field/Field.js).
// Restoring just `value` would leave the editor showing the newer text, so a
// restored rich-text field also gets a fresh initialValue copy. Relies on
// that Payload internal — recheck after upgrading @payloadcms/richtext-lexical.
const isRichText = (value: unknown) =>
  typeof value === "object" && value !== null && "root" in value;

// A text box (or rich-text editor / dropdown search) keeps the browser's own
// Ctrl+Z; the shortcuts only drive this history when focus is elsewhere.
function isTextEntry(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement) return true;
  if (el instanceof HTMLInputElement) {
    return !["checkbox", "radio", "button", "submit", "reset", "file", "range", "color"].includes(
      el.type,
    );
  }
  return (el as HTMLElement).isContentEditable;
}

export default function EditHistory() {
  const [fields] = useAllFormFields();
  const { dispatchFields, getFields, setIsValid, setModified } = useForm();
  const modified = useFormModified();
  const { data, globalSlug } = useDocumentInfo();
  const { openModal, modalState } = useModal();
  const { resetUploadEdits } = useUploadEdits();

  const [history] = useState(() => new History());
  useSyncExternalStore(history.subscribe, history.getVersion, history.getVersion);
  const groupBroken = useRef(false);

  // A successful Publish/Save hands Payload's DocumentInfo fresh saved data
  // (a failed one doesn't), so this also clears history after every save.
  useEffect(() => {
    history.reset(getFields());
  }, [data, getFields, history]);

  // Record every change to the form.
  useEffect(() => {
    if (history.record(fields, { modified, groupBroken: groupBroken.current })) {
      groupBroken.current = false;
    }
  }, [fields, history, modified]);

  // Leaving a field ends its typing group even without a pause.
  useEffect(() => {
    const onFocusOut = () => {
      groupBroken.current = true;
    };
    document.addEventListener("focusout", onFocusOut);
    return () => document.removeEventListener("focusout", onFocusOut);
  }, []);

  const restore = useCallback(
    (targetIndex: number, { includeUploadMeta = false } = {}) => {
      const target = history.entry(targetIndex);
      const current = getFields();
      const next: FormState = {};

      for (const [path, field] of Object.entries(target.state)) {
        if (!includeUploadMeta && isUploadMeta(path)) continue;
        let restored = field;
        // Keep rows collapsed/expanded the way the editor has them now —
        // opening or closing a row isn't an edit.
        const nowRows = current[path]?.rows;
        if (field.rows && nowRows) {
          const collapsed = new Map(nowRows.map((row) => [row.id, row.collapsed]));
          restored = {
            ...restored,
            rows: field.rows.map((row) =>
              collapsed.has(row.id) ? { ...row, collapsed: collapsed.get(row.id) } : row,
            ),
          };
        }
        if (isRichText(field.value) && !same(field.value, current[path]?.value)) {
          restored = { ...restored, initialValue: structuredClone(field.value) };
        }
        next[path] = restored;
      }
      if (!includeUploadMeta) {
        for (const [path, field] of Object.entries(current)) {
          if (isUploadMeta(path)) next[path] = field;
        }
      }

      groupBroken.current = true;
      dispatchFields({ type: "REPLACE_STATE", state: next });
      // Back at the saved state means nothing to publish; anywhere else does.
      const atSaved = same(target.proj, history.baseline().proj);
      setModified(!atSaved);
      // The saved state passed validation. Payload leaves isValid false after
      // a rejected save until the next submit, which would keep its "leave
      // without saving" warning up even with nothing left to save.
      if (atSaved) setIsValid(true);
      history.moveTo(targetIndex);
    },
    [dispatchFields, getFields, history, setIsValid, setModified],
  );

  const canUndo = history.canUndo();
  const canRedo = history.canRedo();
  const hasChanges = modified || canUndo;

  const undo = useCallback(() => {
    if (history.canUndo()) restore(history.position() - 1);
  }, [history, restore]);

  const redo = useCallback(() => {
    if (history.canRedo()) restore(history.position() + 1);
  }, [history, restore]);

  const discard = useCallback(() => {
    const baseline = history.baseline();
    if (!baseline) return;
    // Payload's Upload field keeps its own "file removed" flag and preview
    // (elements/Upload's removedFile / fileSrc state), which no form-state
    // restore can reach — the saved file stays hidden behind the pending
    // one. So when a file change is pending, reset the form (so the
    // leave-page warning stays quiet) and reload to show the saved record.
    const pendingFile = getFields().file?.value;
    const fileChanged =
      pendingFile instanceof File || !same(pendingFile ?? null, baseline.state.file?.value ?? null);
    restore(0, { includeUploadMeta: true });
    resetUploadEdits?.();
    setModified(false);
    history.reset(baseline.state);
    if (fileChanged) setTimeout(() => window.location.reload(), 100);
  }, [getFields, history, resetUploadEdits, restore, setModified]);

  // Ctrl+Z / Ctrl+Shift+Z / Ctrl+Y (Cmd on Mac), only outside text boxes and
  // only while no drawer or modal (which may hold its own form) is open.
  const anyModalOpen = Object.values(modalState ?? {}).some((m) => m?.isOpen);
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || anyModalOpen) return;
      if (isTextEntry(document.activeElement)) return;
      const key = e.key.toLowerCase();
      if (key === "z" && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if ((key === "z" && e.shiftKey) || (key === "y" && !e.shiftKey)) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [anyModalOpen, undo, redo]);

  const savedWord = globalSlug ? "published" : "saved";

  return (
    <>
      <div className="edit-history" role="group" aria-label="Edit history">
        <button
          type="button"
          className="edit-history__btn"
          onClick={undo}
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
          aria-label="Undo"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
          </svg>
        </button>
        <button
          type="button"
          className="edit-history__btn"
          onClick={redo}
          disabled={!canRedo}
          title="Redo (Ctrl+Shift+Z)"
          aria-label="Redo"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="m15 14 5-5-5-5" />
            <path d="M20 9H9.5a5.5 5.5 0 0 0 0 11H13" />
          </svg>
        </button>
        <button
          type="button"
          className="edit-history__btn"
          onClick={() => openModal(discardModalSlug)}
          disabled={!hasChanges}
          title="Discard unsaved changes"
          aria-label="Discard unsaved changes"
        >
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
            <path d="M3 3v5h5" />
          </svg>
        </button>
      </div>
      <ConfirmationModal
        modalSlug={discardModalSlug}
        heading="Discard all unsaved changes?"
        body={`Every field goes back to how it was last ${savedWord}. The live site isn't affected.`}
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        onConfirm={discard}
      />
    </>
  );
}
