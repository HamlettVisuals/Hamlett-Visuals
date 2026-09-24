"use client";

import type { ArrayFieldClientComponent } from "payload";
import { TextInput, useField } from "@payloadcms/ui";
import {
  BOOK_LABEL_MAX,
  NAV_LABEL_MAX,
  NAV_MAX_LINKS,
  navLinksCrowdLogo,
} from "@/lib/nav-limits";
import { CounterBadge } from "@/components/admin/CharacterCounter";
import LinkRowsEditor, { textValue, useMaxLength } from "@/components/admin/LinkRowsEditor";

// The Header/Nav global's link list (globals/HeaderNav.ts → navLinks), as
// one compact line per link (the shared LinkRowsEditor: drag handle, label,
// "Goes to" dropdown, a Move up / Move down / Remove menu), followed by the
// Book button text. The limits come from lib/nav-limits.ts and are also
// enforced on save by the field config.

const TEXT_FIELDS = [{ name: "label", placeholder: "Link text", max: NAV_LABEL_MAX }];

const NavLinksField: ArrayFieldClientComponent = (props) => {
  const book = useField<string>({ path: "bookLabel" });
  const bookRef = useMaxLength(BOOK_LABEL_MAX);
  const bookText = textValue(book.value);

  return (
    <LinkRowsEditor
      fieldProps={props}
      title="Menu links"
      intro="The links across the top of your site. Drag to reorder."
      textFields={TEXT_FIELDS}
      maxRows={NAV_MAX_LINKS}
      capHint={`${NAV_MAX_LINKS} links is the most the menu bar fits beside your logo. Remove one to add another.`}
      summarize={(row, destination) =>
        `${row.label?.trim() || "Untitled link"} → ${destination ?? "no destination"}`
      }
      afterAdd={(rows) =>
        navLinksCrowdLogo(
          rows.map((row) => row.label ?? ""),
          bookText,
        ) && (
          <p className="nav-links__note">
            These labels are getting long for the menu bar — on a smaller laptop screen they may
            crowd your logo. Shorter labels will look cleaner.
          </p>
        )
      }
    >
      <div className="nav-links__book">
        <TextInput
          path="bookLabel"
          label="Book button text"
          value={bookText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            book.setValue(e.target.value.slice(0, BOOK_LABEL_MAX))
          }
          showError={book.showError}
          inputRef={bookRef as React.RefObject<HTMLInputElement>}
          AfterInput={<CounterBadge length={bookText.length} max={BOOK_LABEL_MAX} />}
        />
        <p className="nav-links__intro">
          The button at the right end of the menu bar. It always opens the booking page.
        </p>
      </div>
    </LinkRowsEditor>
  );
};

export default NavLinksField;
