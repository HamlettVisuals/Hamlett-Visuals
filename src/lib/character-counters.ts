import type { CollectionConfig, Field, GlobalConfig } from "payload";

// Gives every character-capped text/textarea field the live counter from
// components/admin/CharacterCounter.tsx — applied to all collections and
// globals in payload.config.ts, so setting `maxLength` on a field is all it
// takes. Walks into arrays, groups, rows, collapsibles, tabs and blocks.
// Hidden fields and ones that already have an afterInput are left alone.
// (Header/Nav's link labels and Book button text are drawn by
// NavLinksField's own inputs, which use the same <CounterBadge>.)
//
// Part of payload.config.ts's module graph, so it keeps to "#src/"-style
// imports only (here: none) — see the note at the top of that file.

const COUNTER = "/components/admin/CharacterCounter#default";

function withCounters(fields: Field[]): Field[] {
  return fields.map((field) => {
    if ((field.type === "text" || field.type === "textarea") && field.maxLength) {
      if (field.type === "text" && field.hasMany) return field;
      if (field.admin?.hidden || field.admin?.components?.afterInput) return field;
      return {
        ...field,
        admin: {
          ...field.admin,
          components: { ...field.admin?.components, afterInput: [COUNTER] },
        },
      } as Field;
    }
    if ("fields" in field && Array.isArray(field.fields)) {
      return { ...field, fields: withCounters(field.fields) } as Field;
    }
    if (field.type === "tabs") {
      return {
        ...field,
        tabs: field.tabs.map((tab) => ({ ...tab, fields: withCounters(tab.fields) })),
      };
    }
    if (field.type === "blocks" && field.blocks) {
      return {
        ...field,
        blocks: field.blocks.map((block) => ({ ...block, fields: withCounters(block.fields) })),
      };
    }
    return field;
  });
}

export function addCharacterCounters<T extends CollectionConfig | GlobalConfig>(configs: T[]): T[] {
  return configs.map((config) => ({ ...config, fields: withCounters(config.fields) }));
}
