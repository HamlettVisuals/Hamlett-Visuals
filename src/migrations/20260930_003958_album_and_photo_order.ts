import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'
import { generateNKeysBetween } from 'payload/shared'

// Manual order for albums (within their category) and photos (within their
// album). Additive only: two nullable text columns (plus their History-table
// copies) and indexes; nothing existing is changed or removed. The backfill
// gives every existing album and photo a key in the order the site shows
// today, so nothing visibly moves:
//   - albums: per category, newest first (sort_date desc, created_at desc),
//     the category page's current sort. Trashed albums get keys too, so a
//     restore puts them back where they were.
//   - photos: per album, oldest first (created_at), the category page's
//     current photo order. Photos in no album keep an empty order.
// History rows (_events_v, _photos_v) are left empty.
type Row = { id: number; parent: number | null }

// One fractional-index key per row, restarting for each parent (category or
// album), in the order the rows arrive.
function keysByParent(rows: Row[]): { id: number; key: string }[] {
  const groups = new Map<number | null, number[]>()
  for (const row of rows) {
    const ids = groups.get(row.parent) ?? []
    ids.push(row.id)
    groups.set(row.parent, ids)
  }
  return [...groups.values()].flatMap((ids) => {
    const keys = generateNKeysBetween(null, null, ids.length)
    return ids.map((id, index) => ({ id, key: keys[index] }))
  })
}

export async function up({ db }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "events" ADD COLUMN "album_order" varchar;
  ALTER TABLE "_events_v" ADD COLUMN "version_album_order" varchar;
  ALTER TABLE "photos" ADD COLUMN "album_order" varchar;
  ALTER TABLE "_photos_v" ADD COLUMN "version_album_order" varchar;
  CREATE INDEX "events_album_order_idx" ON "events" USING btree ("album_order");
  CREATE INDEX "_events_v_version_version_album_order_idx" ON "_events_v" USING btree ("version_album_order");
  CREATE INDEX "photos_album_order_idx" ON "photos" USING btree ("album_order");
  CREATE INDEX "_photos_v_version_version_album_order_idx" ON "_photos_v" USING btree ("version_album_order");`)

  const albums = await db.execute(sql`
    SELECT "id", "category_id" AS "parent" FROM "events"
    ORDER BY "category_id", "sort_date" DESC, "created_at" DESC, "id" DESC;`)
  for (const { id, key } of keysByParent(albums.rows as Row[])) {
    await db.execute(sql`UPDATE "events" SET "album_order" = ${key} WHERE "id" = ${id};`)
  }

  const photos = await db.execute(sql`
    SELECT "id", "event_id" AS "parent" FROM "photos"
    WHERE "event_id" IS NOT NULL
    ORDER BY "event_id", "created_at", "id";`)
  for (const { id, key } of keysByParent(photos.rows as Row[])) {
    await db.execute(sql`UPDATE "photos" SET "album_order" = ${key} WHERE "id" = ${id};`)
  }
}

export async function down({ db }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP INDEX "events_album_order_idx";
  DROP INDEX "_events_v_version_version_album_order_idx";
  DROP INDEX "photos_album_order_idx";
  DROP INDEX "_photos_v_version_version_album_order_idx";
  ALTER TABLE "events" DROP COLUMN "album_order";
  ALTER TABLE "_events_v" DROP COLUMN "version_album_order";
  ALTER TABLE "photos" DROP COLUMN "album_order";
  ALTER TABLE "_photos_v" DROP COLUMN "version_album_order";`)
}
