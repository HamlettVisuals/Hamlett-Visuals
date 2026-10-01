import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "featured_offer" ADD COLUMN "show_on_homepage" boolean DEFAULT true;
  ALTER TABLE "_featured_offer_v" ADD COLUMN "version_show_on_homepage" boolean DEFAULT true;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "featured_offer" DROP COLUMN "show_on_homepage";
  ALTER TABLE "_featured_offer_v" DROP COLUMN "version_show_on_homepage";`)
}
