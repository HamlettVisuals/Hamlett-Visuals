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
import { Clients } from "#src/collections/Clients.ts";
import { ChecklistTemplates } from "#src/collections/ChecklistTemplates.ts";
import { Backstage } from "#src/collections/Backstage.ts";
import { BackstageThumbnails } from "#src/collections/BackstageThumbnails.ts";
import { TestimonialSubmissions } from "#src/collections/TestimonialSubmissions.ts";
import { TestimonialPhotos } from "#src/collections/TestimonialPhotos.ts";
import { Logos } from "#src/collections/Logos.ts";

import { HeaderNav } from "#src/globals/HeaderNav.ts";
import { Hero } from "#src/globals/Hero.ts";
import { CategoriesIntro } from "#src/globals/CategoriesIntro.ts";
import { About } from "#src/globals/About.ts";
import { FeaturedOffer } from "#src/globals/FeaturedOffer.ts";
import { BookingCta } from "#src/globals/BookingCta.ts";
import { TestimonialsTeaser } from "#src/globals/TestimonialsTeaser.ts";
import { FinalCtaFooter } from "#src/globals/FinalCtaFooter.ts";
import { SiteSettings } from "#src/globals/SiteSettings.ts";
import { Booking } from "#src/globals/Booking.ts";
import { serverURL } from "#src/lib/server-url.ts";
import { addCharacterCounters } from "#src/lib/character-counters.ts";
import { hideInternalFieldsFromHistory } from "#src/lib/hide-internal-history.ts";
import { revalidateCollectionsOnChange, revalidateGlobalsOnChange } from "#src/lib/revalidate-site.ts";
import { MB, VIDEO_MAX_MB } from "#src/lib/backstage-limits.ts";
import { UPLOAD_FOLDERS } from "#src/lib/r2.ts";

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
      // BookingCta.tsx, Instagram.tsx, Nav.tsx,
      // (site)/portfolio/[category]/page.tsx + components/Gallery/* for
      // events/photos, and (site)/testimonials/page.tsx for testimonials.
      // Add others as they're connected; the site-content.ts placeholders
      // don't read from Payload yet, so enabling live preview for them would
      // do nothing.
      globals: [
        "hero",
        "about",
        "categories-intro",
        "featured-offer",
        "testimonials-teaser",
        "final-cta-footer",
        "site-settings",
        "booking",
        "header-nav",
        "booking-cta",
      ],
      // Collections get plain Live Preview only — no openByDefault, no
      // scroll-to-highlight, and (deliberately) no per-record targeting: a
      // page can render many documents from one collection at once (e.g.
      // every Package), and Payload's live-preview postMessage carries
      // no document id to filter by, so subscribing every rendered instance
      // to useLivePreview would let editing any one row overwrite every
      // other row's displayed content. RefreshRouteOnSave (already mounted
      // in (site)/layout.tsx) covers reactivity here instead: saving a
      // document refreshes the page with fresh server data, just not on
      // every keystroke the way wired globals do. Categories, Events (Albums)
      // and Pricing Rows (Packages) have item-scoped preview on top of that (their own
      // admin.livePreview.url adds ?lpDoc=<id>; see
      // docs/collection-live-preview.md); the rest follow as each is cleaned up.
      collections: ["pricing-rows", "categories", "events", "photos", "testimonials", "backstage"],
    },
    components: {
      // Replaces the default alphabetical/admin.group sidebar with a tree
      // that mirrors the real site's page structure — see SiteNav.tsx and
      // site-tree.ts.
      Nav: "/components/admin/SiteNav#default",
      views: {
        // The Inquiries kanban board (Phase 4 of the CRM plan) — a
        // top-level custom view rather than a collection view, since it
        // spans every stage rather than living under /collections/inquiries.
        // See KanbanBoard/index.tsx's header comment for why it wraps
        // itself in DefaultTemplate.
        kanban: {
          Component: "/components/admin/KanbanBoard#default",
          path: "/kanban",
        },
        // What the sidebar's "Editor" label opens: links to every editable
        // part of the website, grouped like the sidebar (site-tree.ts).
        editor: {
          Component: "/components/admin/EditorOverview#default",
          path: "/editor",
        },
      },
    },
    importMap: {
      // Custom admin component paths (e.g. Inquiries' status Cell) resolve
      // relative to this directory, so they're written as "/components/...".
      baseDir: dirname,
    },
  },
  i18n: {
    translations: {
      en: {
        general: {
          // The breadcrumb home icon's tooltip. /hv-studio redirects to the
          // kanban board (see next.config.ts), so "Dashboard" would be wrong.
          dashboard: "Kanban Board",
        },
        // "Versions" reads as developer jargon — the tab, History page
        // heading, breadcrumb and tab title all use version:versions.
        version: {
          versions: "History",
          compareVersions: "Compare with",
          moreVersions: "More history...",
          noFurtherVersionsFound: "No further history found",
          showingVersionsFor: "Showing history for:",
          versionCount_many: "{{count}} saves found",
          versionCount_none: "No history yet",
          versionCount_one: "{{count}} save found",
          versionCount_other: "{{count}} saves found",
          viewingVersions: "History for the {{entityLabel}} {{documentTitle}}",
          viewingVersionsGlobal: "History for {{entityLabel}}",
          // Single-entry view + restore modal, same "History" vocabulary.
          version: "History entry",
          viewingVersion: "History entry for the {{entityLabel}} {{documentTitle}}",
          viewingVersionGlobal: "History entry for {{entityLabel}}",
          selectVersionToCompare: "Select an entry to compare",
          previouslyPublished: "Previous entry",
          restoreThisVersion: "Restore this entry",
          confirmVersionRestoration: "Confirm restore",
          aboutToRestore:
            "You are about to restore this {{label}} to how it was on {{versionDate}}.",
          aboutToRestoreGlobal:
            "You are about to restore {{label}} to how it was on {{versionDate}}. This goes live immediately.",
          problemRestoringVersion: "There was a problem restoring this entry",
        },
      },
    },
  },
  // Every text field with a maxLength gets a live character counter (see
  // lib/character-counters.ts), and fields hidden in the editor are left out
  // of History's comparisons (lib/hide-internal-history.ts).
  // revalidate*OnChange: a save refreshes the live site (lib/revalidate-site.ts).
  collections: revalidateCollectionsOnChange(hideInternalFieldsFromHistory(addCharacterCounters([
    Users,
    Categories,
    Events,
    Photos,
    Testimonials,
    PricingRows,
    Inquiries,
    Clients,
    ChecklistTemplates,
    Backstage,
    BackstageThumbnails,
    TestimonialSubmissions,
    TestimonialPhotos,
    Logos,
  ]))),
  globals: revalidateGlobalsOnChange(hideInternalFieldsFromHistory(addCharacterCounters([
    HeaderNav,
    Hero,
    CategoriesIntro,
    About,
    FeaturedOffer,
    BookingCta,
    TestimonialsTeaser,
    FinalCtaFooter,
    SiteSettings,
    Booking,
  ]))),
  // The largest file any upload may be: Backstage's video cap. For uploads
  // sent straight from the browser to R2 (clientUploads) this size is also
  // written into the signed upload link, so R2 itself refuses anything
  // bigger before it's sent. Smaller per-collection caps are checked on save
  // (lib/upload-limits.ts, and Backstage.ts for videos).
  upload: {
    limits: { fileSize: VIDEO_MAX_MB * MB },
  },
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
    //
    // Schema changes go through migrations (src/migrations), never dev-mode
    // push: local dev and the live site share one database, so a push from
    // `npm run dev` would change production's tables directly, and Payload
    // refuses to run migrations on a database that's been pushed to. After
    // changing a collection/global: `npm run payload migrate:create <name>`,
    // then `npm run payload migrate`. `npm run build` runs `payload migrate`
    // first, so a Vercel deploy applies any new ones before building.
    // Each new migration file needs one hand edit: mark its type imports
    // (`import { type MigrateUpArgs, type MigrateDownArgs, sql }`), or the
    // CLI's --disable-transpile loader fails on them.
    push: false,
    migrationDir: path.resolve(dirname, "migrations"),
  }),
  sharp,
  plugins: [
    // Every upload lives in one R2 bucket, each collection in its own folder
    // (`prefix`, see lib/r2.ts) so two files of the same name in different
    // collections never overwrite each other.
    //
    // clientUploads: the studio's uploads go from the browser straight to
    // R2 through a short-lived signed link, rather than through the server,
    // whose request bodies are capped at ~4.5MB on Vercel. The link carries
    // the file's exact size, capped at upload.limits.fileSize above, so R2
    // itself refuses anything bigger; each collection's own, smaller cap is
    // checked on save (lib/upload-limits.ts). Only a signed-in studio user
    // can get a link. Payload then reads the file back from R2 to check what
    // it really is and to make the resized versions, as for any upload. The
    // bucket's CORS rules must allow this site's origin to PUT.
    //
    // The public testimonial form doesn't use these links: it has its own,
    // token-checked ones (lib/testimonial-uploads.ts).
    s3Storage({
      collections: {
        photos: { prefix: UPLOAD_FOLDERS.photos },
        logos: { prefix: UPLOAD_FOLDERS.logos },
        "testimonial-photos": { prefix: UPLOAD_FOLDERS["testimonial-photos"] },
        // Videos play straight from R2 (a redirect to a signed link) rather
        // than streaming through the server. Photos don't: next/image
        // can't follow that redirect, so they're served like Photos'.
        backstage: {
          prefix: UPLOAD_FOLDERS.backstage,
          signedDownloads: {
            shouldUseSignedURL: ({ filename }) => /\.(mp4|mov|m4v|webm)$/i.test(filename),
          },
        },
        // Video thumbnails (BackstageThumbnails.ts): the automatic ones are
        // made on the server, the ones she uploads come from the browser.
        "backstage-thumbnails": { prefix: UPLOAD_FOLDERS["backstage-thumbnails"] },
      },
      clientUploads: {
        access: ({ req }) => Boolean(req.user),
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
