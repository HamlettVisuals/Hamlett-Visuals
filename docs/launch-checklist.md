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
