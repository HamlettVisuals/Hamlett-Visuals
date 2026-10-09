# End-to-end tests

Browser tests (Playwright) for the studio at `/hv-studio`, run against the
local dev server. They drive the real admin pages with the real data and
check what she'd see and what would be saved, **without saving anything**.

## Nothing is written, ever

The local dev server uses the **live** Supabase database, and the studio
uploads straight to R2. So every test runs behind a shared write guard
(`lib/guard.cjs`), which the harness installs on every browser context:

- reads (GET) go through, so pages show the real data;
- signing in and Payload's read-only requests go through;
- every other request (a save, delete, reorder, upload link, PUT to R2…)
  is answered by the guard with a harmless "OK" and logged, so the test can
  check it was sent, and what with.

A test that needs a write to answer a particular way (a refusal, a saved
document) adds its own `page.route()` for it; anything it doesn't answer
still falls through to the guard. Don't remove the guard from a test: that
would write to the live site.

## Sign in once

The tests use your studio session, saved by:

```
npm run test:e2e:login
```

A browser opens on the sign-in page; sign in as usual and it closes by
itself. The session is saved to `tests/e2e/.auth/state.json`, which is
**gitignored and must never be committed** (it's a live login). Run it again
whenever the tests stop with "Not signed in" or land on the sign-in page.

## Run them

Start the dev server first (`npm run dev`), then:

```
npm run test:e2e                    # every test, one after another
npm run test:e2e album unused       # only files whose name contains "album" or "unused"
HEADED=1 npm run test:e2e calendar  # watch it in a visible browser
```

On Windows PowerShell, set `HEADED` with `$env:HEADED=1; npm run test:e2e calendar`.

Tests run in a hidden (headless) browser, except `card-drawer-scroll`,
which always opens a visible one: Playwright's headless browser drops the
tap that follows its simulated touch scrolling, so the drawer's ✕ would
look broken when it isn't. Leave that window alone while it runs.

Don't run `npm run build` while the dev server is running: the dev server
breaks and has to be restarted.

Each file prints its checks and a summary line; the run ends with a table
per file and exits 1 if anything failed. Screenshots go to
`tests/e2e/.output/<test>/` (gitignored), along with the test images the
upload tests make on first use.

Results are:

- **PASS / FAIL**: as you'd expect.
- **EXPECTED**: something the test causes on purpose (e.g. a save it forces
  to fail) or that changed on purpose, still checked to be exactly that.
- **KNOWN**: a known issue outside this code, reported without failing the
  run: Payload's own side menu makes studio pages scroll ~15px sideways on
  phones (docs/build-2-plan.md, Mobile follow-ups).

## Known failures

- `hero-seconds.test.cjs`, "preview at 2: the bar fills over 2000ms, straight
  away": flaky. First seen failing on committed code on 2026-10-03 (before
  and after that day's work): the Live Preview keeps the 4.5s default
  instead of the unsaved 2s. On 2026-10-09 it failed in one full run and
  passed in the next, with no change to the hero code in between. Not
  fixed yet; to look at in a later session.
- `drawer-touch-scroll.test.cjs` (WebKit, iPhone profile): slow (about 5
  minutes as of 2026-10-09). Fails one check: an "Edit photo details"
  drawer's close button not found in landscape (which drawer it hits
  varies between runs). Until 2026-10-09 it also failed four checks on the
  hero slide "Choose from existing" drawer never opening. That was the
  Hero's Live Preview covering the form on a phone, not the test: phones
  now open every editor on its fields (components/admin/NarrowLivePreview.tsx),
  and those four pass. To look at in a later session, with hero-seconds.

## The tests

| File | What it covers |
|---|---|
| `public-api-access.test.cjs` | What a signed-out visitor can read through the API: private collections, client photo files and History refused; only shown, untrashed categories, albums, packages, Backstage and testimonials; no testimonial source or submission; and that the signed-in studio still reads everything (read-only) |
| `booking-page.test.cjs` | /booking and its editor: the form's frame matches How it works, past dates refused (typed and calendar), no Back to home; after sending (faked) How it works goes away, the thank-you is in view and focused with the heading above it, "Thanks, Jane." capitalized, the time and Instagram handle sent as their own fields, summary kept, the gallery link only for a category with albums; the Booking Page editor's name, step headers and new editable words (desktop, phone) |
| `kanban-asked-for.test.cjs` | What a booking asked for on the kanban: a Planning card reads "Preferred Mar 20 · Afternoon", and the card drawer's "What they asked for" shows the preferred date and time and the Instagram handle, linked. One live card's time and handle are filled in on the board's data in the browser only; nothing is written (desktop, phone) |
| `ask-button-clearance.test.cjs` | On phones, scrolled to the bottom, no text is under the floating "Ask a question" button on /booking, its thank-you, the homepage and /testimonials (375, 390, 430 wide; Chromium and WebKit) |
| `account-sign-out.test.cjs` | The account page's Sign out everywhere: asks first, Cancel backs out, confirming signs out every session (faked) and goes to the login page (desktop, phone) |
| `testimonials-admin.test.cjs` | Testimonials: the grouped list (redirect, tabs, rows, Published pill, Add to / Remove from homepage and a refusal), Needs review, Trash tabs, the edit page (field order with preview open and closed, category set by the album, album photos, Context placeholder, the homepage limit), Live Preview landing on the card, Page settings (desktop, phone) |
| `portfolio.test.cjs` | Categories & Albums: order, headers, open/close, the Live/Hidden pill, search, redirects, `#category-…`, sidebar and Editor overview (desktop, phone, landscape) |
| `portfolio-reorder.test.cjs` | Dragging categories and albums by mouse and press-and-hold touch, what's saved, a failed save, reordering off while searching |
| `portfolio-trash.test.cjs` | The Trash tab: sections, tabs, redirects, Restore / Delete permanently with sample deleted items, a refusal from the server |
| `trash-photos.test.cjs` | Deleted photos in the Trash tab, with the "still used" warning |
| `unused-photos.test.cjs` | Unused photos: loading, search, sort, show more, select, Move to Trash |
| `unused-photos-actions.test.cjs` | Unused photos: open a photo, Add to album…, Move one to Trash |
| `photos-page-retired.test.cjs` | No Photos page: redirects, a photo's ✕ and breadcrumbs, "Remove from album" message, every photo field can upload |
| `album-grid.test.cjs` | The album page's photo grid: order, cover, drag and keyboard reorder, photo menu, edit drawer, failed save |
| `album-uploads.test.cjs` | Uploading into an album (to a made-up R2 address), refusals, drag-and-drop, "Save & upload photos" |
| `album-videos.test.cjs` | Album videos: the Videos panel on the album page (upload to a made-up R2 address, the server's refusal shown as-is, a .mov refused before upload, title, poster picker, automatic poster, reorder, delete to the Trash, the fast-start warning), each collection's size cap in its signed upload link (real link requests, nothing uploaded), signed-out reads of videos and posters, and the player on a category page via the development-only sample (`?galleryState=video`) in installed Chrome: poster, hover zoom, play in place, phone width |
| `album-add-existing.test.cjs` | "Add existing photos" from the library |
| `album-live-preview.test.cjs` | Live Preview refreshing after photo changes |
| `card-drawer-scroll.test.cjs` | Kanban drawers scroll to their end on phones, tablets and desktop, incl. an on-screen keyboard |
| `calendar.test.cjs` | The kanban Calendar at seven sizes: markers per day, agenda, taps, a crowded day |
| `about-editor.test.cjs` | The About editor: Bio limited to paragraphs, bold, italic and links; Quick links column labels (wide and phone); a link to an empty Backstage/Testimonials page hidden on the homepage, with the editor's note |
| `narrow-live-preview.test.cjs` | On a phone, all 15 editors that open with Live Preview open on their fields; the eye button shows and hides the preview (labels, "Edit fields" hint, unsaved edits follow) without changing the saved preference; each page reopens on its fields; on a desktop each opens as before |
| `featured-offer.test.cjs` | Featured Offer: the Show on homepage switch (greyed fields, spotlight and badge hidden in Live Preview), package labels, hidden-package and no-photos warnings (mocked) |
| `offers-category.test.cjs` | Offers & pricing rows and the spotlight card show the category under the name only when it differs (homepage, and an unsaved title in Live Preview) |
| `packages-list.test.cjs` | Packages list: title links to the edit page, category cover or placeholder, the Featured tag (incl. mocked spotlight states), drag handles and the Live/Hidden pill, compact rows that fit at 375, 390 and 844x390 (desktop unchanged) |
| `package-editor.test.cjs` | Package editor: field order and sections, the featured note (incl. mocked spotlight states), its own description, features wrapping on a phone |
| `booking-section.test.cjs` | Booking Section: its name in the page title, breadcrumb, sidebar and Editor overview (and "Booking Page"), the note when all contact switches are off but the contact line has text |
| `testimonials-section.test.cjs` | Testimonials Section: its name in the page title, breadcrumb, sidebar and Editor overview; the picks as rows (mocked testimonials): adding with the picker, which leaves out what's picked, removing, the 4 limit, reordering by the handle with a mouse and press-and-hold touch, and the order a save sends |
| `footer-editor.test.cjs` | The Footer editor: its name in the page title, breadcrumb, sidebar and Editor overview; footer link column labels (wide and phone); a link to an empty Backstage/Testimonials page gets the editor's note (incl. mocked counts) and is hidden in the site's footer |
| `legal-pages.test.cjs` | Privacy Policy and Terms: signed out, an empty page 404s and its footer link is hidden (a written one shows); both editors under Editor > Legal; typed text (H2, paragraph, list) and a Last updated date show in Live Preview in the site's styles, and Publish (faked) sends them; the Privacy Policy's contact lines (Site Settings email as mailto, phone per the Footer's switch) under its text, none while empty or on Terms |
| `hero-seconds.test.cjs` | Hook (Hero) "Seconds per photo": the 2–10s slider in half seconds and its value, Live Preview following a new speed (bar fill and slide changes), the 1200ms crossfade unchanged, the homepage using the saved value, reduced motion never rotating, what Publish sends, the slider on a phone |
| `hero-slides-collapsed.test.cjs` | Hook (Hero) slides start collapsed; each header shows its photo's thumbnail, slide number and name (and "+ mobile image"), checked against the saved slides; opening a row, a new slide, the phone |
| `instagram-home.test.cjs` | Homepage Instagram section, signed out as saved: a grid of 9 or two labelled blocks of 6 (side by side at 1440, stacked at 390) or heading + Follow only; every tile 4:5, linking to its post in a new tab, caption as alt, badges on videos and carousels, 4px corners, images loading. Then in Live Preview, unsaved: one account, featured picks first in order, both accounts, both off, section off (nothing saved) |
| `instagram-section.test.cjs` | Instagram Section editor (mocked statuses and posts): two fixed cards with no add/remove/reorder, status lines, Sync now and the stubbed Connect, the Visible switch locked until connected, picking by tapping thumbnails, the 9 limit, removing, the "Showing 6 of N" note, reordering by the handle with a mouse and press-and-hold touch, and the order a save sends |
| `photo-usage.test.mts` | `lib/photo-usage.ts` on a stand-in config (no browser, no sign-in) |

## Unit tests

`npm run test:unit` runs `tests/unit/*.test.mts` with Node's own test
runner: no dev server, browser or sign-in needed, and nothing leaves the
machine. `email.test.mts` covers the site's emails (the sender address,
the inquiry emails when Resend accepts, refuses, can't be reached or isn't
set up, Payload's Resend adapter, and the config choosing it) against a
fake Resend; a "[Resend API Error]" line in its output is the simulated
"can't be reached" case. `listing-pages.test.mts` covers the rule that hides an About
quick link while its page has nothing published, and shows it again
once it has. `legal-pages.test.mts` covers the Privacy Policy and Terms
pages' "Last updated" rule (today when the text changes, unless she set the
date herself) and when a page counts as empty. `package-thumbnail.test.mts` covers the Packages list's
photo (the category's cover, or the placeholder), compiled with esbuild.

## Test data

The tests read the live test data as it is today, and some name it: the
categories Weddings, Motorsports, Test, Real Estate and Other; Test's
albums Maisy Test, Vacation Test (id 16) and Cars Test (id 15); the one
unused photo, HV.png (id 33). If that data changes, a test can fail without
anything being broken; update the names or ids near the top of that test.

## Writing a new test

Start from `lib/harness.cjs`:

```js
const { launchBrowser, newContext, report, outDir, ADMIN } = require("./lib/harness.cjs");
const r = report("my-test");
(async () => {
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  await page.goto(`${ADMIN}/portfolio`);
  r.check("the page has a title", (await page.title()).length > 0);
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
```

Name it `something.test.cjs` in this folder and `npm run test:e2e` picks it up.
