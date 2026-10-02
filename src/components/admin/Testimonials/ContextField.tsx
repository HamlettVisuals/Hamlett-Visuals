"use client";

import { useEffect, useState } from "react";
import type { TextFieldClientComponent } from "payload";
import { TextField, useConfig, useFormFields } from "@payloadcms/ui";
import { formatAlbumDate } from "@/lib/album-date";
import { getJSON, idOf } from "./api";

// The Context line, with what the site shows when it's left empty as its
// placeholder: the category and the album's month ("Weddings · October
// 2026"), or just the category (same rule as /testimonials).
const ContextField: TextFieldClientComponent = (props) => {
  const { config } = useConfig();
  const categoryId = idOf(useFormFields(([fields]) => fields.category?.value));
  const eventId = idOf(useFormFields(([fields]) => fields.event?.value));
  const [placeholder, setPlaceholder] = useState("");
  const apiBase = `${config.serverURL ?? ""}${config.routes.api}`;

  useEffect(() => {
    let cancelled = false;
    void Promise.all([
      categoryId != null ? getJSON<{ name?: string }>(`${apiBase}/categories/${categoryId}?depth=0&trash=true`) : null,
      eventId != null ? getJSON<{ date?: string | null }>(`${apiBase}/events/${eventId}?depth=0&trash=true`) : null,
    ]).then(([category, event]) => {
      if (cancelled) return;
      const date = formatAlbumDate(event?.date);
      const name = category?.name ?? "";
      setPlaceholder(name ? (date ? `${name} · ${date}` : name) : "");
    });
    return () => {
      cancelled = true;
    };
  }, [apiBase, categoryId, eventId]);

  return <TextField {...props} field={{ ...props.field, admin: { ...props.field.admin, placeholder } }} />;
};

export default ContextField;
