import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_instagram_connections_status" AS ENUM('not_connected', 'connected', 'needs_reconnect');
  CREATE TYPE "public"."enum_instagram_posts_media_type" AS ENUM('image', 'video', 'carousel');
  CREATE TABLE "instagram_connections" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"slot" numeric NOT NULL,
  	"status" "enum_instagram_connections_status" DEFAULT 'not_connected' NOT NULL,
  	"username" varchar,
  	"ig_user_id" varchar,
  	"is_mock" boolean DEFAULT false,
  	"last_synced_at" timestamp(3) with time zone,
  	"last_error" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instagram_tokens" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"connection_id" integer NOT NULL,
  	"access_token" varchar NOT NULL,
  	"expires_at" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "instagram_posts" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"ig_id" varchar NOT NULL,
  	"connection_id" integer NOT NULL,
  	"media_type" "enum_instagram_posts_media_type" NOT NULL,
  	"permalink" varchar,
  	"caption" varchar,
  	"posted_at" timestamp(3) with time zone NOT NULL,
  	"is_mock" boolean DEFAULT false,
  	"prefix" varchar DEFAULT 'instagram',
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
  
  CREATE TABLE "instagram_section_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"slot" numeric NOT NULL,
  	"handle" varchar,
  	"label" varchar,
  	"visible" boolean DEFAULT false
  );
  
  CREATE TABLE "instagram_section" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"show_on_homepage" boolean DEFAULT true,
  	"heading" varchar DEFAULT 'Recent on Instagram' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "instagram_section_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"instagram_posts_id" integer
  );
  
  CREATE TABLE "_instagram_section_v_version_accounts" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"slot" numeric NOT NULL,
  	"handle" varchar,
  	"label" varchar,
  	"visible" boolean DEFAULT false,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_instagram_section_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_show_on_homepage" boolean DEFAULT true,
  	"version_heading" varchar DEFAULT 'Recent on Instagram' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_instagram_section_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"instagram_posts_id" integer
  );
  
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_connections_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_tokens_id" integer;
  ALTER TABLE "payload_locked_documents_rels" ADD COLUMN "instagram_posts_id" integer;
  ALTER TABLE "instagram_tokens" ADD CONSTRAINT "instagram_tokens_connection_id_instagram_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."instagram_connections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instagram_posts" ADD CONSTRAINT "instagram_posts_connection_id_instagram_connections_id_fk" FOREIGN KEY ("connection_id") REFERENCES "public"."instagram_connections"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "instagram_section_accounts" ADD CONSTRAINT "instagram_section_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."instagram_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "instagram_section_rels" ADD CONSTRAINT "instagram_section_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."instagram_section"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "instagram_section_rels" ADD CONSTRAINT "instagram_section_rels_instagram_posts_fk" FOREIGN KEY ("instagram_posts_id") REFERENCES "public"."instagram_posts"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_instagram_section_v_version_accounts" ADD CONSTRAINT "_instagram_section_v_version_accounts_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_instagram_section_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_instagram_section_v_rels" ADD CONSTRAINT "_instagram_section_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_instagram_section_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_instagram_section_v_rels" ADD CONSTRAINT "_instagram_section_v_rels_instagram_posts_fk" FOREIGN KEY ("instagram_posts_id") REFERENCES "public"."instagram_posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE UNIQUE INDEX "instagram_connections_slot_idx" ON "instagram_connections" USING btree ("slot");
  CREATE INDEX "instagram_connections_updated_at_idx" ON "instagram_connections" USING btree ("updated_at");
  CREATE INDEX "instagram_connections_created_at_idx" ON "instagram_connections" USING btree ("created_at");
  CREATE UNIQUE INDEX "instagram_tokens_connection_idx" ON "instagram_tokens" USING btree ("connection_id");
  CREATE INDEX "instagram_tokens_updated_at_idx" ON "instagram_tokens" USING btree ("updated_at");
  CREATE INDEX "instagram_tokens_created_at_idx" ON "instagram_tokens" USING btree ("created_at");
  CREATE UNIQUE INDEX "instagram_posts_ig_id_idx" ON "instagram_posts" USING btree ("ig_id");
  CREATE INDEX "instagram_posts_connection_idx" ON "instagram_posts" USING btree ("connection_id");
  CREATE INDEX "instagram_posts_posted_at_idx" ON "instagram_posts" USING btree ("posted_at");
  CREATE INDEX "instagram_posts_is_mock_idx" ON "instagram_posts" USING btree ("is_mock");
  CREATE INDEX "instagram_posts_updated_at_idx" ON "instagram_posts" USING btree ("updated_at");
  CREATE INDEX "instagram_posts_created_at_idx" ON "instagram_posts" USING btree ("created_at");
  CREATE UNIQUE INDEX "instagram_posts_filename_idx" ON "instagram_posts" USING btree ("filename");
  CREATE INDEX "instagram_posts_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "instagram_posts" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "instagram_section_accounts_order_idx" ON "instagram_section_accounts" USING btree ("_order");
  CREATE INDEX "instagram_section_accounts_parent_id_idx" ON "instagram_section_accounts" USING btree ("_parent_id");
  CREATE INDEX "instagram_section_rels_order_idx" ON "instagram_section_rels" USING btree ("order");
  CREATE INDEX "instagram_section_rels_parent_idx" ON "instagram_section_rels" USING btree ("parent_id");
  CREATE INDEX "instagram_section_rels_path_idx" ON "instagram_section_rels" USING btree ("path");
  CREATE INDEX "instagram_section_rels_instagram_posts_id_idx" ON "instagram_section_rels" USING btree ("instagram_posts_id");
  CREATE INDEX "_instagram_section_v_version_accounts_order_idx" ON "_instagram_section_v_version_accounts" USING btree ("_order");
  CREATE INDEX "_instagram_section_v_version_accounts_parent_id_idx" ON "_instagram_section_v_version_accounts" USING btree ("_parent_id");
  CREATE INDEX "_instagram_section_v_created_at_idx" ON "_instagram_section_v" USING btree ("created_at");
  CREATE INDEX "_instagram_section_v_updated_at_idx" ON "_instagram_section_v" USING btree ("updated_at");
  CREATE INDEX "_instagram_section_v_rels_order_idx" ON "_instagram_section_v_rels" USING btree ("order");
  CREATE INDEX "_instagram_section_v_rels_parent_idx" ON "_instagram_section_v_rels" USING btree ("parent_id");
  CREATE INDEX "_instagram_section_v_rels_path_idx" ON "_instagram_section_v_rels" USING btree ("path");
  CREATE INDEX "_instagram_section_v_rels_instagram_posts_id_idx" ON "_instagram_section_v_rels" USING btree ("instagram_posts_id");
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_connections_fk" FOREIGN KEY ("instagram_connections_id") REFERENCES "public"."instagram_connections"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_tokens_fk" FOREIGN KEY ("instagram_tokens_id") REFERENCES "public"."instagram_tokens"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_instagram_posts_fk" FOREIGN KEY ("instagram_posts_id") REFERENCES "public"."instagram_posts"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "payload_locked_documents_rels_instagram_connections_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_connections_id");
  CREATE INDEX "payload_locked_documents_rels_instagram_tokens_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_tokens_id");
  CREATE INDEX "payload_locked_documents_rels_instagram_posts_id_idx" ON "payload_locked_documents_rels" USING btree ("instagram_posts_id");
  -- Hand-added: no policies, so Supabase's Data API (anon/authenticated
  -- roles) can't read the tokens; Payload connects as the table owner,
  -- which RLS doesn't apply to.
  ALTER TABLE "instagram_tokens" ENABLE ROW LEVEL SECURITY;`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   ALTER TABLE "instagram_connections" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_tokens" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_posts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_section_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_section" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "instagram_section_rels" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_instagram_section_v_version_accounts" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_instagram_section_v" DISABLE ROW LEVEL SECURITY;
  ALTER TABLE "_instagram_section_v_rels" DISABLE ROW LEVEL SECURITY;
  DROP TABLE "instagram_connections" CASCADE;
  DROP TABLE "instagram_tokens" CASCADE;
  DROP TABLE "instagram_posts" CASCADE;
  DROP TABLE "instagram_section_accounts" CASCADE;
  DROP TABLE "instagram_section" CASCADE;
  DROP TABLE "instagram_section_rels" CASCADE;
  DROP TABLE "_instagram_section_v_version_accounts" CASCADE;
  DROP TABLE "_instagram_section_v" CASCADE;
  DROP TABLE "_instagram_section_v_rels" CASCADE;
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_connections_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_tokens_fk";
  
  ALTER TABLE "payload_locked_documents_rels" DROP CONSTRAINT "payload_locked_documents_rels_instagram_posts_fk";
  
  DROP INDEX "payload_locked_documents_rels_instagram_connections_id_idx";
  DROP INDEX "payload_locked_documents_rels_instagram_tokens_id_idx";
  DROP INDEX "payload_locked_documents_rels_instagram_posts_id_idx";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_connections_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_tokens_id";
  ALTER TABLE "payload_locked_documents_rels" DROP COLUMN "instagram_posts_id";
  DROP TYPE "public"."enum_instagram_connections_status";
  DROP TYPE "public"."enum_instagram_posts_media_type";`)
}
