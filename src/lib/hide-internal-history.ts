import type { CollectionConfig, Field, GlobalConfig } from "payload";

// Keeps internal fields out of History's comparison view: any field that's
// hidden in the editor (admin.hidden: slugs, locked links, sort keys,
// tokens) gets components/admin/HiddenDiff.tsx as its Diff, which renders
// nothing. A hidden field that she does edit through another field's
// custom input (Header/Nav's Book button text) opts back in with
// `custom: { showInHistory: true }`. Fields that already have their own
// Diff are left alone. Applied to every collection and global in
// payload.config.ts, next to addCharacterCounters.
//
// Payload's own system fields (`_order` from `orderable: true` on
// Categories, the createdAt / updatedAt timestamps and the Trash's
// deletedAt) are created after this runs, during Payload's own config
// sanitizing, so they can't be reached here; admin-overrides.css hides
// their History rows by path.
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.

const HIDDEN_DIFF = "/components/admin/HiddenDiff#default";

type AdminWithDiff = { hidden?: boolean; components?: { Diff?: unknown } };

function withHiddenDiffs(fields: Field[]): Field[] {
  return fields.map((field) => {
    const admin = field.admin as AdminWithDiff | undefined;
    if ("name" in field && admin?.hidden && !field.custom?.showInHistory && !admin.components?.Diff) {
      return {
        ...field,
        admin: { ...admin, components: { ...admin.components, Diff: HIDDEN_DIFF } },
      } as Field;
    }
    if ("fields" in field && Array.isArray(field.fields)) {
      return { ...field, fields: withHiddenDiffs(field.fields) } as Field;
    }
    if (field.type === "tabs") {
      return {
        ...field,
        tabs: field.tabs.map((tab) => ({ ...tab, fields: withHiddenDiffs(tab.fields) })),
      };
    }
    if (field.type === "blocks" && field.blocks) {
      return {
        ...field,
        blocks: field.blocks.map((block) => ({ ...block, fields: withHiddenDiffs(block.fields) })),
      };
    }
    return field;
  });
}

export function hideInternalFieldsFromHistory<T extends CollectionConfig | GlobalConfig>(configs: T[]): T[] {
  return configs.map((config) => ({ ...config, fields: withHiddenDiffs(config.fields) }));
}
