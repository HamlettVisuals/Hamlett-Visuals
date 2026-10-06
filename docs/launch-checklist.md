# Launch checklist

Things to do before (or right after) the site goes live. Tick each one off
as it's done.

- [ ] **Make the GitHub repo private.** First check whether HamlettVisuals is
      a GitHub organization, since Vercel's Hobby plan may not deploy private
      organization repos.
- [ ] **Set Vercel's Ignored Build Step to skip the `admin-cms` branch** before
      the first push.
- [x] **Set up proper Payload migrations.** Baseline is
      `src/migrations/20260926_182105_initial.ts`; dev push is off and
      `npm run build` runs `payload migrate` first. The too-long Featured
      Offer foreign key name (64 characters, cut to 63 by Postgres) no
      longer matters: only dev push compared names against the live
      database, and new migrations compare against the saved snapshot.
- [x] **Record the baseline migration as run on the live database** before
      the first deploy: `node --env-file=.env.local src/scripts/markInitialMigrationApplied.mjs`,
      then `npm run payload migrate:status` should show it as run.
- [ ] **Separate the dev and production databases**, or clean all test data out
      of the shared Supabase database before launch.
- [ ] **Replace the placeholder Privacy Policy and Terms text.** Visitors can
      see it now.
- [ ] **Instagram: connect the real account.** The Instagram Section, sync
      and homepage grid are built against a mock provider; the real one is
      stubbed (`src/lib/instagram-real-provider.ts`, its TODOs). Until it's
      connected, the homepage shows only the heading and a "Follow" link.
      Then run `npm run instagram:clear-mock` (try `dry-run` first) to remove
      the mock posts, their R2 images and the mock connection.
- [ ] **Delete the `.backups/` folder** after the first successful deploy.
- [ ] **Add the production domain to the R2 bucket's CORS rules (Cloudflare
      dashboard).** Every upload now goes from the browser straight to R2
      (the studio's through `clientUploads`, the public testimonial form
      through its own signed links), and today only `http://localhost:3000`
      may `PUT` there. Allow the production origin with `PUT` and the
      `Content-Type` header.
- [ ] **Test a >5MB photo, a large video, and the public testimonial form on
      a Vercel preview.** Vercel rejects request bodies over ~4.5MB, which is
      what the direct-to-R2 uploads get around; confirm on a real deploy.
- [ ] **Add an R2 lifecycle rule for the `testimonial-uploads/` folder**
      (Cloudflare dashboard, delete objects after 1 day). It's the holding
      spot for photos sent from the public testimonial form; a photo is
      deleted from there once it's saved or refused, and one that's never
      saved (the page closed mid-upload) is only cleared on that link's next
      upload otherwise (`src/lib/testimonial-uploads.ts`).
- [ ] **Check Backstage video thumbnails on the first Vercel deploy.** They
      come from the `ffmpeg-static` binary, which its install script
      downloads from GitHub during the build and `next.config.ts` traces into
      the Payload API route. Upload a short video and confirm it gets a
      thumbnail (if ffmpeg is missing, items still save, just without one
      and without the 3-minute length check).
- [ ] **Play a Backstage video on a real iPhone.** Desktop Chrome plays
      them inline with sound from the tap on play; confirm the same in iPhone
      Safari (no full-screen takeover, sound on), including a MOV straight
      from the phone.
- [x] **Hero photo positioning (high priority).** Each hero slide is
      positioned by its photo's focal point (Edit Image in the photo), with
      an optional mobile image per slide.
- [ ] **Drop the old "Hero photos" field.** Once the hero_slides change is
      deployed, remove the hidden `heroPhotos` field from globals/Hero.ts and
      generate a migration (drops `hero_rels` rows / `_hero_v_rels`). It was
      kept so the hero_slides migration stayed additive while the live site
      still read it. Any picks saved to it on the live admin after
      2026-09-27 18:06 UTC are not in `slides`; re-add them there.
- [ ] **Drop the unused `showQrCode` column.** The footer's Instagram QR
      code was removed on 2026-09-28; its "Show Instagram QR code" switch is
      hidden in globals/FinalCtaFooter.ts and nothing reads it. Remove the
      field and generate a migration (drops `show_qr_code` from
      `final_cta_footer` and `version_show_qr_code` from
      `_final_cta_footer_v`).
- [ ] **Drop the unused inquiry Status field (migration, back up first).**
      The old New/Contacted/Booked/Declined/Completed `status` on Inquiries
      was replaced by the board's `stage` on 2026-09-29: it's hidden in
      collections/Inquiries.ts, testimonial requests now depend on Wrap-Up,
      and nothing reads it. Back up the database, remove the field, and
      generate a migration (drops `status` and its enum from `inquiries`).
      `api/inquiries/add-lead/route.ts` still sets `status: "new"`; remove
      that line in the same change.
- [ ] **Set up email sending on a real domain, then test every email end to
      end.** Until this is done every email goes out from Resend's test
      sender (`onboarding@resend.dev`), which only delivers to the Resend
      account's own inbox: client auto-replies and testimonial requests are
      refused (logged as "couldn't send … — Resend: validation_error", and the
      testimonial banner says "Email couldn't be sent. Try again later.").
      1. Buy the domain.
      2. Verify it in Resend (Domains → Add domain; add the DNS records it
         lists, wait for "Verified").
      3. On Vercel, set `RESEND_FROM_ADDRESS` for Production, e.g.
         `Hamlett Visuals <hello@<domain>>`, and check `RESEND_API_KEY` is set
         there too. Redeploy. (The same address is used by every sender —
         `src/lib/email-from.ts`.)
      4. On the live site, test each one:
         - **Forgot password** (on /hv-studio/login) → the reset email arrives
           and its link works.
         - **Owner notification** → send a booking request and a question from
           the site; each arrives in the Site Settings contact inbox, and
           Reply goes to the sender.
         - **Client auto-reply** → the address used in the forms above gets
           "We got your booking request" / "We got your question".
         - **Testimonial request** → from a Wrap-Up inquiry, Send request;
           the email arrives, the link opens the form, and the inquiry shows
           "Testimonial Request Sent".
         Anything that doesn't arrive: Vercel logs → search "couldn't send".
- [ ] **Know how to get back into /hv-studio if she's locked out** (forgot
      password not working, or too many failed logins). From this project,
      with `.env.local` holding the live `DATABASE_URI`:
      `npm run payload -- run src/scripts/resetAdminPassword.ts <her-login-email>`
      Type the new password twice at the hidden prompt (12+ characters; it
      never goes on the command line or into shell history). It sets that one
      account's password and clears the failed-login lock; with a wrong email,
      mismatched or too-short password it changes nothing.
- [ ] **Drop the unused photo columns `photos.category` and
      `photos.featured`.** Nothing on the site reads either: a photo's
      category is its album's, and "Featured" (eligible for the homepage)
      was never wired up. Nothing writes `category` any more (publishing a
      testimonial stopped on 2026-09-30); `featured` only gets its default.
      Both are already hidden from the studio (2026-09-30). Remove both
      fields from `src/collections/Photos.ts`, then `npm run payload
      migrate:create drop_photo_category_featured`: it should only drop
      `photos.category_id`, `photos.featured`,
      `_photos_v.version_category_id` and `_photos_v.version_featured`
      (plus the category index and foreign key). Back up first (see
      docs/build-2-plan.md, Environment notes), check the SQL, run it
      before deploying.
- [ ] **Drop `events.sort_date`.** Albums are in her drag order now
      (`albumOrder`); the date-based sort key is only still read by the
      Albums collection's default sort (`defaultSort: "-sortDate"` in
      `src/collections/Events.ts`, used wherever Payload lists albums
      itself, e.g. the Album dropdown on a photo) and the package form's
      album dropdown
      (`sortOptions: "-sortDate"` in `src/collections/PricingRows.ts`).
      Point those at `albumOrder` or `-createdAt`, remove the `sortDate`
      field and the `setSortDate` hook, then a migration that drops
      `events.sort_date` and `_events_v.version_sort_date` (and their
      indexes). Backup first, check the SQL, run it before deploying.
- [ ] Publish a test testimonial with a photo and confirm the photo shows on the testimonial only, not in any album gallery; then delete it.
