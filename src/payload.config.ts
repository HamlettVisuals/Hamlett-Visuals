import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildConfig } from "payload";
import { postgresAdapter } from "@payloadcms/db-postgres";
import { s3Storage } from "@payloadcms/storage-s3";
import { lexicalEditor } from "@payloadcms/richtext-lexical";
import sharp from "sharp";

// This file's own imports (and the shared "#src/access/isAdmin" import
// inside every collection/global, since they're all part of this file's
// module graph) use the "#src/" subpath — package.json's native "imports"
// field — rather than the "@/" tsconfig-only alias used everywhere else in
// the app. "@/" is a bundler-only feature (Next/webpack/tsx) that Node's
// native ESM resolver doesn't understand; "#src/" is Node's own subpath-import
// mechanism, so it resolves under Node's native loader, TypeScript, and
// Next's Turbopack bundler alike — needed so this file (and only this file's
// graph) loads directly via the standalone Payload CLI's `--disable-transpile`
// flag (native TS type-stripping, no tsx/require() — see the
// ERR_REQUIRE_ASYNC_MODULE investigation this fix came out of).
//
// Two hard-won quirks, both TypeScript-specific (Node and Turbopack don't
// care): the package.json "imports" key must be "#src/*", NOT the more
// obvious "#/*" — TypeScript's resolver throws "Invalid import specifier"
// on a bare "#/*" pattern (microsoft/TypeScript#55337). And the extension
// must be the real ".ts", not ".js" — Node's ".js"-maps-to-sibling-".ts"
// convention (used elsewhere for nodenext-style imports) isn't followed by
// Turbopack's resolver for package.json "imports" targets.
//
// Every other file in the app keeps "@/" — this workaround is scoped to
// payload.config.ts's own module graph only.
import { Users } from "#src/collections/Users.ts";
import { Categories } from "#src/collections/Categories.ts";
import { Events } from "#src/collections/Events.ts";
import { Photos } from "#src/collections/Photos.ts";
import { Testimonials } from "#src/collections/Testimonials.ts";
import { PricingRows } from "#src/collections/PricingRows.ts";
import { Inquiries } from "#src/collections/Inquiries.ts";

import { HeaderNav } from "#src/globals/HeaderNav.ts";
import { Hero } from "#src/globals/Hero.ts";
import { CategoriesIntro } from "#src/globals/CategoriesIntro.ts";
import { About } from "#src/globals/About.ts";
import { FeaturedOffer } from "#src/globals/FeaturedOffer.ts";
import { BookingCta } from "#src/globals/BookingCta.ts";
import { TestimonialsTeaser } from "#src/globals/TestimonialsTeaser.ts";
import { FinalCtaFooter } from "#src/globals/FinalCtaFooter.ts";
import { SiteSettings } from "#src/globals/SiteSettings.ts";
import { serverURL } from "#src/lib/server-url.ts";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default buildConfig({
  // Mounted at /hv-studio, not /admin — see src/app/(payload) and
  // src/app/robots.ts (Disallow) / (payload)/layout.tsx (noindex meta).
  routes: {
    admin: "/hv-studio",
    api: "/hv-studio/api",
  },
  admin: {
    user: Users.slug,
    meta: {
      title: "Hamlett Visuals — Studio",
      titleSuffix: "",
    },
    livePreview: {
      url: `${serverURL}/`,
      breakpoints: [
        { name: "mobile", label: "Mobile", width: 375, height: 667 },
        { name: "tablet", label: "Tablet", width: 768, height: 1024 },
        { name: "desktop", label: "Desktop", width: 1440, height: 900 },
      ],
      // Only globals/collections actually wired to the frontend belong here
      // — see components/home/Hero.tsx, About.tsx, Categories.tsx,
      // FeaturedOffer.tsx, Offers.tsx, Testimonials.tsx, Footer.tsx,
      // BookingCta.tsx and Instagram.tsx. Add others as they're connected;
      // the site-content.ts placeholders don't read from Payload yet, so
      // enabling live preview for them would do nothing.
      globals: [
        "hero",
        "about",
        "categories-intro",
        "featured-offer",
        "testimonials-teaser",
        "final-cta-footer",
        "site-settings",
      ],
      // Collections get plain Live Preview only — no openByDefault, no
      // scroll-to-highlight, and (deliberately) no per-record targeting: a
      // page can render many documents from one collection at once (e.g.
      // every Pricing Row), and Payload's live-preview postMessage carries
      // no document id to filter by, so subscribing every rendered instance
      // to useLivePreview would let editing any one row overwrite every
      // other row's displayed content. RefreshRouteOnSave (already mounted
      // in (site)/layout.tsx) covers reactivity here instead: saving a
      // document refreshes the page with fresh server data, just not on
      // every keystroke the way wired globals do.
      collections: ["pricing-rows"],
    },
    components: {
      // Replaces the default alphabetical/admin.group sidebar with a tree
      // that mirrors the real site's page structure — see SiteNav.tsx.
      Nav: "/components/admin/SiteNav#default",
    },
    importMap: {
      // Custom admin component paths (e.g. Inquiries' status Cell) resolve
      // relative to this directory, so they're written as "/components/...".
      baseDir: dirname,
    },
  },
  collections: [
    Users,
    Categories,
    Events,
    Photos,
    Testimonials,
    PricingRows,
    Inquiries,
  ],
  globals: [
    HeaderNav,
    Hero,
    CategoriesIntro,
    About,
    FeaturedOffer,
    BookingCta,
    TestimonialsTeaser,
    FinalCtaFooter,
    SiteSettings,
  ],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET ?? "",
  typescript: {
    outputFile: path.resolve(dirname, "payload-types.ts"),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI,
      // Supabase requires SSL on both direct and pooled (pgbouncer)
      // connections; rejectUnauthorized: false because Supabase's cert chain
      // isn't in Node's default trust store. Safe here since the DB host
      // itself is pinned via DATABASE_URI, not user input.
      ssl: { rejectUnauthorized: false },
    },
    // If DATABASE_URI points at the Supavisor pooler (host ends in
    // pooler.supabase.com) rather than a direct db.<ref>.supabase.co
    // connection: no other change is needed here. Payload's Postgres adapter
    // runs queries through drizzle-orm's node-postgres driver, which sends
    // each query as an unnamed (ad-hoc) statement rather than a named,
    // server-side-cached prepared statement — so it's already safe under
    // PgBouncer's transaction pooling mode without a "disable prepared
    // statements" flag (that flag exists on postgres.js-based setups, which
    // this isn't). In transaction mode (port 6543) session-level features
    // (e.g. LISTEN/NOTIFY, advisory locks) aren't available, but Payload
    // doesn't rely on those.
  }),
  sharp,
  plugins: [
    s3Storage({
      collections: {
        photos: true,
      },
      bucket: process.env.R2_BUCKET ?? "",
      config: {
        region: "auto",
        endpoint: process.env.R2_ENDPOINT,
        forcePathStyle: true,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
      },
    }),
  ],
});
