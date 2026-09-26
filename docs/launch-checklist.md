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
- [ ] **Direct-to-R2 uploads so large files work on Vercel.** Vercel rejects
      request bodies over ~4.5MB, and Photos, Logos, Testimonial Photos and the
      public testimonial form still upload through the server (Backstage
      already goes browser → R2). Turn on `clientUploads` for them (one
      `s3Storage` instance), give the public form its own token-checked signed
      upload, and add the production domain to the R2 bucket's CORS rules
      (today only `http://localhost:3000` is allowed). Test with a >5MB photo
      and a large video on a Vercel preview.
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
