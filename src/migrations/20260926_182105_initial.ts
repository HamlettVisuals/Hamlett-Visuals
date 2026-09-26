import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_inquiries_type" AS ENUM('question', 'booking');
  CREATE TYPE "public"."enum_inquiries_inquiry_type" AS ENUM('booking', 'question');
  CREATE TYPE "public"."enum_inquiries_status" AS ENUM('new', 'contacted', 'booked', 'declined', 'completed');
  CREATE TYPE "public"."enum_inquiries_stage" AS ENUM('lead', 'planning', 'prep', 'shoot', 'post', 'wrapup');
  CREATE TYPE "public"."enum_inquiries_post_production_status" AS ENUM('editing', 'edited', 'sent');
  CREATE TYPE "public"."enum_inquiries_payment_status" AS ENUM('unpaid', 'deposit', 'paid');
  CREATE TYPE "public"."enum_inquiries_source" AS ENUM('website', 'manual_social', 'manual_email', 'manual_referral');
  CREATE TYPE "public"."enum_checklist_templates_type" AS ENUM('prep', 'postProduction');
  CREATE TYPE "public"."enum_backstage_type" AS ENUM('video', 'reel_embed');
  CREATE TYPE "public"."enum__backstage_v_version_type" AS ENUM('video', 'reel_embed');
  CREATE TYPE "public"."enum_testimonial_submissions_status" AS ENUM('pending', 'published');
  CREATE TYPE "public"."enum_header_nav_nav_links_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TYPE "public"."enum__header_nav_v_version_nav_links_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TYPE "public"."enum_about_quick_links_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TYPE "public"."enum__about_v_version_quick_links_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TYPE "public"."enum_final_cta_footer_footer_nav_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TYPE "public"."enum__final_cta_footer_v_version_footer_nav_href" AS ENUM('/', '/#categories', '/#about', '/#offers', '/#hot-offer', '/#booking-cta', '/#instagram', '/#testimonials', '/booking', '/backstage', '/testimonials', '/privacy-policy', '/terms');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "categories" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"name" varchar NOT NULL,
  	"published" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"blurb" varchar,
  	"cover_photo_id" integer,
  	"hero_photo_id" integer,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_categories_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_name" varchar NOT NULL,
  	"version_published" boolean DEFAULT true,
  	"version_slug" varchar NOT NULL,
  	"version_blurb" varchar,
  	"version_cover_photo_id" integer,
  	"version_hero_photo_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "events" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"published" boolean DEFAULT true,
  	"slug" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"description" varchar,
  	"date" timestamp(3) with time zone,
  	"sort_date" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_events_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_title" varchar NOT NULL,
  	"version_published" boolean DEFAULT true,
  	"version_slug" varchar NOT NULL,
  	"version_category_id" integer NOT NULL,
  	"version_description" varchar,
  	"version_date" timestamp(3) with time zone,
  	"version_sort_date" timestamp(3) with time zone,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar NOT NULL,
  	"caption" varchar,
  	"event_id" integer,
  	"category_id" integer,
  	"featured" boolean DEFAULT false,
  	"prefix" varchar DEFAULT 'photos',
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
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "_photos_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_alt" varchar NOT NULL,
  	"version_caption" varchar,
  	"version_event_id" integer,
  	"version_category_id" integer,
  	"version_featured" boolean DEFAULT false,
  	"version_prefix" varchar DEFAULT 'photos',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"version_sizes_thumbnail_url" varchar,
  	"version_sizes_thumbnail_width" numeric,
  	"version_sizes_thumbnail_height" numeric,
  	"version_sizes_thumbnail_mime_type" varchar,
  	"version_sizes_thumbnail_filesize" numeric,
  	"version_sizes_thumbnail_filename" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "testimonials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"quote" varchar NOT NULL,
  	"client_name" varchar NOT NULL,
  	"category_id" integer NOT NULL,
  	"event_id" integer,
  	"photo_id" integer,
  	"context" varchar,
  	"featured" boolean DEFAULT false,
  	"published" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_testimonials_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version_quote" varchar NOT NULL,
  	"version_client_name" varchar NOT NULL,
  	"version_category_id" integer NOT NULL,
  	"version_event_id" integer,
  	"version_photo_id" integer,
  	"version_context" varchar,
  	"version_featured" boolean DEFAULT false,
  	"version_published" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "pricing_rows_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "pricing_rows" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"title" varchar NOT NULL,
  	"published" boolean DEFAULT true,
  	"category_id" integer NOT NULL,
  	"price_lead" varchar DEFAULT 'From',
  	"price_amount" varchar NOT NULL,
  	"summary" varchar NOT NULL,
  	"album_id" integer,
  	"featured" boolean DEFAULT false,
  	"order" numeric DEFAULT 0,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "pricing_rows_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"photos_id" integer
  );
  
  CREATE TABLE "_pricing_rows_v_version_features" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_pricing_rows_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_title" varchar NOT NULL,
  	"version_published" boolean DEFAULT true,
  	"version_category_id" integer NOT NULL,
  	"version_price_lead" varchar DEFAULT 'From',
  	"version_price_amount" varchar NOT NULL,
  	"version_summary" varchar NOT NULL,
  	"version_album_id" integer,
  	"version_featured" boolean DEFAULT false,
  	"version_order" numeric DEFAULT 0,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_pricing_rows_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"photos_id" integer
  );
  
  CREATE TABLE "inquiries_prep_checklist" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"completed" boolean DEFAULT false
  );
  
  CREATE TABLE "inquiries_post_production_checklist" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"item" varchar,
  	"completed" boolean DEFAULT false
  );
  
  CREATE TABLE "inquiries" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"type" "enum_inquiries_type" DEFAULT 'question' NOT NULL,
  	"inquiry_type" "enum_inquiries_inquiry_type" DEFAULT 'booking' NOT NULL,
  	"question_handled" boolean DEFAULT false,
  	"status" "enum_inquiries_status" DEFAULT 'new' NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"phone" varchar,
  	"client_id" integer,
  	"message" varchar NOT NULL,
  	"preferred_date" timestamp(3) with time zone,
  	"stage" "enum_inquiries_stage" DEFAULT 'lead' NOT NULL,
  	"post_production_status" "enum_inquiries_post_production_status",
  	"testimonial_received" boolean DEFAULT false,
  	"added_to_site" boolean DEFAULT false,
  	"archived" boolean DEFAULT false,
  	"category_id" integer,
  	"shoot_date" timestamp(3) with time zone,
  	"shoot_date_confirmed" boolean DEFAULT false,
  	"delivery_deadline" timestamp(3) with time zone,
  	"location_street" varchar,
  	"location_city" varchar,
  	"location_state" varchar,
  	"price" numeric,
  	"payment_status" "enum_inquiries_payment_status",
  	"source" "enum_inquiries_source",
  	"event_id" integer,
  	"testimonial_request_sent" boolean DEFAULT false,
  	"testimonial_request_sent_at" timestamp(3) with time zone,
  	"testimonial_request_token" varchar,
  	"source_page" varchar,
  	"notes" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "clients" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar,
  	"phone" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"deleted_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "checklist_templates_items" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"text" varchar NOT NULL
  );
  
  CREATE TABLE "checklist_templates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar NOT NULL,
  	"type" "enum_checklist_templates_type" NOT NULL,
  	"category_id" integer,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "backstage" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"_order" varchar,
  	"title" varchar,
  	"published" boolean DEFAULT true,
  	"caption" varchar,
  	"poster_id" integer,
  	"type" "enum_backstage_type" DEFAULT 'video' NOT NULL,
  	"reel_url" varchar,
  	"thumbnail_id" integer,
  	"order" numeric DEFAULT 0,
  	"prefix" varchar DEFAULT 'backstage',
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
  	"focal_y" numeric,
  	"sizes_thumbnail_url" varchar,
  	"sizes_thumbnail_width" numeric,
  	"sizes_thumbnail_height" numeric,
  	"sizes_thumbnail_mime_type" varchar,
  	"sizes_thumbnail_filesize" numeric,
  	"sizes_thumbnail_filename" varchar
  );
  
  CREATE TABLE "_backstage_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"parent_id" integer,
  	"version__order" varchar,
  	"version_title" varchar,
  	"version_published" boolean DEFAULT true,
  	"version_caption" varchar,
  	"version_poster_id" integer,
  	"version_type" "enum__backstage_v_version_type" DEFAULT 'video' NOT NULL,
  	"version_reel_url" varchar,
  	"version_thumbnail_id" integer,
  	"version_order" numeric DEFAULT 0,
  	"version_prefix" varchar DEFAULT 'backstage',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"version_deleted_at" timestamp(3) with time zone,
  	"version_url" varchar,
  	"version_thumbnail_u_r_l" varchar,
  	"version_filename" varchar,
  	"version_mime_type" varchar,
  	"version_filesize" numeric,
  	"version_width" numeric,
  	"version_height" numeric,
  	"version_focal_x" numeric,
  	"version_focal_y" numeric,
  	"version_sizes_thumbnail_url" varchar,
  	"version_sizes_thumbnail_width" numeric,
  	"version_sizes_thumbnail_height" numeric,
  	"version_sizes_thumbnail_mime_type" varchar,
  	"version_sizes_thumbnail_filesize" numeric,
  	"version_sizes_thumbnail_filename" varchar,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "backstage_thumbnails" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"generated" boolean DEFAULT false,
  	"item_id" integer,
  	"prefix" varchar DEFAULT 'backstage-thumbnails',
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
  
  CREATE TABLE "testimonial_submissions" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inquiry_id" integer NOT NULL,
  	"name" varchar NOT NULL,
  	"email" varchar NOT NULL,
  	"category_id" integer,
  	"event_id" integer,
  	"testimonial_text" varchar NOT NULL,
  	"social_link" varchar,
  	"private_notes" varchar,
  	"status" "enum_testimonial_submissions_status" DEFAULT 'pending' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "testimonial_submissions_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonial_photos_id" integer
  );
  
  CREATE TABLE "testimonial_photos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"inquiry_id" integer,
  	"prefix" varchar DEFAULT 'testimonial-photos',
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
  
  CREATE TABLE "logos" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"prefix" varchar DEFAULT 'logos',
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
  	"sizes_display_url" varchar,
  	"sizes_display_width" numeric,
  	"sizes_display_height" numeric,
  	"sizes_display_mime_type" varchar,
  	"sizes_display_filesize" numeric,
  	"sizes_display_filename" varchar
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"categories_id" integer,
  	"events_id" integer,
  	"photos_id" integer,
  	"testimonials_id" integer,
  	"pricing_rows_id" integer,
  	"inquiries_id" integer,
  	"clients_id" integer,
  	"checklist_templates_id" integer,
  	"backstage_id" integer,
  	"backstage_thumbnails_id" integer,
  	"testimonial_submissions_id" integer,
  	"testimonial_photos_id" integer,
  	"logos_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "header_nav_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" "enum_header_nav_nav_links_href" NOT NULL
  );
  
  CREATE TABLE "header_nav" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"book_label" varchar DEFAULT 'Book',
  	"book_href" varchar DEFAULT '/booking',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_header_nav_v_version_nav_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" "enum__header_nav_v_version_nav_links_href" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_header_nav_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_book_label" varchar DEFAULT 'Book',
  	"version_book_href" varchar DEFAULT '/booking',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "hero" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"headline" varchar DEFAULT 'Moments, held.' NOT NULL,
  	"subhead" varchar DEFAULT 'Weddings, portraits, pets, and more — captured as they happen.',
  	"cta_label" varchar DEFAULT 'Book a session',
  	"cta_href" varchar DEFAULT '#booking-cta',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "hero_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"photos_id" integer
  );
  
  CREATE TABLE "_hero_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_headline" varchar DEFAULT 'Moments, held.' NOT NULL,
  	"version_subhead" varchar DEFAULT 'Weddings, portraits, pets, and more — captured as they happen.',
  	"version_cta_label" varchar DEFAULT 'Book a session',
  	"version_cta_href" varchar DEFAULT '#booking-cta',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_hero_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"photos_id" integer
  );
  
  CREATE TABLE "categories_intro" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Browse by category' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_categories_intro_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'Browse by category' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "about_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"href" "enum_about_quick_links_href" NOT NULL
  );
  
  CREATE TABLE "about" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'About' NOT NULL,
  	"portrait_id" integer,
  	"bio" jsonb,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_about_v_version_quick_links" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"title" varchar NOT NULL,
  	"href" "enum__about_v_version_quick_links_href" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_about_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'About' NOT NULL,
  	"version_portrait_id" integer,
  	"version_bio" jsonb,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "featured_offer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"featured_package_id" integer,
  	"heading" varchar DEFAULT 'Popular right now' NOT NULL,
  	"badge_label" varchar DEFAULT 'Hot offer',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_featured_offer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_featured_package_id" integer,
  	"version_heading" varchar DEFAULT 'Popular right now' NOT NULL,
  	"version_badge_label" varchar DEFAULT 'Hot offer',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "booking_cta" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Ready when you are' NOT NULL,
  	"subheading" varchar DEFAULT 'Tell me what you''re planning and I''ll get back to you within a day.',
  	"cta_label" varchar DEFAULT 'Book a session',
  	"cta_href" varchar DEFAULT '/booking',
  	"contact_lead_in" varchar DEFAULT 'Prefer to reach out directly?',
  	"show_email" boolean DEFAULT true,
  	"show_phone" boolean DEFAULT true,
  	"show_instagram" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_booking_cta_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'Ready when you are' NOT NULL,
  	"version_subheading" varchar DEFAULT 'Tell me what you''re planning and I''ll get back to you within a day.',
  	"version_cta_label" varchar DEFAULT 'Book a session',
  	"version_cta_href" varchar DEFAULT '/booking',
  	"version_contact_lead_in" varchar DEFAULT 'Prefer to reach out directly?',
  	"version_show_email" boolean DEFAULT true,
  	"version_show_phone" boolean DEFAULT true,
  	"version_show_instagram" boolean DEFAULT true,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "testimonials_teaser" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'In their words' NOT NULL,
  	"link_label" varchar DEFAULT 'All testimonials',
  	"link_href" varchar DEFAULT '/testimonials',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "testimonials_teaser_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "_testimonials_teaser_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'In their words' NOT NULL,
  	"version_link_label" varchar DEFAULT 'All testimonials',
  	"version_link_href" varchar DEFAULT '/testimonials',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "_testimonials_teaser_v_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"testimonials_id" integer
  );
  
  CREATE TABLE "final_cta_footer_footer_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" "enum_final_cta_footer_footer_nav_href" NOT NULL
  );
  
  CREATE TABLE "final_cta_footer" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"sign_off_line" varchar DEFAULT 'Let''s make something worth keeping.' NOT NULL,
  	"cta_label" varchar DEFAULT 'Book a session',
  	"cta_href" varchar DEFAULT '/booking',
  	"show_email" boolean DEFAULT true,
  	"show_phone" boolean DEFAULT true,
  	"show_instagram" boolean DEFAULT true,
  	"show_qr_code" boolean DEFAULT true,
  	"copyright_name" varchar DEFAULT 'Hamlett Visuals',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_final_cta_footer_v_version_footer_nav" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"label" varchar NOT NULL,
  	"href" "enum__final_cta_footer_v_version_footer_nav_href" NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_final_cta_footer_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_sign_off_line" varchar DEFAULT 'Let''s make something worth keeping.' NOT NULL,
  	"version_cta_label" varchar DEFAULT 'Book a session',
  	"version_cta_href" varchar DEFAULT '/booking',
  	"version_show_email" boolean DEFAULT true,
  	"version_show_phone" boolean DEFAULT true,
  	"version_show_instagram" boolean DEFAULT true,
  	"version_show_qr_code" boolean DEFAULT true,
  	"version_copyright_name" varchar DEFAULT 'Hamlett Visuals',
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "site_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"site_name" varchar DEFAULT 'Hamlett Visuals' NOT NULL,
  	"logo_id" integer,
  	"favicon_id" integer,
  	"og_image_id" integer,
  	"og_image_alt" varchar DEFAULT 'Hamlett Visuals',
  	"contact_email" varchar DEFAULT 'hello@example.com',
  	"contact_phone" varchar,
  	"contact_phone_display" varchar,
  	"contact_phone_href" varchar,
  	"instagram_handle" varchar DEFAULT '@hamlettvisuals',
  	"instagram_url" varchar,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_site_settings_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_site_name" varchar DEFAULT 'Hamlett Visuals' NOT NULL,
  	"version_logo_id" integer,
  	"version_favicon_id" integer,
  	"version_og_image_id" integer,
  	"version_og_image_alt" varchar DEFAULT 'Hamlett Visuals',
  	"version_contact_email" varchar DEFAULT 'hello@example.com',
  	"version_contact_phone" varchar,
  	"version_contact_phone_display" varchar,
  	"version_contact_phone_href" varchar,
  	"version_instagram_handle" varchar DEFAULT '@hamlettvisuals',
  	"version_instagram_url" varchar,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "booking_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL
  );
  
  CREATE TABLE "booking" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"heading" varchar DEFAULT 'Book a session' NOT NULL,
  	"intro" varchar DEFAULT 'Tell her a little about what you have in mind and she''ll follow up to work out the rest.' NOT NULL,
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  CREATE TABLE "_booking_v_version_steps" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"title" varchar NOT NULL,
  	"description" varchar NOT NULL,
  	"_uuid" varchar
  );
  
  CREATE TABLE "_booking_v" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"version_heading" varchar DEFAULT 'Book a session' NOT NULL,
  	"version_intro" varchar DEFAULT 'Tell her a little about what you have in mind and she''ll follow up to work out the rest.' NOT NULL,
  	"version_updated_at" timestamp(3) with time zone,
  	"version_created_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_cover_photo_id_photos_id_fk" FOREIGN KEY ("cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "categories" ADD CONSTRAINT "categories_hero_photo_id_photos_id_fk" FOREIGN KEY ("hero_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_parent_id_categories_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_cover_photo_id_photos_id_fk" FOREIGN KEY ("version_cover_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_categories_v" ADD CONSTRAINT "_categories_v_version_hero_photo_id_photos_id_fk" FOREIGN KEY ("version_hero_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "events" ADD CONSTRAINT "events_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_parent_id_events_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_events_v" ADD CONSTRAINT "_events_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photos" ADD CONSTRAINT "photos_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "photos" ADD CONSTRAINT "photos_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photos_v" ADD CONSTRAINT "_photos_v_parent_id_photos_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photos_v" ADD CONSTRAINT "_photos_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_photos_v" ADD CONSTRAINT "_photos_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials" ADD CONSTRAINT "testimonials_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_parent_id_testimonials_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_event_id_events_id_fk" FOREIGN KEY ("version_event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_testimonials_v" ADD CONSTRAINT "_testimonials_v_version_photo_id_photos_id_fk" FOREIGN KEY ("version_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pricing_rows_features" ADD CONSTRAINT "pricing_rows_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."pricing_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_rows" ADD CONSTRAINT "pricing_rows_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pricing_rows" ADD CONSTRAINT "pricing_rows_album_id_events_id_fk" FOREIGN KEY ("album_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "pricing_rows_rels" ADD CONSTRAINT "pricing_rows_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pricing_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "pricing_rows_rels" ADD CONSTRAINT "pricing_rows_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v_version_features" ADD CONSTRAINT "_pricing_rows_v_version_features_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_pricing_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v" ADD CONSTRAINT "_pricing_rows_v_parent_id_pricing_rows_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."pricing_rows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v" ADD CONSTRAINT "_pricing_rows_v_version_category_id_categories_id_fk" FOREIGN KEY ("version_category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v" ADD CONSTRAINT "_pricing_rows_v_version_album_id_events_id_fk" FOREIGN KEY ("version_album_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v_rels" ADD CONSTRAINT "_pricing_rows_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_pricing_rows_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_pricing_rows_v_rels" ADD CONSTRAINT "_pricing_rows_v_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries_prep_checklist" ADD CONSTRAINT "inquiries_prep_checklist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries_post_production_checklist" ADD CONSTRAINT "inquiries_post_production_checklist_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "inquiries" ADD CONSTRAINT "inquiries_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "checklist_templates_items" ADD CONSTRAINT "checklist_templates_items_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "checklist_templates" ADD CONSTRAINT "checklist_templates_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "backstage" ADD CONSTRAINT "backstage_poster_id_backstage_thumbnails_id_fk" FOREIGN KEY ("poster_id") REFERENCES "public"."backstage_thumbnails"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "backstage" ADD CONSTRAINT "backstage_thumbnail_id_photos_id_fk" FOREIGN KEY ("thumbnail_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_backstage_v" ADD CONSTRAINT "_backstage_v_parent_id_backstage_id_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."backstage"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_backstage_v" ADD CONSTRAINT "_backstage_v_version_poster_id_backstage_thumbnails_id_fk" FOREIGN KEY ("version_poster_id") REFERENCES "public"."backstage_thumbnails"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_backstage_v" ADD CONSTRAINT "_backstage_v_version_thumbnail_id_photos_id_fk" FOREIGN KEY ("version_thumbnail_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "backstage_thumbnails" ADD CONSTRAINT "backstage_thumbnails_item_id_backstage_id_fk" FOREIGN KEY ("item_id") REFERENCES "public"."backstage"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonial_submissions" ADD CONSTRAINT "testimonial_submissions_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonial_submissions" ADD CONSTRAINT "testimonial_submissions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonial_submissions" ADD CONSTRAINT "testimonial_submissions_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonial_submissions_rels" ADD CONSTRAINT "testimonial_submissions_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonial_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonial_submissions_rels" ADD CONSTRAINT "testimonial_submissions_rels_testimonial_photos_fk" FOREIGN KEY ("testimonial_photos_id") REFERENCES "public"."testimonial_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonial_photos" ADD CONSTRAINT "testimonial_photos_inquiry_id_inquiries_id_fk" FOREIGN KEY ("inquiry_id") REFERENCES "public"."inquiries"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_categories_fk" FOREIGN KEY ("categories_id") REFERENCES "public"."categories"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_events_fk" FOREIGN KEY ("events_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_pricing_rows_fk" FOREIGN KEY ("pricing_rows_id") REFERENCES "public"."pricing_rows"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_inquiries_fk" FOREIGN KEY ("inquiries_id") REFERENCES "public"."inquiries"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_clients_fk" FOREIGN KEY ("clients_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_checklist_templates_fk" FOREIGN KEY ("checklist_templates_id") REFERENCES "public"."checklist_templates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_backstage_fk" FOREIGN KEY ("backstage_id") REFERENCES "public"."backstage"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_backstage_thumbnails_fk" FOREIGN KEY ("backstage_thumbnails_id") REFERENCES "public"."backstage_thumbnails"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonial_submissions_fk" FOREIGN KEY ("testimonial_submissions_id") REFERENCES "public"."testimonial_submissions"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_testimonial_photos_fk" FOREIGN KEY ("testimonial_photos_id") REFERENCES "public"."testimonial_photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_logos_fk" FOREIGN KEY ("logos_id") REFERENCES "public"."logos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "header_nav_nav_links" ADD CONSTRAINT "header_nav_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."header_nav"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_header_nav_v_version_nav_links" ADD CONSTRAINT "_header_nav_v_version_nav_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_header_nav_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "hero_rels" ADD CONSTRAINT "hero_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "hero_rels" ADD CONSTRAINT "hero_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_hero_v_rels" ADD CONSTRAINT "_hero_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_hero_v_rels" ADD CONSTRAINT "_hero_v_rels_photos_fk" FOREIGN KEY ("photos_id") REFERENCES "public"."photos"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about_quick_links" ADD CONSTRAINT "about_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."about"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "about" ADD CONSTRAINT "about_portrait_id_photos_id_fk" FOREIGN KEY ("portrait_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_about_v_version_quick_links" ADD CONSTRAINT "_about_v_version_quick_links_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_about_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_about_v" ADD CONSTRAINT "_about_v_version_portrait_id_photos_id_fk" FOREIGN KEY ("version_portrait_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "featured_offer" ADD CONSTRAINT "featured_offer_featured_package_id_pricing_rows_id_fk" FOREIGN KEY ("featured_package_id") REFERENCES "public"."pricing_rows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_featured_offer_v" ADD CONSTRAINT "_featured_offer_v_version_featured_package_id_pricing_rows_id_fk" FOREIGN KEY ("version_featured_package_id") REFERENCES "public"."pricing_rows"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "testimonials_teaser_rels" ADD CONSTRAINT "testimonials_teaser_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."testimonials_teaser"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "testimonials_teaser_rels" ADD CONSTRAINT "testimonials_teaser_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_testimonials_teaser_v_rels" ADD CONSTRAINT "_testimonials_teaser_v_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."_testimonials_teaser_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_testimonials_teaser_v_rels" ADD CONSTRAINT "_testimonials_teaser_v_rels_testimonials_fk" FOREIGN KEY ("testimonials_id") REFERENCES "public"."testimonials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "final_cta_footer_footer_nav" ADD CONSTRAINT "final_cta_footer_footer_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."final_cta_footer"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_final_cta_footer_v_version_footer_nav" ADD CONSTRAINT "_final_cta_footer_v_version_footer_nav_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_final_cta_footer_v"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_logo_id_logos_id_fk" FOREIGN KEY ("logo_id") REFERENCES "public"."logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_favicon_id_photos_id_fk" FOREIGN KEY ("favicon_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "site_settings" ADD CONSTRAINT "site_settings_og_image_id_photos_id_fk" FOREIGN KEY ("og_image_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_logo_id_logos_id_fk" FOREIGN KEY ("version_logo_id") REFERENCES "public"."logos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_favicon_id_photos_id_fk" FOREIGN KEY ("version_favicon_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_site_settings_v" ADD CONSTRAINT "_site_settings_v_version_og_image_id_photos_id_fk" FOREIGN KEY ("version_og_image_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "booking_steps" ADD CONSTRAINT "booking_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."booking"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_booking_v_version_steps" ADD CONSTRAINT "_booking_v_version_steps_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_booking_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "categories__order_idx" ON "categories" USING btree ("_order");
  CREATE UNIQUE INDEX "categories_slug_idx" ON "categories" USING btree ("slug");
  CREATE INDEX "categories_cover_photo_idx" ON "categories" USING btree ("cover_photo_id");
  CREATE INDEX "categories_hero_photo_idx" ON "categories" USING btree ("hero_photo_id");
  CREATE INDEX "categories_updated_at_idx" ON "categories" USING btree ("updated_at");
  CREATE INDEX "categories_created_at_idx" ON "categories" USING btree ("created_at");
  CREATE INDEX "categories_deleted_at_idx" ON "categories" USING btree ("deleted_at");
  CREATE INDEX "_categories_v_parent_idx" ON "_categories_v" USING btree ("parent_id");
  CREATE INDEX "_categories_v_version_version__order_idx" ON "_categories_v" USING btree ("version__order");
  CREATE INDEX "_categories_v_version_version_slug_idx" ON "_categories_v" USING btree ("version_slug");
  CREATE INDEX "_categories_v_version_version_cover_photo_idx" ON "_categories_v" USING btree ("version_cover_photo_id");
  CREATE INDEX "_categories_v_version_version_hero_photo_idx" ON "_categories_v" USING btree ("version_hero_photo_id");
  CREATE INDEX "_categories_v_version_version_updated_at_idx" ON "_categories_v" USING btree ("version_updated_at");
  CREATE INDEX "_categories_v_version_version_created_at_idx" ON "_categories_v" USING btree ("version_created_at");
  CREATE INDEX "_categories_v_version_version_deleted_at_idx" ON "_categories_v" USING btree ("version_deleted_at");
  CREATE INDEX "_categories_v_created_at_idx" ON "_categories_v" USING btree ("created_at");
  CREATE INDEX "_categories_v_updated_at_idx" ON "_categories_v" USING btree ("updated_at");
  CREATE UNIQUE INDEX "events_slug_idx" ON "events" USING btree ("slug");
  CREATE INDEX "events_category_idx" ON "events" USING btree ("category_id");
  CREATE INDEX "events_sort_date_idx" ON "events" USING btree ("sort_date");
  CREATE INDEX "events_updated_at_idx" ON "events" USING btree ("updated_at");
  CREATE INDEX "events_created_at_idx" ON "events" USING btree ("created_at");
  CREATE INDEX "events_deleted_at_idx" ON "events" USING btree ("deleted_at");
  CREATE INDEX "_events_v_parent_idx" ON "_events_v" USING btree ("parent_id");
  CREATE INDEX "_events_v_version_version_slug_idx" ON "_events_v" USING btree ("version_slug");
  CREATE INDEX "_events_v_version_version_category_idx" ON "_events_v" USING btree ("version_category_id");
  CREATE INDEX "_events_v_version_version_sort_date_idx" ON "_events_v" USING btree ("version_sort_date");
  CREATE INDEX "_events_v_version_version_updated_at_idx" ON "_events_v" USING btree ("version_updated_at");
  CREATE INDEX "_events_v_version_version_created_at_idx" ON "_events_v" USING btree ("version_created_at");
  CREATE INDEX "_events_v_version_version_deleted_at_idx" ON "_events_v" USING btree ("version_deleted_at");
  CREATE INDEX "_events_v_created_at_idx" ON "_events_v" USING btree ("created_at");
  CREATE INDEX "_events_v_updated_at_idx" ON "_events_v" USING btree ("updated_at");
  CREATE INDEX "photos_event_idx" ON "photos" USING btree ("event_id");
  CREATE INDEX "photos_category_idx" ON "photos" USING btree ("category_id");
  CREATE INDEX "photos_updated_at_idx" ON "photos" USING btree ("updated_at");
  CREATE INDEX "photos_created_at_idx" ON "photos" USING btree ("created_at");
  CREATE INDEX "photos_deleted_at_idx" ON "photos" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "photos_filename_idx" ON "photos" USING btree ("filename");
  CREATE INDEX "photos_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "photos" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "_photos_v_parent_idx" ON "_photos_v" USING btree ("parent_id");
  CREATE INDEX "_photos_v_version_version_event_idx" ON "_photos_v" USING btree ("version_event_id");
  CREATE INDEX "_photos_v_version_version_category_idx" ON "_photos_v" USING btree ("version_category_id");
  CREATE INDEX "_photos_v_version_version_updated_at_idx" ON "_photos_v" USING btree ("version_updated_at");
  CREATE INDEX "_photos_v_version_version_created_at_idx" ON "_photos_v" USING btree ("version_created_at");
  CREATE INDEX "_photos_v_version_version_deleted_at_idx" ON "_photos_v" USING btree ("version_deleted_at");
  CREATE INDEX "_photos_v_version_version_filename_idx" ON "_photos_v" USING btree ("version_filename");
  CREATE INDEX "_photos_v_version_sizes_thumbnail_version_sizes_thumbnai_idx" ON "_photos_v" USING btree ("version_sizes_thumbnail_filename");
  CREATE INDEX "_photos_v_created_at_idx" ON "_photos_v" USING btree ("created_at");
  CREATE INDEX "_photos_v_updated_at_idx" ON "_photos_v" USING btree ("updated_at");
  CREATE INDEX "testimonials_category_idx" ON "testimonials" USING btree ("category_id");
  CREATE INDEX "testimonials_event_idx" ON "testimonials" USING btree ("event_id");
  CREATE INDEX "testimonials_photo_idx" ON "testimonials" USING btree ("photo_id");
  CREATE INDEX "testimonials_updated_at_idx" ON "testimonials" USING btree ("updated_at");
  CREATE INDEX "testimonials_created_at_idx" ON "testimonials" USING btree ("created_at");
  CREATE INDEX "testimonials_deleted_at_idx" ON "testimonials" USING btree ("deleted_at");
  CREATE INDEX "_testimonials_v_parent_idx" ON "_testimonials_v" USING btree ("parent_id");
  CREATE INDEX "_testimonials_v_version_version_category_idx" ON "_testimonials_v" USING btree ("version_category_id");
  CREATE INDEX "_testimonials_v_version_version_event_idx" ON "_testimonials_v" USING btree ("version_event_id");
  CREATE INDEX "_testimonials_v_version_version_photo_idx" ON "_testimonials_v" USING btree ("version_photo_id");
  CREATE INDEX "_testimonials_v_version_version_updated_at_idx" ON "_testimonials_v" USING btree ("version_updated_at");
  CREATE INDEX "_testimonials_v_version_version_created_at_idx" ON "_testimonials_v" USING btree ("version_created_at");
  CREATE INDEX "_testimonials_v_version_version_deleted_at_idx" ON "_testimonials_v" USING btree ("version_deleted_at");
  CREATE INDEX "_testimonials_v_created_at_idx" ON "_testimonials_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_v_updated_at_idx" ON "_testimonials_v" USING btree ("updated_at");
  CREATE INDEX "pricing_rows_features_order_idx" ON "pricing_rows_features" USING btree ("_order");
  CREATE INDEX "pricing_rows_features_parent_id_idx" ON "pricing_rows_features" USING btree ("_parent_id");
  CREATE INDEX "pricing_rows__order_idx" ON "pricing_rows" USING btree ("_order");
  CREATE INDEX "pricing_rows_category_idx" ON "pricing_rows" USING btree ("category_id");
  CREATE INDEX "pricing_rows_album_idx" ON "pricing_rows" USING btree ("album_id");
  CREATE INDEX "pricing_rows_updated_at_idx" ON "pricing_rows" USING btree ("updated_at");
  CREATE INDEX "pricing_rows_created_at_idx" ON "pricing_rows" USING btree ("created_at");
  CREATE INDEX "pricing_rows_deleted_at_idx" ON "pricing_rows" USING btree ("deleted_at");
  CREATE INDEX "pricing_rows_rels_order_idx" ON "pricing_rows_rels" USING btree ("order");
  CREATE INDEX "pricing_rows_rels_parent_idx" ON "pricing_rows_rels" USING btree ("parent_id");
  CREATE INDEX "pricing_rows_rels_path_idx" ON "pricing_rows_rels" USING btree ("path");
  CREATE INDEX "pricing_rows_rels_photos_id_idx" ON "pricing_rows_rels" USING btree ("photos_id");
  CREATE INDEX "_pricing_rows_v_version_features_order_idx" ON "_pricing_rows_v_version_features" USING btree ("_order");
  CREATE INDEX "_pricing_rows_v_version_features_parent_id_idx" ON "_pricing_rows_v_version_features" USING btree ("_parent_id");
  CREATE INDEX "_pricing_rows_v_parent_idx" ON "_pricing_rows_v" USING btree ("parent_id");
  CREATE INDEX "_pricing_rows_v_version_version__order_idx" ON "_pricing_rows_v" USING btree ("version__order");
  CREATE INDEX "_pricing_rows_v_version_version_category_idx" ON "_pricing_rows_v" USING btree ("version_category_id");
  CREATE INDEX "_pricing_rows_v_version_version_album_idx" ON "_pricing_rows_v" USING btree ("version_album_id");
  CREATE INDEX "_pricing_rows_v_version_version_updated_at_idx" ON "_pricing_rows_v" USING btree ("version_updated_at");
  CREATE INDEX "_pricing_rows_v_version_version_created_at_idx" ON "_pricing_rows_v" USING btree ("version_created_at");
  CREATE INDEX "_pricing_rows_v_version_version_deleted_at_idx" ON "_pricing_rows_v" USING btree ("version_deleted_at");
  CREATE INDEX "_pricing_rows_v_created_at_idx" ON "_pricing_rows_v" USING btree ("created_at");
  CREATE INDEX "_pricing_rows_v_updated_at_idx" ON "_pricing_rows_v" USING btree ("updated_at");
  CREATE INDEX "_pricing_rows_v_rels_order_idx" ON "_pricing_rows_v_rels" USING btree ("order");
  CREATE INDEX "_pricing_rows_v_rels_parent_idx" ON "_pricing_rows_v_rels" USING btree ("parent_id");
  CREATE INDEX "_pricing_rows_v_rels_path_idx" ON "_pricing_rows_v_rels" USING btree ("path");
  CREATE INDEX "_pricing_rows_v_rels_photos_id_idx" ON "_pricing_rows_v_rels" USING btree ("photos_id");
  CREATE INDEX "inquiries_prep_checklist_order_idx" ON "inquiries_prep_checklist" USING btree ("_order");
  CREATE INDEX "inquiries_prep_checklist_parent_id_idx" ON "inquiries_prep_checklist" USING btree ("_parent_id");
  CREATE INDEX "inquiries_post_production_checklist_order_idx" ON "inquiries_post_production_checklist" USING btree ("_order");
  CREATE INDEX "inquiries_post_production_checklist_parent_id_idx" ON "inquiries_post_production_checklist" USING btree ("_parent_id");
  CREATE INDEX "inquiries_client_idx" ON "inquiries" USING btree ("client_id");
  CREATE INDEX "inquiries_category_idx" ON "inquiries" USING btree ("category_id");
  CREATE INDEX "inquiries_event_idx" ON "inquiries" USING btree ("event_id");
  CREATE UNIQUE INDEX "inquiries_testimonial_request_token_idx" ON "inquiries" USING btree ("testimonial_request_token");
  CREATE INDEX "inquiries_updated_at_idx" ON "inquiries" USING btree ("updated_at");
  CREATE INDEX "inquiries_created_at_idx" ON "inquiries" USING btree ("created_at");
  CREATE INDEX "inquiries_deleted_at_idx" ON "inquiries" USING btree ("deleted_at");
  CREATE INDEX "clients_updated_at_idx" ON "clients" USING btree ("updated_at");
  CREATE INDEX "clients_created_at_idx" ON "clients" USING btree ("created_at");
  CREATE INDEX "clients_deleted_at_idx" ON "clients" USING btree ("deleted_at");
  CREATE INDEX "checklist_templates_items_order_idx" ON "checklist_templates_items" USING btree ("_order");
  CREATE INDEX "checklist_templates_items_parent_id_idx" ON "checklist_templates_items" USING btree ("_parent_id");
  CREATE INDEX "checklist_templates_category_idx" ON "checklist_templates" USING btree ("category_id");
  CREATE INDEX "checklist_templates_updated_at_idx" ON "checklist_templates" USING btree ("updated_at");
  CREATE INDEX "checklist_templates_created_at_idx" ON "checklist_templates" USING btree ("created_at");
  CREATE INDEX "backstage__order_idx" ON "backstage" USING btree ("_order");
  CREATE INDEX "backstage_poster_idx" ON "backstage" USING btree ("poster_id");
  CREATE INDEX "backstage_thumbnail_idx" ON "backstage" USING btree ("thumbnail_id");
  CREATE INDEX "backstage_updated_at_idx" ON "backstage" USING btree ("updated_at");
  CREATE INDEX "backstage_created_at_idx" ON "backstage" USING btree ("created_at");
  CREATE INDEX "backstage_deleted_at_idx" ON "backstage" USING btree ("deleted_at");
  CREATE UNIQUE INDEX "backstage_filename_idx" ON "backstage" USING btree ("filename");
  CREATE INDEX "backstage_sizes_thumbnail_sizes_thumbnail_filename_idx" ON "backstage" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "_backstage_v_parent_idx" ON "_backstage_v" USING btree ("parent_id");
  CREATE INDEX "_backstage_v_version_version__order_idx" ON "_backstage_v" USING btree ("version__order");
  CREATE INDEX "_backstage_v_version_version_poster_idx" ON "_backstage_v" USING btree ("version_poster_id");
  CREATE INDEX "_backstage_v_version_version_thumbnail_idx" ON "_backstage_v" USING btree ("version_thumbnail_id");
  CREATE INDEX "_backstage_v_version_version_updated_at_idx" ON "_backstage_v" USING btree ("version_updated_at");
  CREATE INDEX "_backstage_v_version_version_created_at_idx" ON "_backstage_v" USING btree ("version_created_at");
  CREATE INDEX "_backstage_v_version_version_deleted_at_idx" ON "_backstage_v" USING btree ("version_deleted_at");
  CREATE INDEX "_backstage_v_version_version_filename_idx" ON "_backstage_v" USING btree ("version_filename");
  CREATE INDEX "_backstage_v_version_sizes_thumbnail_version_sizes_thumb_idx" ON "_backstage_v" USING btree ("version_sizes_thumbnail_filename");
  CREATE INDEX "_backstage_v_created_at_idx" ON "_backstage_v" USING btree ("created_at");
  CREATE INDEX "_backstage_v_updated_at_idx" ON "_backstage_v" USING btree ("updated_at");
  CREATE INDEX "backstage_thumbnails_item_idx" ON "backstage_thumbnails" USING btree ("item_id");
  CREATE INDEX "backstage_thumbnails_updated_at_idx" ON "backstage_thumbnails" USING btree ("updated_at");
  CREATE INDEX "backstage_thumbnails_created_at_idx" ON "backstage_thumbnails" USING btree ("created_at");
  CREATE UNIQUE INDEX "backstage_thumbnails_filename_idx" ON "backstage_thumbnails" USING btree ("filename");
  CREATE INDEX "backstage_thumbnails_sizes_thumbnail_sizes_thumbnail_fil_idx" ON "backstage_thumbnails" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "testimonial_submissions_inquiry_idx" ON "testimonial_submissions" USING btree ("inquiry_id");
  CREATE INDEX "testimonial_submissions_category_idx" ON "testimonial_submissions" USING btree ("category_id");
  CREATE INDEX "testimonial_submissions_event_idx" ON "testimonial_submissions" USING btree ("event_id");
  CREATE INDEX "testimonial_submissions_updated_at_idx" ON "testimonial_submissions" USING btree ("updated_at");
  CREATE INDEX "testimonial_submissions_created_at_idx" ON "testimonial_submissions" USING btree ("created_at");
  CREATE INDEX "testimonial_submissions_rels_order_idx" ON "testimonial_submissions_rels" USING btree ("order");
  CREATE INDEX "testimonial_submissions_rels_parent_idx" ON "testimonial_submissions_rels" USING btree ("parent_id");
  CREATE INDEX "testimonial_submissions_rels_path_idx" ON "testimonial_submissions_rels" USING btree ("path");
  CREATE INDEX "testimonial_submissions_rels_testimonial_photos_id_idx" ON "testimonial_submissions_rels" USING btree ("testimonial_photos_id");
  CREATE INDEX "testimonial_photos_inquiry_idx" ON "testimonial_photos" USING btree ("inquiry_id");
  CREATE INDEX "testimonial_photos_updated_at_idx" ON "testimonial_photos" USING btree ("updated_at");
  CREATE INDEX "testimonial_photos_created_at_idx" ON "testimonial_photos" USING btree ("created_at");
  CREATE UNIQUE INDEX "testimonial_photos_filename_idx" ON "testimonial_photos" USING btree ("filename");
  CREATE INDEX "testimonial_photos_sizes_thumbnail_sizes_thumbnail_filen_idx" ON "testimonial_photos" USING btree ("sizes_thumbnail_filename");
  CREATE INDEX "logos_updated_at_idx" ON "logos" USING btree ("updated_at");
  CREATE INDEX "logos_created_at_idx" ON "logos" USING btree ("created_at");
  CREATE UNIQUE INDEX "logos_filename_idx" ON "logos" USING btree ("filename");
  CREATE INDEX "logos_sizes_display_sizes_display_filename_idx" ON "logos" USING btree ("sizes_display_filename");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_categories_id_idx" ON "payload_locked_documents_rels" USING btree ("categories_id");
  CREATE INDEX "payload_locked_documents_rels_events_id_idx" ON "payload_locked_documents_rels" USING btree ("events_id");
  CREATE INDEX "payload_locked_documents_rels_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("photos_id");
  CREATE INDEX "payload_locked_documents_rels_testimonials_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonials_id");
  CREATE INDEX "payload_locked_documents_rels_pricing_rows_id_idx" ON "payload_locked_documents_rels" USING btree ("pricing_rows_id");
  CREATE INDEX "payload_locked_documents_rels_inquiries_id_idx" ON "payload_locked_documents_rels" USING btree ("inquiries_id");
  CREATE INDEX "payload_locked_documents_rels_clients_id_idx" ON "payload_locked_documents_rels" USING btree ("clients_id");
  CREATE INDEX "payload_locked_documents_rels_checklist_templates_id_idx" ON "payload_locked_documents_rels" USING btree ("checklist_templates_id");
  CREATE INDEX "payload_locked_documents_rels_backstage_id_idx" ON "payload_locked_documents_rels" USING btree ("backstage_id");
  CREATE INDEX "payload_locked_documents_rels_backstage_thumbnails_id_idx" ON "payload_locked_documents_rels" USING btree ("backstage_thumbnails_id");
  CREATE INDEX "payload_locked_documents_rels_testimonial_submissions_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonial_submissions_id");
  CREATE INDEX "payload_locked_documents_rels_testimonial_photos_id_idx" ON "payload_locked_documents_rels" USING btree ("testimonial_photos_id");
  CREATE INDEX "payload_locked_documents_rels_logos_id_idx" ON "payload_locked_documents_rels" USING btree ("logos_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");
  CREATE INDEX "header_nav_nav_links_order_idx" ON "header_nav_nav_links" USING btree ("_order");
  CREATE INDEX "header_nav_nav_links_parent_id_idx" ON "header_nav_nav_links" USING btree ("_parent_id");
  CREATE INDEX "_header_nav_v_version_nav_links_order_idx" ON "_header_nav_v_version_nav_links" USING btree ("_order");
  CREATE INDEX "_header_nav_v_version_nav_links_parent_id_idx" ON "_header_nav_v_version_nav_links" USING btree ("_parent_id");
  CREATE INDEX "_header_nav_v_created_at_idx" ON "_header_nav_v" USING btree ("created_at");
  CREATE INDEX "_header_nav_v_updated_at_idx" ON "_header_nav_v" USING btree ("updated_at");
  CREATE INDEX "hero_rels_order_idx" ON "hero_rels" USING btree ("order");
  CREATE INDEX "hero_rels_parent_idx" ON "hero_rels" USING btree ("parent_id");
  CREATE INDEX "hero_rels_path_idx" ON "hero_rels" USING btree ("path");
  CREATE INDEX "hero_rels_photos_id_idx" ON "hero_rels" USING btree ("photos_id");
  CREATE INDEX "_hero_v_created_at_idx" ON "_hero_v" USING btree ("created_at");
  CREATE INDEX "_hero_v_updated_at_idx" ON "_hero_v" USING btree ("updated_at");
  CREATE INDEX "_hero_v_rels_order_idx" ON "_hero_v_rels" USING btree ("order");
  CREATE INDEX "_hero_v_rels_parent_idx" ON "_hero_v_rels" USING btree ("parent_id");
  CREATE INDEX "_hero_v_rels_path_idx" ON "_hero_v_rels" USING btree ("path");
  CREATE INDEX "_hero_v_rels_photos_id_idx" ON "_hero_v_rels" USING btree ("photos_id");
  CREATE INDEX "_categories_intro_v_created_at_idx" ON "_categories_intro_v" USING btree ("created_at");
  CREATE INDEX "_categories_intro_v_updated_at_idx" ON "_categories_intro_v" USING btree ("updated_at");
  CREATE INDEX "about_quick_links_order_idx" ON "about_quick_links" USING btree ("_order");
  CREATE INDEX "about_quick_links_parent_id_idx" ON "about_quick_links" USING btree ("_parent_id");
  CREATE INDEX "about_portrait_idx" ON "about" USING btree ("portrait_id");
  CREATE INDEX "_about_v_version_quick_links_order_idx" ON "_about_v_version_quick_links" USING btree ("_order");
  CREATE INDEX "_about_v_version_quick_links_parent_id_idx" ON "_about_v_version_quick_links" USING btree ("_parent_id");
  CREATE INDEX "_about_v_version_version_portrait_idx" ON "_about_v" USING btree ("version_portrait_id");
  CREATE INDEX "_about_v_created_at_idx" ON "_about_v" USING btree ("created_at");
  CREATE INDEX "_about_v_updated_at_idx" ON "_about_v" USING btree ("updated_at");
  CREATE INDEX "featured_offer_featured_package_idx" ON "featured_offer" USING btree ("featured_package_id");
  CREATE INDEX "_featured_offer_v_version_version_featured_package_idx" ON "_featured_offer_v" USING btree ("version_featured_package_id");
  CREATE INDEX "_featured_offer_v_created_at_idx" ON "_featured_offer_v" USING btree ("created_at");
  CREATE INDEX "_featured_offer_v_updated_at_idx" ON "_featured_offer_v" USING btree ("updated_at");
  CREATE INDEX "_booking_cta_v_created_at_idx" ON "_booking_cta_v" USING btree ("created_at");
  CREATE INDEX "_booking_cta_v_updated_at_idx" ON "_booking_cta_v" USING btree ("updated_at");
  CREATE INDEX "testimonials_teaser_rels_order_idx" ON "testimonials_teaser_rels" USING btree ("order");
  CREATE INDEX "testimonials_teaser_rels_parent_idx" ON "testimonials_teaser_rels" USING btree ("parent_id");
  CREATE INDEX "testimonials_teaser_rels_path_idx" ON "testimonials_teaser_rels" USING btree ("path");
  CREATE INDEX "testimonials_teaser_rels_testimonials_id_idx" ON "testimonials_teaser_rels" USING btree ("testimonials_id");
  CREATE INDEX "_testimonials_teaser_v_created_at_idx" ON "_testimonials_teaser_v" USING btree ("created_at");
  CREATE INDEX "_testimonials_teaser_v_updated_at_idx" ON "_testimonials_teaser_v" USING btree ("updated_at");
  CREATE INDEX "_testimonials_teaser_v_rels_order_idx" ON "_testimonials_teaser_v_rels" USING btree ("order");
  CREATE INDEX "_testimonials_teaser_v_rels_parent_idx" ON "_testimonials_teaser_v_rels" USING btree ("parent_id");
  CREATE INDEX "_testimonials_teaser_v_rels_path_idx" ON "_testimonials_teaser_v_rels" USING btree ("path");
  CREATE INDEX "_testimonials_teaser_v_rels_testimonials_id_idx" ON "_testimonials_teaser_v_rels" USING btree ("testimonials_id");
  CREATE INDEX "final_cta_footer_footer_nav_order_idx" ON "final_cta_footer_footer_nav" USING btree ("_order");
  CREATE INDEX "final_cta_footer_footer_nav_parent_id_idx" ON "final_cta_footer_footer_nav" USING btree ("_parent_id");
  CREATE INDEX "_final_cta_footer_v_version_footer_nav_order_idx" ON "_final_cta_footer_v_version_footer_nav" USING btree ("_order");
  CREATE INDEX "_final_cta_footer_v_version_footer_nav_parent_id_idx" ON "_final_cta_footer_v_version_footer_nav" USING btree ("_parent_id");
  CREATE INDEX "_final_cta_footer_v_created_at_idx" ON "_final_cta_footer_v" USING btree ("created_at");
  CREATE INDEX "_final_cta_footer_v_updated_at_idx" ON "_final_cta_footer_v" USING btree ("updated_at");
  CREATE INDEX "site_settings_logo_idx" ON "site_settings" USING btree ("logo_id");
  CREATE INDEX "site_settings_favicon_idx" ON "site_settings" USING btree ("favicon_id");
  CREATE INDEX "site_settings_og_image_idx" ON "site_settings" USING btree ("og_image_id");
  CREATE INDEX "_site_settings_v_version_version_logo_idx" ON "_site_settings_v" USING btree ("version_logo_id");
  CREATE INDEX "_site_settings_v_version_version_favicon_idx" ON "_site_settings_v" USING btree ("version_favicon_id");
  CREATE INDEX "_site_settings_v_version_version_og_image_idx" ON "_site_settings_v" USING btree ("version_og_image_id");
  CREATE INDEX "_site_settings_v_created_at_idx" ON "_site_settings_v" USING btree ("created_at");
  CREATE INDEX "_site_settings_v_updated_at_idx" ON "_site_settings_v" USING btree ("updated_at");
  CREATE INDEX "booking_steps_order_idx" ON "booking_steps" USING btree ("_order");
  CREATE INDEX "booking_steps_parent_id_idx" ON "booking_steps" USING btree ("_parent_id");
  CREATE INDEX "_booking_v_version_steps_order_idx" ON "_booking_v_version_steps" USING btree ("_order");
  CREATE INDEX "_booking_v_version_steps_parent_id_idx" ON "_booking_v_version_steps" USING btree ("_parent_id");
  CREATE INDEX "_booking_v_created_at_idx" ON "_booking_v" USING btree ("created_at");
  CREATE INDEX "_booking_v_updated_at_idx" ON "_booking_v" USING btree ("updated_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "categories" CASCADE;
  DROP TABLE "_categories_v" CASCADE;
  DROP TABLE "events" CASCADE;
  DROP TABLE "_events_v" CASCADE;
  DROP TABLE "photos" CASCADE;
  DROP TABLE "_photos_v" CASCADE;
  DROP TABLE "testimonials" CASCADE;
  DROP TABLE "_testimonials_v" CASCADE;
  DROP TABLE "pricing_rows_features" CASCADE;
  DROP TABLE "pricing_rows" CASCADE;
  DROP TABLE "pricing_rows_rels" CASCADE;
  DROP TABLE "_pricing_rows_v_version_features" CASCADE;
  DROP TABLE "_pricing_rows_v" CASCADE;
  DROP TABLE "_pricing_rows_v_rels" CASCADE;
  DROP TABLE "inquiries_prep_checklist" CASCADE;
  DROP TABLE "inquiries_post_production_checklist" CASCADE;
  DROP TABLE "inquiries" CASCADE;
  DROP TABLE "clients" CASCADE;
  DROP TABLE "checklist_templates_items" CASCADE;
  DROP TABLE "checklist_templates" CASCADE;
  DROP TABLE "backstage" CASCADE;
  DROP TABLE "_backstage_v" CASCADE;
  DROP TABLE "backstage_thumbnails" CASCADE;
  DROP TABLE "testimonial_submissions" CASCADE;
  DROP TABLE "testimonial_submissions_rels" CASCADE;
  DROP TABLE "testimonial_photos" CASCADE;
  DROP TABLE "logos" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "header_nav_nav_links" CASCADE;
  DROP TABLE "header_nav" CASCADE;
  DROP TABLE "_header_nav_v_version_nav_links" CASCADE;
  DROP TABLE "_header_nav_v" CASCADE;
  DROP TABLE "hero" CASCADE;
  DROP TABLE "hero_rels" CASCADE;
  DROP TABLE "_hero_v" CASCADE;
  DROP TABLE "_hero_v_rels" CASCADE;
  DROP TABLE "categories_intro" CASCADE;
  DROP TABLE "_categories_intro_v" CASCADE;
  DROP TABLE "about_quick_links" CASCADE;
  DROP TABLE "about" CASCADE;
  DROP TABLE "_about_v_version_quick_links" CASCADE;
  DROP TABLE "_about_v" CASCADE;
  DROP TABLE "featured_offer" CASCADE;
  DROP TABLE "_featured_offer_v" CASCADE;
  DROP TABLE "booking_cta" CASCADE;
  DROP TABLE "_booking_cta_v" CASCADE;
  DROP TABLE "testimonials_teaser" CASCADE;
  DROP TABLE "testimonials_teaser_rels" CASCADE;
  DROP TABLE "_testimonials_teaser_v" CASCADE;
  DROP TABLE "_testimonials_teaser_v_rels" CASCADE;
  DROP TABLE "final_cta_footer_footer_nav" CASCADE;
  DROP TABLE "final_cta_footer" CASCADE;
  DROP TABLE "_final_cta_footer_v_version_footer_nav" CASCADE;
  DROP TABLE "_final_cta_footer_v" CASCADE;
  DROP TABLE "site_settings" CASCADE;
  DROP TABLE "_site_settings_v" CASCADE;
  DROP TABLE "booking_steps" CASCADE;
  DROP TABLE "booking" CASCADE;
  DROP TABLE "_booking_v_version_steps" CASCADE;
  DROP TABLE "_booking_v" CASCADE;
  DROP TYPE "public"."enum_inquiries_type";
  DROP TYPE "public"."enum_inquiries_inquiry_type";
  DROP TYPE "public"."enum_inquiries_status";
  DROP TYPE "public"."enum_inquiries_stage";
  DROP TYPE "public"."enum_inquiries_post_production_status";
  DROP TYPE "public"."enum_inquiries_payment_status";
  DROP TYPE "public"."enum_inquiries_source";
  DROP TYPE "public"."enum_checklist_templates_type";
  DROP TYPE "public"."enum_backstage_type";
  DROP TYPE "public"."enum__backstage_v_version_type";
  DROP TYPE "public"."enum_testimonial_submissions_status";
  DROP TYPE "public"."enum_header_nav_nav_links_href";
  DROP TYPE "public"."enum__header_nav_v_version_nav_links_href";
  DROP TYPE "public"."enum_about_quick_links_href";
  DROP TYPE "public"."enum__about_v_version_quick_links_href";
  DROP TYPE "public"."enum_final_cta_footer_footer_nav_href";
  DROP TYPE "public"."enum__final_cta_footer_v_version_footer_nav_href";`)
}
