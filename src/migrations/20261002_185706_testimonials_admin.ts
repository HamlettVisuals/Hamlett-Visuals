import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "testimonials_page" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar DEFAULT 'Testimonials' NOT NULL,
  	"intro" varchar DEFAULT 'A few words from people I’ve worked with, sorted by the kind of shoot they came for.',
  	"quote_font" varchar DEFAULT 'lora',
  	"show_review_section" boolean DEFAULT false,
  	"review_heading" varchar DEFAULT 'Worked with me?',
  	"review_text" varchar DEFAULT 'I’d love to hear how it went. Share your experience, and it might end up on this page.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_testimonials_page_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_title" varchar DEFAULT 'Testimonials' NOT NULL,
  	"version_intro" varchar DEFAULT 'A few words from people I’ve worked with, sorted by the kind of shoot they came for.',
  	"version_quote_font" varchar DEFAULT 'lora',
  	"version_show_review_section" boolean DEFAULT false,
  	"version_review_heading" varchar DEFAULT 'Worked with me?',
  	"version_review_text" varchar DEFAULT 'I’d love to hear how it went. Share your experience, and it might end up on this page.',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "testimonials" ALTER COLUMN "category_id" DROP NOT NULL;
  ALTER TABLE "_testimonials_v" ALTER COLUMN "version_category_id" DROP NOT NULL;
  ALTER TABLE "testimonials" ADD COLUMN "source" varchar DEFAULT 'admin';
  ALTER TABLE "testimonials" ADD COLUMN "submission_id" integer;
  ALTER TABLE "testimonials" ADD COLUMN "list_order" varchar;
  ALTER TABLE "_testimonials_v" ADD COLUMN "version_source" varchar DEFAULT 'admin';
  ALTER TABLE "_testimonials_v" ADD COLUMN "version_submission_id" integer;
  ALTER TABLE "_testimonials_v" ADD COLUMN "version_list_order" varchar;
  ALTER TABLE "testimonials_teaser" ADD COLUMN "quote_font" varchar DEFAULT 'fraunces-upright';
  ALTER TABLE "_testimonials_teaser_v" ADD COLUMN "version_quote_font" varchar DEFAULT 'fraunces-upright';
  CREATE INDEX "_testimonials_page_v_created_at_idx" ON "_testimonials_page_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_page_v_updated_at_idx" ON "_testimonials_page_v" USING btree ("updated_at");
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_submission_id_testimonial_submissions_id_fk" FOREIGN KEY ("submission_id") REFERENCES "public"."testimonial_submissions"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_submission_id_testimonial_submissions_id_fk" FOREIGN KEY ("version_submission_id") REFERENCES "public"."testimonial_submissions"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "testimonials_submission_idx" ON "testimonials" USING btree ("submission_id");
  CREATE INDEX "testimonials_list_order_idx" ON "testimonials" USING btree ("list_order");
  CREATE INDEX "_testimonials_v_version_version_submission_idx" ON "_testimonials_v" USING btree ("version_submission_id");
  CREATE INDEX "_testimonials_v_version_version_list_order_idx" ON "_testimonials_v" USING btree ("version_list_order");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "testimonials_page" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_testimonials_page_v" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "testimonials_page" CASCADE;
  DROP TABLE "_testimonials_page_v" CASCADE;
  ALTER TABLE "testimonials" DROP CONSTRAINT "testimonials_submission_id_testimonial_submissions_id_fk";
  
  ALTER TABLE "_testimonials_v" DROP CONSTRAINT "_testimonials_v_version_submission_id_testimonial_submissions_id_fk";
  
  DROP INDEX "testimonials_submission_idx";
  DROP INDEX "testimonials_list_order_idx";
  DROP INDEX "_testimonials_v_version_version_submission_idx";
  DROP INDEX "_testimonials_v_version_version_list_order_idx";
  ALTER TABLE "testimonials" ALTER COLUMN "category_id" SET NOT NULL;
  ALTER TABLE "_testimonials_v" ALTER COLUMN "version_category_id" SET NOT NULL;
  ALTER TABLE "testimonials" DROP COLUMN "source";
  ALTER TABLE "testimonials" DROP COLUMN "submission_id";
  ALTER TABLE "testimonials" DROP COLUMN "list_order";
  ALTER TABLE "_testimonials_v" DROP COLUMN "version_source";
  ALTER TABLE "_testimonials_v" DROP COLUMN "version_submission_id";
  ALTER TABLE "_testimonials_v" DROP COLUMN "version_list_order";
  ALTER TABLE "testimonials_teaser" DROP COLUMN "quote_font";
  ALTER TABLE "_testimonials_teaser_v" DROP COLUMN "version_quote_font";`)
}
