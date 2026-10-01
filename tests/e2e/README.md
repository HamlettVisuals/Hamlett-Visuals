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

## The tests

| File | What it covers |
|---|---|
| `portfolio.test.cjs` | Categories & Albums: order, headers, open/close, the Live/Hidden pill, search, redirects, `#category-…`, sidebar and Editor overview (desktop, phone, landscape) |
| `portfolio-reorder.test.cjs` | Dragging categories and albums by mouse and press-and-hold touch, what's saved, a failed save, reordering off while searching |
| `portfolio-trash.test.cjs` | The Trash tab: sections, tabs, redirects, Restore / Delete permanently with sample deleted items, a refusal from the server |
| `trash-photos.test.cjs` | Deleted photos in the Trash tab, with the "still used" warning |
| `unused-photos.test.cjs` | Unused photos: loading, search, sort, show more, select, Move to Trash |
| `unused-photos-actions.test.cjs` | Unused photos: open a photo, Add to album…, Move one to Trash |
| `photos-page-retired.test.cjs` | No Photos page: redirects, a photo's ✕ and breadcrumbs, "Remove from album" message, every photo field can upload |
| `album-grid.test.cjs` | The album page's photo grid: order, cover, drag and keyboard reorder, photo menu, edit drawer, failed save |
| `album-uploads.test.cjs` | Uploading into an album (to a made-up R2 address), refusals, drag-and-drop, "Save & upload photos" |
| `album-add-existing.test.cjs` | "Add existing photos" from the library |
| `album-live-preview.test.cjs` | Live Preview refreshing after photo changes |
| `card-drawer-scroll.test.cjs` | Kanban drawers scroll to their end on phones, tablets and desktop, incl. an on-screen keyboard |
| `calendar.test.cjs` | The kanban Calendar at seven sizes: markers per day, agenda, taps, a crowded day |
| `about-editor.test.cjs` | The About editor: Bio limited to paragraphs, bold, italic and links; Quick links column labels (wide and phone); a link to an empty Backstage/Testimonials page hidden on the homepage, with the editor's note |
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
once it has.

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
