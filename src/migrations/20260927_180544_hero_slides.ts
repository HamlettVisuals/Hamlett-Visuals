import { type MigrateUpArgs, type MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TABLE "hero_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"photo_id" integer NOT NULL,
  	"mobile_photo_id" integer
  );
  
  CREATE TABLE "_hero_v_version_slides" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" serial PRIMARY KEY NOT NULL,
  	"photo_id" integer NOT NULL,
  	"mobile_photo_id" integer,
  	"_uuid" varchar
  );
  
  ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_mobile_photo_id_photos_id_fk" FOREIGN KEY ("mobile_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "hero_slides" ADD CONSTRAINT "hero_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."hero"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "_hero_v_version_slides" ADD CONSTRAINT "_hero_v_version_slides_photo_id_photos_id_fk" FOREIGN KEY ("photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_hero_v_version_slides" ADD CONSTRAINT "_hero_v_version_slides_mobile_photo_id_photos_id_fk" FOREIGN KEY ("mobile_photo_id") REFERENCES "public"."photos"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "_hero_v_version_slides" ADD CONSTRAINT "_hero_v_version_slides_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."_hero_v"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "hero_slides_order_idx" ON "hero_slides" USING btree ("_order");
  CREATE INDEX "hero_slides_parent_id_idx" ON "hero_slides" USING btree ("_parent_id");
  CREATE INDEX "hero_slides_photo_idx" ON "hero_slides" USING btree ("photo_id");
  CREATE INDEX "hero_slides_mobile_photo_idx" ON "hero_slides" USING btree ("mobile_photo_id");
  CREATE INDEX "_hero_v_version_slides_order_idx" ON "_hero_v_version_slides" USING btree ("_order");
  CREATE INDEX "_hero_v_version_slides_parent_id_idx" ON "_hero_v_version_slides" USING btree ("_parent_id");
  CREATE INDEX "_hero_v_version_slides_photo_idx" ON "_hero_v_version_slides" USING btree ("photo_id");
  CREATE INDEX "_hero_v_version_slides_mobile_photo_idx" ON "_hero_v_version_slides" USING btree ("mobile_photo_id");`)

  // Carry the photos already picked in the old "Hero photos" list over as
  // slides, in the same order and with no mobile image. Array row ids are
  // any unique string; Payload's own are 24 hex characters, as here.
  await db.execute(sql`
   INSERT INTO "hero_slides" ("_order", "_parent_id", "id", "photo_id")
   SELECT "order", "parent_id", substr(md5(random()::text || "id"::text), 1, 24), "photos_id"
   FROM "hero_rels"
   WHERE "path" = 'heroPhotos' AND "photos_id" IS NOT NULL
   ORDER BY "parent_id", "order";`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "hero_slides" CASCADE;
  DROP TABLE "_hero_v_version_slides" CASCADE;`)
}
