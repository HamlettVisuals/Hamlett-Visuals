import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" ADD COLUMN "footer_logo_height" numeric DEFAULT 56;
  ALTER TABLE "_site_settings_v" ADD COLUMN "version_footer_logo_height" numeric DEFAULT 56;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "site_settings" DROP COLUMN "footer_logo_height";
  ALTER TABLE "_site_settings_v" DROP COLUMN "version_footer_logo_height";`)
}
