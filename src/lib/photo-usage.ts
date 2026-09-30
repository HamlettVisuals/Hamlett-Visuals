import type { FlattenedField, PayloadRequest, Where } from "payload";
import { comparePhotos } from "#src/lib/manual-order.ts";
import { SAMPLE_PHOTOS } from "#src/lib/package-limits.ts";

// Where a photo is used, in plain words. One answer for the whole studio:
// the album page's "Delete photo…" warning (Photos' GET /:id/usage), the
// Trash's "Delete permanently" warning, and the Unused photos section on
// Categories & Albums (a photo in no album and used nowhere).
//
// Found by walking the Payload config rather than a hand-kept list, so a
// photo field added later is covered without touching this file: every
// upload or relationship field that can point at a photo, in any
// collection or global, inside arrays, groups, tabs and blocks, plus
// photos embedded in rich text (the About bio's editor allows uploads).
// Documents in the Trash count (restoring one would bring its photo back
// into use), and so do retired fields that are hidden but still hold a
// photo (the old hero photos, a package's old gallery, a Backstage
// thumbnail): when unsure, a photo counts as used. History versions don't
// count; otherwise nothing could ever be unused. Payload's own bookkeeping
// collections (payload-*) and Photos itself are skipped.
//
// A package's sample photos (the first few photos of its album) are an
// album-photo use; only the single-photo check adds them.
//
// Part of payload.config.ts's module graph (Photos.ts imports it), so no
// "@/…" imports.

type PhotoField = { path: string[]; kind: "ref" | "richText"; label: string };
type Entity = { kind: "collection" | "global"; slug: string; label: string; titleField?: string; trash: boolean; fields: PhotoField[] };
type Doc = Record<string, unknown> & { id?: number | string; deletedAt?: string | null };

const PHOTOS = "photos";

const labelOf = (value: unknown, fallback: string): string =>
  typeof value === "string" ? value : value && typeof value === "object" && "en" in value ? String((value as { en: unknown }).en) : fallback;

const pointsAtPhotos = (field: FlattenedField) =>
  (field.type === "upload" || field.type === "relationship") &&
  (Array.isArray(field.relationTo) ? field.relationTo.includes(PHOTOS) : field.relationTo === PHOTOS);

function photoFields(fields: FlattenedField[], path: string[] = [], labels: string[] = []): PhotoField[] {
  const found: PhotoField[] = [];
  for (const field of fields) {
    if (!("name" in field) || !field.name) continue;
    const here = [...path, field.name];
    const label = [...labels, labelOf("label" in field ? field.label : undefined, field.name)];
    if (pointsAtPhotos(field)) found.push({ path: here, kind: "ref", label: label.join(" › ") });
    else if (field.type === "richText") found.push({ path: here, kind: "richText", label: label.join(" › ") });
    else if (field.type === "array" || field.type === "group" || field.type === "tab") {
      found.push(...photoFields(field.flattenedFields, here, label));
    } else if (field.type === "blocks") {
      for (const block of field.blocks) found.push(...photoFields(block.flattenedFields, here, label));
    }
  }
  return found;
}

function entities(req: PayloadRequest): Entity[] {
  const { config } = req.payload;
  const list: Entity[] = [];
  for (const collection of config.collections) {
    if (collection.slug === PHOTOS || collection.slug.startsWith("payload-")) continue;
    const fields = photoFields(collection.flattenedFields);
    if (!fields.length) continue;
    list.push({
      kind: "collection",
      slug: collection.slug,
      label: labelOf(collection.labels?.singular, collection.slug),
      titleField: collection.admin?.useAsTitle,
      trash: Boolean(collection.trash),
      fields,
    });
  }
  for (const global of config.globals) {
    const fields = photoFields(global.flattenedFields);
    if (fields.length) list.push({ kind: "global", slug: global.slug, label: labelOf(global.label, global.slug), trash: false, fields });
  }
  return list;
}

// Every photo id a value holds at `path` (arrays and blocks fan out; a
// relationship can be an id, a populated doc or { relationTo, value }).
function idsAt(value: unknown, path: string[]): number[] {
  if (value == null) return [];
  if (Array.isArray(value)) return value.flatMap((item) => idsAt(item, path));
  if (!path.length) {
    if (typeof value === "number") return [value];
    if (typeof value === "object") {
      const v = value as { relationTo?: string; value?: unknown; id?: unknown };
      if (v.relationTo !== undefined) return v.relationTo === PHOTOS ? idsAt(v.value, []) : [];
      if (typeof v.id === "number") return [v.id];
    }
    return [];
  }
  return typeof value === "object" ? idsAt((value as Record<string, unknown>)[path[0]], path.slice(1)) : [];
}

// Photos embedded in rich text: upload and relationship nodes pointing at
// the Photos collection.
function idsInRichText(value: unknown): number[] {
  const ids: number[] = [];
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk);
    if (!node || typeof node !== "object") return;
    const n = node as Record<string, unknown>;
    if (n.relationTo === PHOTOS) ids.push(...idsAt(n.value, []));
    Object.values(n).forEach(walk);
  };
  walk(value);
  return ids;
}

// How one use reads to her. Known fields get their own words; anything
// else says where it is ("Package "Signature": Photos").
function describe(entity: Entity, field: PhotoField, doc: Doc, count: number): string {
  const title = entity.titleField ? doc[entity.titleField] : undefined;
  const name = typeof title === "string" && title ? title : `#${doc.id}`;
  const trashed = doc.deletedAt ? " (in the Trash)" : "";
  const key = `${entity.slug}.${field.path.join(".")}`;
  const known: Record<string, string> = {
    "categories.coverPhoto": `the cover of the "${name}" category${trashed}`,
    "categories.heroPhoto": `the top of the "${name}" category page${trashed}`,
    "testimonials.photo": `the testimonial from ${name}${trashed}`,
    "hero.slides.photo": count > 1 ? `${count} homepage hero slides` : "a homepage hero slide",
    "hero.slides.mobilePhoto": count > 1 ? `${count} hero slides' phone images` : "a hero slide's phone image",
    "hero.heroPhotos": "the old hero photos list (hidden, no longer shown)",
    "about.portrait": "your About photo",
    "about.bio": "a photo inside your About text",
    "site-settings.favicon": "your site's tab icon",
    "site-settings.ogImage": "your site's share image",
    "backstage.thumbnail": `an old thumbnail on the Backstage item "${name}" (hidden)${trashed}`,
    "pricing-rows.gallery": `the "${name}" package's old photo list (hidden)${trashed}`,
  };
  if (known[key]) return known[key];
  return entity.kind === "global" ? `${entity.label}: ${field.label}` : `${entity.label} "${name}": ${field.label}${trashed}`;
}

/** Every photo that's used somewhere, with where, in plain words. */
export async function collectPhotoUses(req: PayloadRequest): Promise<Map<number, string[]>> {
  const uses = new Map<number, string[]>();
  const add = (id: number, text: string) => {
    const list = uses.get(id) ?? [];
    if (!list.includes(text)) list.push(text);
    uses.set(id, list);
  };

  await Promise.all(
    entities(req).map(async (entity) => {
      const docs: Doc[] =
        entity.kind === "global"
          ? [(await req.payload.findGlobal({ slug: entity.slug as never, depth: 0, req })) as Doc]
          : ((
              await req.payload.find({
                collection: entity.slug as never,
                depth: 0,
                pagination: false,
                ...(entity.trash ? { trash: true } : {}),
                req,
              })
            ).docs as Doc[]);
      for (const doc of docs) {
        for (const field of entity.fields) {
          const ids = field.kind === "richText" ? idsInRichText(idsAtRaw(doc, field.path)) : idsAt(doc, field.path);
          const counts = new Map<number, number>();
          for (const id of ids) counts.set(id, (counts.get(id) ?? 0) + 1);
          for (const [id, count] of counts) add(id, describe(entity, field, doc, count));
        }
      }
    }),
  );
  return uses;
}

// The raw value at a path (for rich text, whose content is walked separately).
function idsAtRaw(doc: Doc, path: string[]): unknown {
  return path.reduce<unknown>((value, key) => (value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined), doc);
}

/** Where one photo is used, including as a package's sample photo. */
export async function findPhotoUsage(req: PayloadRequest, photoId: number): Promise<string[]> {
  const [uses, photo] = await Promise.all([
    collectPhotoUses(req),
    req.payload.findByID({ collection: "photos", id: photoId, depth: 0, select: { event: true }, disableErrors: true, trash: true, req }),
  ]);
  const found = [...(uses.get(photoId) ?? [])];

  // A package's samples are its album's first photos, in her order.
  const albumId = photo?.event && typeof photo.event === "object" ? photo.event.id : photo?.event;
  if (albumId != null) {
    const [packages, albumPhotos] = await Promise.all([
      req.payload.find({ collection: "pricing-rows", where: { album: { equals: albumId } }, select: { title: true }, depth: 0, pagination: false, req }),
      req.payload.find({
        collection: "photos",
        where: { event: { equals: albumId } },
        select: { url: true, albumOrder: true, createdAt: true },
        depth: 0,
        pagination: false,
        req,
      }),
    ]);
    const samples = albumPhotos.docs.filter((doc) => doc.url).toSorted(comparePhotos).slice(0, SAMPLE_PHOTOS);
    if (samples.some((doc) => doc.id === photoId)) {
      for (const pkg of packages.docs) found.push(`a sample photo for the "${pkg.title}" package`);
    }
  }
  return found;
}

export type UnusedPhoto = {
  id: number;
  alt: string | null;
  filename: string | null;
  caption: string | null;
  thumbnail: string | null;
  createdAt: string;
};

/**
 * Photos in no album, not in the Trash, and used nowhere (see above). `ids`
 * narrows the check to those photos (the trash endpoint re-checks what she
 * picked).
 */
export async function findUnusedPhotos(req: PayloadRequest, ids?: number[]): Promise<UnusedPhoto[]> {
  const where: Where = { event: { exists: false } };
  const [uses, loose] = await Promise.all([
    collectPhotoUses(req),
    req.payload.find({
      collection: "photos",
      where: ids ? { and: [where, { id: { in: ids } }] } : where,
      // The storage plugin builds urls from the file name, its folder and
      // the size's own file name, so those are selected too.
      select: { alt: true, filename: true, prefix: true, caption: true, url: true, sizes: { thumbnail: true }, createdAt: true },
      depth: 0,
      pagination: false,
      req,
    }),
  ]);
  return loose.docs
    .filter((photo) => !uses.has(photo.id))
    .map((photo) => ({
      id: photo.id,
      alt: photo.alt ?? null,
      filename: photo.filename ?? null,
      caption: photo.caption ?? null,
      thumbnail: photo.sizes?.thumbnail?.url || photo.url || null,
      createdAt: photo.createdAt,
    }));
}
