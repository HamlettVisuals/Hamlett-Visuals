import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "booking" ADD COLUMN "how_it_works_heading" varchar DEFAULT 'How it works' NOT NULL;
  ALTER TABLE "booking" ADD COLUMN "date_help_text" varchar DEFAULT 'Just a starting point — she’ll confirm actual availability when she follows up.' NOT NULL;
  ALTER TABLE "booking" ADD COLUMN "submit_label" varchar DEFAULT 'Send your request' NOT NULL;
  ALTER TABLE "booking" ADD COLUMN "confirmation_heading" varchar DEFAULT 'Thanks, {name}.' NOT NULL;
  ALTER TABLE "booking" ADD COLUMN "confirmation_message" varchar DEFAULT 'Your request has been sent. She reads every one herself and usually replies within a day or two.' NOT NULL;
  ALTER TABLE "_booking_v" ADD COLUMN "version_how_it_works_heading" varchar DEFAULT 'How it works' NOT NULL;
  ALTER TABLE "_booking_v" ADD COLUMN "version_date_help_text" varchar DEFAULT 'Just a starting point — she’ll confirm actual availability when she follows up.' NOT NULL;
  ALTER TABLE "_booking_v" ADD COLUMN "version_submit_label" varchar DEFAULT 'Send your request' NOT NULL;
  ALTER TABLE "_booking_v" ADD COLUMN "version_confirmation_heading" varchar DEFAULT 'Thanks, {name}.' NOT NULL;
  ALTER TABLE "_booking_v" ADD COLUMN "version_confirmation_message" varchar DEFAULT 'Your request has been sent. She reads every one herself and usually replies within a day or two.' NOT NULL;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "booking" DROP COLUMN "how_it_works_heading";
  ALTER TABLE "booking" DROP COLUMN "date_help_text";
  ALTER TABLE "booking" DROP COLUMN "submit_label";
  ALTER TABLE "booking" DROP COLUMN "confirmation_heading";
  ALTER TABLE "booking" DROP COLUMN "confirmation_message";
  ALTER TABLE "_booking_v" DROP COLUMN "version_how_it_works_heading";
  ALTER TABLE "_booking_v" DROP COLUMN "version_date_help_text";
  ALTER TABLE "_booking_v" DROP COLUMN "version_submit_label";
  ALTER TABLE "_booking_v" DROP COLUMN "version_confirmation_heading";
  ALTER TABLE "_booking_v" DROP COLUMN "version_confirmation_message";`)
}
