import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "instagram_videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"post_id" integer NOT NULL,
  	"is_mock" boolean DEFAULT false,
  	"prefix" varchar DEFAULT 'instagram-videos',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  ALTER TABLE "instagram_connections" ADD COLUMN "last_video_report" jsonb;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_videos_id" integer;
  ALTER TABLE "instagram_videos" ADD CONSTRAINT "instagram_videos_post_id_instagram_posts_id_fk" FOREIGN KEY ("post_id") REFERENCES "public"."instagram_posts"("id") ON DELETE set null ON UPDATE no action;
  CREATE UNIQUE INDEX "instagram_videos_post_idx" ON "instagram_videos" USING btree ("post_id");
  CREATE INDEX "instagram_videos_is_mock_idx" ON "instagram_videos" USING btree ("is_mock");
  CREATE INDEX "instagram_videos_updated_at_idx" ON "instagram_videos" USING btree ("updated_at");
  CREATE INDEX "instagram_videos_created_at_idx" ON "instagram_videos" USING btree ("created_at");
  CREATE UNIQUE INDEX "instagram_videos_filename_idx" ON "instagram_videos" USING btree ("filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_videos_fk" FOREIGN KEY ("instagram_videos_id") REFERENCES "public"."instagram_videos"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_instagram_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_videos_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "instagram_videos" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "instagram_videos" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_videos_fk";
  
  DROP INDEX "payload_locked_documents_rels_instagram_videos_id_idx";
  ALTER TABLE "instagram_connections" DROP COLUMN "last_video_report";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_videos_id";`)
}
