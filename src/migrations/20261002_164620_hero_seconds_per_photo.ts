import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hero" ADD COLUMN "seconds_per_photo" numeric DEFAULT 4.5 NOT NULL;
  ALTER TABLE "_hero_v" ADD COLUMN "version_seconds_per_photo" numeric DEFAULT 4.5 NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "hero" DROP COLUMN "seconds_per_photo";
  ALTER TABLE "_hero_v" DROP COLUMN "version_seconds_per_photo";`)
}
