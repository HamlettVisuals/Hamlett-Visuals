# Launch checklist

Things to do before (or right after) the site goes live. Tick each one off
as it's done.

- [ ] **Make the GitHub repo private.** First check whether HamlettVisuals is
      a GitHub organization, since Vercel's Hobby plan may not deploy private
      organization repos.
- [ ] **Set Vercel's Ignored Build Step to skip the `admin-cms` branch** before
      the first push.
- [ ] **Set up proper Payload migrations.** The repo has none, and production
      needs every schema change. While doing this, fix the too-long Featured
      Offer foreign key name: `_featured_offer_v_version_featured_package_id_pricing_rows_id_fk`
      is 64 characters, so Postgres cuts it to 63 (`…_pricing_rows_id_f`).
      Because of that, the dev schema push drops and re-adds it every time.
- [ ] **Separate the dev and production databases**, or clean all test data out
      of the shared Supabase database before launch.
- [ ] **Replace the placeholder Privacy Policy and Terms text.** Visitors can
      see it now.
- [ ] **Instagram: build the real connection, or hide the section until it's
      connected.** Placeholder posts are visible now
      (`src/lib/instagram-posts.ts`).
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
