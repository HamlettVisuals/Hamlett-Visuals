"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ArrayFieldClientProps, OptionObject } from "payload";
import {
  Button,
  ChevronIcon,
  DraggableSortable,
  DraggableSortableItem,
  DragHandleIcon,
  FieldError,
  MoreIcon,
  Popup,
  PopupList,
  SelectInput,
  TextInput,
  useField,
  useForm,
  useFormFields,
  XIcon,
} from "@payloadcms/ui";
import { CounterBadge } from "@/components/admin/CharacterCounter";

// A compact list editor for short arrays: one line per row — drag handle,
// one or more capped text inputs, a "Goes to" dropdown (link lists only),
// a Move up / Move down / Remove menu — and one "Add …" button that greys
// out at the cap. Used by Header/Nav's menu links (NavLinksField.tsx),
// About's quick links (AboutQuickLinksField.tsx) and a package's features
// (PackageFeaturesField.tsx).
//
// Replaces Payload's default array UI (a collapsible card per row with
// Copy/Paste/Duplicate/Add below actions and Collapse All / Show All) but
// not its data: rows are added, moved and removed through Payload's own
// form actions (addFieldRow / moveFieldRow / removeFieldRow) and each input
// is a useField on the same path the default UI would use. Undo/redo
// (EditHistory.tsx), Live Preview and Publish all read that same form
// state. A link's destination sub-field must be named `href` and be a
// select; its options come from the field config. Arrays without an `href`
// sub-field (features) get text inputs only, and no duplicate-link note. Caps are also enforced on
// save by the field config (maxRows, maxLength).

const baseClass = "nav-links";

export const textValue = (value: unknown) => (typeof value === "string" ? value : "");

// Caps the input itself so the browser stops typing/pasting past the limit.
export function useMaxLength(max: number) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.maxLength = max;
  });
  return ref;
}

export type LinkTextField = {
  name: string;
  placeholder: string;
  max: number;
};

/** One row's values: each text field by name, plus `href`. */
export type LinkRowValues = Record<string, string>;

type SortableProps = {
  attributes: React.HTMLAttributes<unknown>;
  listeners: Record<string, unknown>;
  setNodeRef: (node: HTMLElement | null) => void;
  transform: string;
  transition: string;
  isDragging?: boolean;
};

function LinkTextInput({ path, spec }: { path: string; spec: LinkTextField }) {
  const field = useField<string>({ path });
  const ref = useMaxLength(spec.max);
  const text = textValue(field.value);
  return (
    <TextInput
      className={`${baseClass}__${spec.name}`}
      path={field.path}
      value={text}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
        field.setValue(e.target.value.slice(0, spec.max))
      }
      showError={field.showError}
      placeholder={spec.placeholder}
      inputRef={ref as React.RefObject<HTMLInputElement>}
      AfterInput={<CounterBadge length={text.length} max={spec.max} />}
    />
  );
}

function LinkRow({
  path,
  index,
  count,
  textFields,
  options,
  summary,
  notes,
  moveRow,
  removeRow,
  sortable: { attributes, listeners, setNodeRef, transform, transition, isDragging },
}: {
  path: string;
  index: number;
  count: number;
  textFields: LinkTextField[];
  options: OptionObject[] | null;
  summary: string;
  notes: React.ReactNode[];
  moveRow: (from: number, to: number) => void;
  removeRow: (index: number) => void;
  sortable: SortableProps;
}) {
  const rowPath = `${path}.${index}`;
  const href = useField<string>({ path: `${rowPath}.href` });

  return (
    <li
      ref={setNodeRef}
      className={`${baseClass}__row${isDragging ? ` ${baseClass}__row--dragging` : ""}`}
      style={{ transform, transition }}
      aria-label={summary}
    >
      <div className={`${baseClass}__line`}>
        <button
          type="button"
          className={`${baseClass}__handle`}
          aria-label={`Drag to reorder: ${summary}`}
          title="Drag to reorder"
          {...attributes}
          {...listeners}
        >
          <DragHandleIcon />
        </button>
        <div className={`${baseClass}__fields`}>
          {textFields.map((spec) => (
            <LinkTextInput key={spec.name} path={`${rowPath}.${spec.name}`} spec={spec} />
          ))}
          {options && (
            <SelectInput
              className={`${baseClass}__href`}
              name="href"
              path={href.path}
              value={textValue(href.value)}
              options={options}
              isClearable={false}
              showError={href.showError}
              placeholder="Goes to…"
              onChange={(option) => {
                if (option && !Array.isArray(option)) href.setValue(option.value);
              }}
            />
          )}
        </div>
        <Popup
          button={<MoreIcon />}
          buttonClassName={`${baseClass}__menu-button`}
          className={`${baseClass}__menu`}
          horizontalAlign="right"
          size="medium"
          render={({ close }) => (
            <PopupList.ButtonGroup buttonSize="small">
              {index > 0 && (
                <PopupList.Button
                  className={`${baseClass}__action`}
                  onClick={() => {
                    moveRow(index, index - 1);
                    close();
                  }}
                >
                  <ChevronIcon direction="up" />
                  Move up
                </PopupList.Button>
              )}
              {index < count - 1 && (
                <PopupList.Button
                  className={`${baseClass}__action`}
                  onClick={() => {
                    moveRow(index, index + 1);
                    close();
                  }}
                >
                  <ChevronIcon />
                  Move down
                </PopupList.Button>
              )}
              <PopupList.Button
                className={`${baseClass}__action`}
                onClick={() => {
                  removeRow(index);
                  close();
                }}
              >
                <XIcon />
                Remove
              </PopupList.Button>
            </PopupList.ButtonGroup>
          )}
        />
      </div>
      {notes.map((note, i) => (
        <p key={i} className={`${baseClass}__note`}>
          {note}
        </p>
      ))}
    </li>
  );
}

export type LinkRowsEditorProps = {
  fieldProps: ArrayFieldClientProps;
  title: string;
  intro: string;
  textFields: LinkTextField[];
  maxRows: number;
  /** Shown beside the greyed-out "Add …" button at the cap. */
  capHint: string;
  /** The add button's text. Defaults to "Add link". */
  addLabel?: string;
  /** Screen-reader name for a row, e.g. "Portfolio → Portfolio (homepage section)". */
  summarize: (row: LinkRowValues, destinationLabel: string | undefined) => string;
  /** Gentle per-row notes (duplicates, empty pages…), beyond the built-in duplicate note. */
  rowNotes?: (row: LinkRowValues, index: number) => React.ReactNode[];
  /** Extra class on the wrapper, for layouts with more inputs per row. */
  className?: string;
  /** Rendered after the Add button (e.g. a crowding warning). */
  afterAdd?: (rows: LinkRowValues[]) => React.ReactNode;
  children?: React.ReactNode;
};

export default function LinkRowsEditor({
  fieldProps,
  title,
  intro,
  textFields,
  maxRows,
  capHint,
  addLabel = "Add link",
  summarize,
  rowNotes,
  className,
  afterAdd,
  children,
}: LinkRowsEditorProps) {
  const { field } = fieldProps;
  const path = fieldProps.path ?? field.name;
  const schemaPath = fieldProps.schemaPath ?? field.name;

  const { rows = [], showError } = useField({ path, hasRows: true });
  const { addFieldRow, moveFieldRow, removeFieldRow } = useForm();

  const hrefField = field.fields.find((f) => "name" in f && f.name === "href");
  const options = useMemo(
    () =>
      hrefField && "options" in hrefField
        ? (hrefField.options.map((option) =>
            typeof option === "string" ? { label: option, value: option } : option,
          ) as OptionObject[])
        : null,
    [hrefField],
  );

  const names = useMemo(
    () => [...textFields.map((f) => f.name), ...(options ? ["href"] : [])],
    [textFields, options],
  );

  // Every row's values, for summaries and notes. Joined into one string so
  // the selector's result only changes when one of them does.
  const serialized = useFormFields(([fields]) =>
    JSON.stringify(
      rows.map((_, i) =>
        Object.fromEntries(names.map((name) => [name, textValue(fields[`${path}.${i}.${name}`]?.value)])),
      ),
    ),
  );
  const values = useMemo(() => JSON.parse(serialized) as LinkRowValues[], [serialized]);
  const firstText = textFields[0]?.name ?? "label";

  const atCap = rows.length >= maxRows;

  const addRow = useCallback(() => {
    const rowIndex = rows.length;
    const empty = { value: "", initialValue: "", valid: true, passesCondition: true };
    const subFieldState: Record<string, typeof empty> = Object.fromEntries(
      textFields.map((f) => [f.name, { ...empty }]),
    );
    if (options) {
      const used = new Set(values.map((row) => row.href));
      const destination = String((options.find((o) => !used.has(o.value)) ?? options[0])?.value ?? "");
      subFieldState.href = { value: destination, initialValue: destination, valid: true, passesCondition: true };
    }
    addFieldRow({ path, schemaPath, rowIndex, subFieldState });
    setTimeout(() => {
      document.getElementById(`field-${path}__${rowIndex}__${firstText}`)?.focus();
    }, 0);
  }, [addFieldRow, firstText, options, path, rows.length, schemaPath, textFields, values]);

  const moveRow = useCallback(
    (moveFromIndex: number, moveToIndex: number) =>
      moveFieldRow({ path, moveFromIndex, moveToIndex }),
    [moveFieldRow, path],
  );
  const removeRow = useCallback(
    (rowIndex: number) => removeFieldRow({ path, rowIndex }),
    [path, removeFieldRow],
  );

  return (
    <div className={`field-type ${baseClass}${className ? ` ${className}` : ""}`} id={`field-${path}`}>
      <h3 className={`${baseClass}__title`}>{title}</h3>
      <p className={`${baseClass}__intro`}>{intro}</p>
      {showError && <FieldError path={path} showError />}

      <DraggableSortable
        className={`${baseClass}__list`}
        ids={rows.map((row) => row.id)}
        onDragEnd={({ moveFromIndex, moveToIndex }) => moveRow(moveFromIndex, moveToIndex)}
      >
        <ol className={`${baseClass}__rows`}>
          {rows.map((row, i) => {
            const rowValues = values[i] ?? {};
            const optionLabel = options?.find((o) => o.value === rowValues.href)?.label;
            const destination = typeof optionLabel === "string" ? optionLabel : undefined;
            const other = options && rowValues.href
              ? values.findIndex((r, j) => j !== i && r.href === rowValues.href)
              : -1;
            const notes: React.ReactNode[] = [];
            if (other !== -1) {
              const name = values[other][firstText]?.trim();
              notes.push(
                `“${name || "Another link"}” also goes here — fine if intended, but visitors will see two links to the same place.`,
              );
            }
            if (rowNotes) notes.push(...rowNotes(rowValues, i));
            return (
              <DraggableSortableItem key={row.id} id={row.id}>
                {(sortable) => (
                  <LinkRow
                    path={path}
                    index={i}
                    count={rows.length}
                    textFields={textFields}
                    options={options}
                    summary={summarize(rowValues, destination)}
                    notes={notes}
                    moveRow={moveRow}
                    removeRow={removeRow}
                    sortable={sortable as SortableProps}
                  />
                )}
              </DraggableSortableItem>
            );
          })}
        </ol>
      </DraggableSortable>

      <div className={`${baseClass}__add`}>
        <Button
          buttonStyle="secondary"
          size="small"
          icon="plus"
          iconPosition="left"
          onClick={addRow}
          disabled={atCap}
        >
          {addLabel}
        </Button>
        {atCap && <span className={`${baseClass}__hint`}>{capHint}</span>}
      </div>
      {afterAdd?.(values)}
      {children}
    </div>
  );
}
