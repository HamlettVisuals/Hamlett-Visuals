import type { FieldHook } from "payload";

function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Auto-fills a slug field from another field on the same document (e.g. a
// Category's `name`) the first time it's saved, then leaves it alone —
// so an existing page's web address never silently changes if she edits
// the title later. Pairs with admin.readOnly on the slug field itself:
// she sees the generated address but can't hand-edit it into something
// that breaks a link.
export function formatSlug(fallbackField: string): FieldHook {
  return ({ value, originalDoc, data }) => {
    if (typeof value === "string" && value.length > 0) return value;

    const source = data?.[fallbackField] ?? originalDoc?.[fallbackField];
    if (typeof source === "string" && source.length > 0) {
      return slugify(source);
    }

    return value;
  };
}
