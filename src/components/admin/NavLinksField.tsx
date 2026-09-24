"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { ArrayFieldClientComponent, OptionObject } from "payload";
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
import {
  BOOK_LABEL_MAX,
  NAV_LABEL_MAX,
  NAV_MAX_LINKS,
  navLinksCrowdLogo,
} from "@/lib/nav-limits";
import { CounterBadge } from "@/components/admin/CharacterCounter";

// The Header/Nav global's link list (globals/HeaderNav.ts → navLinks), as
// one compact line per link — drag handle, label, "Goes to" dropdown, a
// Move up / Move down / Remove menu — followed by the Book button text.
//
// Replaces Payload's default array UI (a collapsible card per row with
// Copy/Paste/Duplicate/Add below actions and Collapse All / Show All) but
// not its data: rows are added, moved and removed through Payload's own
// form actions (addFieldRow / moveFieldRow / removeFieldRow) and each input
// is a useField on the same path the default UI would use. Undo/redo
// (EditHistory.tsx), Live Preview and Publish all read that same form state,
// so they behave exactly as before. The limits come from lib/nav-limits.ts
// and are also enforced on save by the field config.

const baseClass = "nav-links";

const textValue = (value: unknown) => (typeof value === "string" ? value : "");

// Caps the input itself so the browser stops typing/pasting past the limit.
function useMaxLength(max: number) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.maxLength = max;
  });
  return ref;
}

type RowProps = {
  path: string;
  index: number;
  count: number;
  options: OptionObject[];
  duplicateOf: string | null;
  moveRow: (from: number, to: number) => void;
  removeRow: (index: number) => void;
  sortable: {
    attributes: React.HTMLAttributes<unknown>;
    listeners: Record<string, unknown>;
    setNodeRef: (node: HTMLElement | null) => void;
    transform: string;
    transition: string;
    isDragging?: boolean;
  };
};

function NavLinkRow({
  path,
  index,
  count,
  options,
  duplicateOf,
  moveRow,
  removeRow,
  sortable: { attributes, listeners, setNodeRef, transform, transition, isDragging },
}: RowProps) {
  const rowPath = `${path}.${index}`;
  const label = useField<string>({ path: `${rowPath}.label` });
  const href = useField<string>({ path: `${rowPath}.href` });
  const labelRef = useMaxLength(NAV_LABEL_MAX);
  const labelText = textValue(label.value);
  const destination = options.find((option) => option.value === href.value)?.label;
  const summary = `${labelText.trim() || "Untitled link"} → ${destination ?? "no destination"}`;

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
          <TextInput
            className={`${baseClass}__label`}
            path={label.path}
            value={labelText}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              label.setValue(e.target.value.slice(0, NAV_LABEL_MAX))
            }
            showError={label.showError}
            placeholder="Link text"
            inputRef={labelRef as React.RefObject<HTMLInputElement>}
            AfterInput={<CounterBadge length={labelText.length} max={NAV_LABEL_MAX} />}
          />
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
      {duplicateOf !== null && (
        <p className={`${baseClass}__note`}>
          “{duplicateOf || "Another link"}” also goes here — fine if intended, but visitors
          will see two links to the same place.
        </p>
      )}
    </li>
  );
}

const NavLinksField: ArrayFieldClientComponent = (props) => {
  const { field } = props;
  const path = props.path ?? field.name;
  const schemaPath = props.schemaPath ?? field.name;

  const { rows = [], showError } = useField({ path, hasRows: true });
  const { addFieldRow, moveFieldRow, removeFieldRow } = useForm();

  const book = useField<string>({ path: "bookLabel" });
  const bookRef = useMaxLength(BOOK_LABEL_MAX);
  const bookText = textValue(book.value);

  const hrefField = field.fields.find((f) => "name" in f && f.name === "href");
  const options = useMemo(
    () =>
      (hrefField && "options" in hrefField ? hrefField.options : []).map((option) =>
        typeof option === "string" ? { label: option, value: option } : option,
      ) as OptionObject[],
    [hrefField],
  );

  // Every row's label and destination, for the duplicate and crowding
  // warnings. Joined into one string so the selector's result only changes
  // when one of them does.
  const serialized = useFormFields(([fields]) =>
    JSON.stringify(
      rows.map((_, i) => [
        textValue(fields[`${path}.${i}.label`]?.value),
        textValue(fields[`${path}.${i}.href`]?.value),
      ]),
    ),
  );
  const links = useMemo(() => JSON.parse(serialized) as [string, string][], [serialized]);

  const atCap = rows.length >= NAV_MAX_LINKS;
  const crowded = navLinksCrowdLogo(
    links.map(([label]) => label),
    bookText,
  );

  const addRow = useCallback(() => {
    const used = new Set(links.map(([, href]) => href));
    const destination = String((options.find((o) => !used.has(o.value)) ?? options[0])?.value ?? "");
    const rowIndex = rows.length;
    addFieldRow({
      path,
      schemaPath,
      rowIndex,
      subFieldState: {
        label: { value: "", initialValue: "", valid: true, passesCondition: true },
        href: { value: destination, initialValue: destination, valid: true, passesCondition: true },
      },
    });
    setTimeout(() => {
      document.getElementById(`field-${path}__${rowIndex}__label`)?.focus();
    }, 0);
  }, [addFieldRow, links, options, path, rows.length, schemaPath]);

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
    <div className={`field-type ${baseClass}`} id={`field-${path}`}>
      <h3 className={`${baseClass}__title`}>Menu links</h3>
      <p className={`${baseClass}__intro`}>
        The links across the top of your site. Drag to reorder.
      </p>
      {showError && <FieldError path={path} showError />}

      <DraggableSortable
        className={`${baseClass}__list`}
        ids={rows.map((row) => row.id)}
        onDragEnd={({ moveFromIndex, moveToIndex }) => moveRow(moveFromIndex, moveToIndex)}
      >
        <ol className={`${baseClass}__rows`}>
          {rows.map((row, i) => {
            const href = links[i]?.[1];
            const other = href ? links.findIndex(([, h], j) => j !== i && h === href) : -1;
            return (
              <DraggableSortableItem key={row.id} id={row.id}>
                {(sortable) => (
                  <NavLinkRow
                    path={path}
                    index={i}
                    count={rows.length}
                    options={options}
                    duplicateOf={other === -1 ? null : links[other][0].trim()}
                    moveRow={moveRow}
                    removeRow={removeRow}
                    sortable={sortable as RowProps["sortable"]}
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
          Add link
        </Button>
        {atCap && (
          <span className={`${baseClass}__hint`}>
            {NAV_MAX_LINKS} links is the most the menu bar fits beside your logo. Remove one to
            add another.
          </span>
        )}
      </div>
      {crowded && (
        <p className={`${baseClass}__note`}>
          These labels are getting long for the menu bar — on a smaller laptop screen they may
          crowd your logo. Shorter labels will look cleaner.
        </p>
      )}

      <div className={`${baseClass}__book`}>
        <TextInput
          path="bookLabel"
          label="Book button text"
          value={bookText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => book.setValue(e.target.value.slice(0, BOOK_LABEL_MAX))}
          showError={book.showError}
          inputRef={bookRef as React.RefObject<HTMLInputElement>}
          AfterInput={<CounterBadge length={bookText.length} max={BOOK_LABEL_MAX} />}
        />
        <p className={`${baseClass}__intro`}>
          The button at the right end of the menu bar. It always opens the booking page.
        </p>
      </div>
    </div>
  );
};

export default NavLinksField;
