import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "videos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar,
  	"event_id" integer NOT NULL,
  	"poster_id" integer,
  	"auto_poster_id" integer,
  	"duration" numeric,
  	"fast_start" boolean DEFAULT true,
  	"album_order" varchar,
  	"prefix" varchar DEFAULT 'videos',
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone,
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
  
  CREATE TABLE "video_posters" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"video_id" integer,
  	"prefix" varchar DEFAULT 'video-posters',
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
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "videos_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "video_posters_id" integer;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_poster_id_photos_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "videos" ADD CONSTRAINT "videos_auto_poster_id_video_posters_id_fk" FOREIGN KEY ("auto_poster_id") REFERENCES "public"."video_posters"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "video_posters" ADD CONSTRAINT "video_posters_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE set null ON UPDATE no action;
  CREATE INDEX "videos_event_idx" ON "videos" USING btree ("event_id");
  CREATE INDEX "videos_poster_idx" ON "videos" USING btree ("poster_id");
  CREATE INDEX "videos_auto_poster_idx" ON "videos" USING btree ("auto_poster_id");
  CREATE INDEX "videos_album_order_idx" ON "videos" USING btree ("album_order");
  CREATE INDEX "videos_updated_at_idx" ON "videos" USING btree ("updated_at");
  CREATE INDEX "videos_created_at_idx" ON "videos" USING btree ("created_at");
  CREATE INDEX "videos_deleted_at_idx" ON "videos" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "videos_filename_idx" ON "videos" USING btree ("filename");
  CREATE INDEX "video_posters_video_idx" ON "video_posters" USING btree ("video_id");
  CREATE INDEX "video_posters_updated_at_idx" ON "video_posters" USING btree ("updated_at");
  CREATE INDEX "video_posters_created_at_idx" ON "video_posters" USING btree ("created_at");
  CREATE UNIQUE INDEX "video_posters_filename_idx" ON "video_posters" USING btree ("filename");
  CREATE INDEX "video_posters_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "video_posters" USING btree ("sizes_thumbnail_filename");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_videos_fk" FOREIGN KEY ("videos_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_video_posters_fk" FOREIGN KEY ("video_posters_id") REFERENCES "public"."video_posters"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_videos_id_idx" ON "payload_locked_documents_rels" USING btree ("videos_id");
  CREATE INDEX "payload_locked_documents_rels_video_posters_id_idx" ON "payload_locked_documents_rels" USING btree ("video_posters_id");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "videos" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "video_posters" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "videos" CASCADE;
  DROP TABLE "video_posters" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_videos_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_video_posters_fk";
  
  DROP INDEX "payload_locked_documents_rels_videos_id_idx";
  DROP INDEX "payload_locked_documents_rels_video_posters_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "videos_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "video_posters_id";`)
}
