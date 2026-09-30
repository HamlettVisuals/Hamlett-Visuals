// lib/photo-usage.ts against a stand-in config: the config walk (arrays,
// groups, blocks, rich text, trashed documents) finds every photo, ignores
// other collections' uploads, and skips Payload's own collections and
// Photos itself. No browser, no database, no sign-in needed.
const { collectPhotoUses } = await import(new URL("../../src/lib/photo-usage.ts", import.meta.url).href);
const bio = { root: { children: [
  { type: "paragraph", children: [{ type: "text", text: "hi" }] },
  { type: "upload", relationTo: "photos", value: 101 },
  { type: "upload", relationTo: "logos", value: 999 },
  { type: "relationship", relationTo: "photos", value: { id: 102 } },
] } };
const req = {
  payload: {
    config: {
      collections: [
        { slug: "photos", flattenedFields: [{ name: "x", type: "upload", relationTo: "photos" }] },
        { slug: "payload-locked-documents", flattenedFields: [{ name: "document", type: "relationship", relationTo: ["photos"] }] },
        { slug: "things", labels: { singular: "Thing" }, admin: { useAsTitle: "title" }, trash: true, flattenedFields: [
          { name: "title", type: "text" },
          { name: "rows", type: "array", label: "Rows", flattenedFields: [{ name: "pic", type: "upload", relationTo: "photos", label: "Pic" }] },
          { name: "meta", type: "group", flattenedFields: [{ name: "any", type: "relationship", relationTo: ["photos", "logos"] }] },
          { name: "layout", type: "blocks", blocks: [{ slug: "b", flattenedFields: [{ name: "img", type: "upload", relationTo: "photos" }] }] },
        ] },
      ],
      globals: [{ slug: "about", label: "About", flattenedFields: [{ name: "bio", type: "richText" }, { name: "portrait", type: "upload", relationTo: "photos" }] }],
    },
    findGlobal: async () => ({ bio, portrait: 103 }),
    find: async ({ collection, trash }: { collection: string; trash?: boolean }) => {
      if (collection !== "things") throw new Error("queried " + collection);
      if (!trash) throw new Error("trash not included");
      return { docs: [{ id: 1, title: "One", deletedAt: "2026-09-30", rows: [{ pic: 104 }, { pic: 105 }], meta: { any: { relationTo: "photos", value: 106 } }, layout: [{ blockType: "b", img: 107 }] },
                      { id: 2, title: "Two", meta: { any: { relationTo: "logos", value: 108 } } }] };
    },
  },
};
const uses = await collectPhotoUses(req as never);
console.log([...uses.entries()].sort((a, b) => a[0] - b[0]).map(([id, u]) => `${id}: ${u.join("; ")}`).join("\n"));
const want = [101, 102, 103, 104, 105, 106, 107];
const got = [...uses.keys()].sort((a, b) => a - b);
const ok = JSON.stringify(got) === JSON.stringify(want);
console.log(ok ? "PASS  all photo references found, logos ignored" : `FAIL  got ${got}, want ${want}`);
process.exit(ok ? 0 : 1);
