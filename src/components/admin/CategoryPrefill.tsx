"use client";

import { useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useDocumentInfo, useForm, useFormFields } from "@payloadcms/ui";

// A new album opened from a category's "+ Add album" link on the Albums
// list (AlbumsGroupedList.tsx) arrives as /create?category=<id>. This sets
// the Category field from that, once, on new albums only. It's set as the
// field's starting value too, so the form isn't marked as changed: leaving
// without saving doesn't ask about unsaved changes. The field's own
// filterOptions still apply when it's saved. Rendered as a `ui` field
// (collections/Events.ts), since only fields sit inside the edit form; it
// shows nothing.
export default function CategoryPrefill() {
  const { id } = useDocumentInfo();
  const { dispatchFields } = useForm();
  const current = useFormFields(([fields]) => fields.category?.value);
  const searchParams = useSearchParams();
  const done = useRef(false);

  const raw = searchParams?.get("category") ?? "";
  const categoryId = /^\d+$/.test(raw) ? Number(raw) : null;

  useEffect(() => {
    if (done.current || id || categoryId === null || current) return;
    // Deferred past the mount: the edit form loads its initial state in its
    // own mount effect, which runs after this one and would replace the
    // value.
    const timer = window.setTimeout(() => {
      done.current = true;
      dispatchFields({ type: "UPDATE", path: "category", value: categoryId, initialValue: categoryId });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [id, categoryId, current, dispatchFields]);

  return null;
}
