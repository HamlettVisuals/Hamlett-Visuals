"use client";

import { useEffect, useRef, useState } from "react";
import type { RelationshipFieldClientComponent } from "payload";
import { RelationshipField, useConfig, useField, useFormFields } from "@payloadcms/ui";
import { getJSON, idOf } from "./api";

// The testimonial's category. With an album picked it follows the album:
// picking or changing the album fills it in, and it's locked while an
// album is set. With no album she chooses it. The server refuses a
// mismatch from anywhere (Testimonials.ts validateCategory). One saved
// before this rule, with the category and album disagreeing, isn't changed
// on opening: a note says so, with a button to take the album's category.

type EventDoc = { category?: { id: number; name: string } | number | null };

const CategoryField: RelationshipFieldClientComponent = (props) => {
  const { path } = props;
  const { config } = useConfig();
  const { value, setValue } = useField<number | null>({ path });
  const eventId = idOf(useFormFields(([fields]) => fields.event?.value));
  // The album's category, with the album it was loaded for.
  const [loaded, setLoaded] = useState<{ for: number; category: { id: number; name: string } | null } | null>(null);
  const albumCategory = eventId != null && loaded?.for === eventId ? loaded.category : null;
  const loadedEvent = useRef<number | null | undefined>(undefined);
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    // Only a real change of album, not the first load (or React running
    // the effect twice in development), sets the category.
    const previous = loadedEvent.current;
    loadedEvent.current = eventId;
    const changed = previous !== undefined && previous !== eventId;
    if (eventId == null) return;
    let cancelled = false;
    void getJSON<EventDoc>(`${apiBase}/events/${eventId}?depth=1&trash=true`).then((event) => {
      if (cancelled) return;
      const category = event?.category && typeof event.category === "object" ? event.category : null;
      setLoaded({ for: eventId, category: category ? { id: category.id, name: category.name } : null });
      if (changed && category) setValue(category.id);
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase, eventId, setValue]);

  const mismatch = albumCategory != null && idOf(value) !== albumCategory.id;
  const description =
    eventId != null
      ? `Set by the album${albumCategory ? ` (${albumCategory.name})` : ""}. Remove the album to choose the category yourself.`
      : props.field.admin?.description;

  return (
    <div className="testimonial-category">
      <RelationshipField
        {...props}
        readOnly={props.readOnly || eventId != null}
        field={{ ...props.field, admin: { ...props.field.admin, description } }}
      />
      {mismatch && albumCategory && (
        <div className="field-warning" role="status">
          This album is in {albumCategory.name}, but the category here is different, so this can&apos;t be saved until
          they match.{" "}
          <button type="button" className="field-warning__action" onClick={() => setValue(albumCategory.id)}>
            Use {albumCategory.name}
          </button>
        </div>
      )}
    </div>
  );
};

export default CategoryField;
