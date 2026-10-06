import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_preferred_time" AS ENUM('morning', 'afternoon', 'evening');
  ALTER TABLE "inquiries" ALTER COLUMN "message" DROP NOT NULL;
  ALTER TABLE "inquiries" ADD COLUMN "preferred_time" "enum_inquiries_preferred_time";
  ALTER TABLE "inquiries" ADD COLUMN "instagram_handle" varchar;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "inquiries" ALTER COLUMN "message" SET NOT NULL;
  ALTER TABLE "inquiries" DROP COLUMN "preferred_time";
  ALTER TABLE "inquiries" DROP COLUMN "instagram_handle";
  DROP TYPE "public"."enum_inquiries_preferred_time";`)
}
