# Portfolio editor, Build 2: album photo editing

Handoff for a new session. Build 1 (the combined Categories & Albums page)
is done and pushed; this is what's left, what's decided, and what to know.

## Where things stand

Build 1 commits (all on `main`):

| Commit | What |
|---|---|
| `5f95387` | Manual album and photo order: `albumOrder` on Albums and Photos, migration `20260930_003958_album_and_photo_order` (already run on the live database), site and admin follow the order |
| `cd3fd3b` | The Categories & Albums page (`/hv-studio/portfolio`, `components/admin/Portfolio`), sidebar and Editor overview entry, list URLs redirect there |
| `14dcc32` | Drag to reorder categories and albums (handle; mouse, press-and-hold on touch, keyboard) |
| `3bb789b` | One Trash tab for deleted categories and albums (`/hv-studio/portfolio/trash`) |
| (after) | Drags no longer create History versions; this plan doc |

Key files: `src/lib/manual-order.ts` (sorting and key helpers),
`src/lib/reorder-within.ts` (saving a drag), `src/collections/Events.ts`
and `Photos.ts` (order hooks, `/reorder-albums` endpoint),
`src/collections/Categories.ts` (`/reorder-categories` endpoint),
`src/components/admin/Portfolio/*`, `src/components/admin/GroupedList.tsx`
(kept for the photo picker), `src/components/admin/CategoryPrefill.tsx`.

## How ordering works (read before touching it)

- `albumOrder` is a fractional-index key (Payload's own
  `generateKeyBetween` / `generateNKeysBetween` from `payload/shared`).
  Albums: order within their category. Photos: order within their album.
- Always sort albums and photos **in code** with `compareAlbums` /
  `comparePhotos` (lib/manual-order.ts), never with a database `sort`: items
  with no key need the placement below, which a database sort can't give.
  (Collation is not a problem: Payload 3.89's generator only makes keys
  from 0-9 and a-z, e.g. the key before `a0` is `9z`, and the database's
  `en_US.UTF-8` collation orders those exactly like character codes.
  Checked against the live database with ~5,800 generated keys. Only an
  uppercase key, from an older Payload, would sort wrong; there are none.)
- An album with no key (created by older code) counts as newest: top of its
  category. A photo with no key goes to the end of its album. Either gets a
  real key the next time it's saved.
- New albums, and albums moved to another category, go to the **top**.
  Photos added to an album (uploaded or moved in) go to the **end**.
- Keys only change through a drag: the hooks keep the saved key on every
  other save (History restore, Undo, normal edits) unless
  `context.allowOrderChange` is set.
- A drag writes only the key, straight to the database
  (`payload.db.updateOne`): no History version, no hooks; the site is
  refreshed explicitly (`revalidateSite`). Categories are always renumbered
  `a0, a1, …` on a drag so their keys stay safe for the database sort, and
  "Other" must stay last (the endpoint refuses otherwise).
- The first photo in her order **is the album's cover** everywhere (admin
  thumbnails, the album's row on the site). There is no separate cover field.

## Decisions already made

- Photos belong to at most one album (`photos.event`, single relationship).
  It stays optional: site photos (category covers and heroes, homepage, logo)
  live in the same collection with no album. In the UI these are "Not in an
  album".
- New albums start **Hidden** (set as the new-album form's starting value,
  not the database default: no migration).
- Upload fills in alt text automatically: "Photo from <album title>",
  editable later.
- "Set as cover" moves that photo to the first position (a reorder), nothing
  else.
- Uploading before the album exists: **"Save & upload"**. On a new album the
  upload button saves the album first (title and category needed; category is
  usually pre-filled), then uploads into it.
- No join field on Categories (it would be populated on every public-site
  read).
- No new database changes are planned for Build 2. If one turns out to be
  needed: back up first (see Environment), show the SQL, wait for approval.

## Build 2 commits

Status: 5 to 8 built and tested with every write faked (`96efadd` grid,
`cb8df9e` uploads, `228094e` add existing photos, `60872a9` Live Preview
and wrap-up), then one real end-to-end test on 2026-09-30 (backup first:
`hamlet-visuals-public-2026-09-30-17-41-before-e2e.dump`). A Hidden album
in Test, "Save & upload" of 3 camera JPEGs (13.8, 14.0, 18.9MB) and a
0.5MB phone photo, reorder, cover, Live and back, then the album and its
photos deleted permanently. All checks passed; the database, R2 and the
public Test page (local and live) ended exactly as before.

Upload timings (local dev server, this network), per file:

| File | Size | Link | To R2 | Save (read back, resize, thumbnail) | Total |
|---|---|---|---|---|---|
| D80A5928.JPG | 13.8MB | 0.4s | 2.1s | 6.5s | 9.0s |
| YEE09327.jpg | 14.0MB | 0.2s | 2.4s | 5.5s | 8.2s |
| YEE09379.jpg | 18.9MB | 0.2s | 3.2s | 6.6s | 10.0s |
| IMG_3220.JPG | 0.5MB | 0.2s | 0.4s | 3.0s | 3.6s |

About 9s per camera photo one at a time, so a 300-photo album is roughly
45 minutes with the page open. The save is two-thirds of it; on Vercel
the server reads the file back from R2 inside the cloud, so it should be
faster there (measure on a preview). Ways to speed it up if needed:
upload the next file to R2 while the current one saves (no ordering
risk), or shrink photos in the browser before uploading.

Found on the way: each upload leaves two identical History rows, from the
storage plugin saving the photo again after storing its thumbnail. Older
photos uploaded through Payload's own form have the same, so it isn't new.

Each commit: Playwright tests with **all writes and uploads faked** (the
local dev server uses the live database; the user signs in), `npm run build`
before committing, don't push.

### 5. Album photo grid

A `ui` field in the album edit form (`collections/Events.ts`), so it sits
inside the form and keeps Live Preview working.

- Grid of the album's photos in her order (`comparePhotos`), first one
  marked **Cover**.
- Drag to reorder: same handle and sensors as Categories & Albums
  (MouseSensor distance 5, TouchSensor delay 250 / tolerance 5, keyboard).
  Save through a `/reorder-photos` endpoint on Photos using
  `reorderWithin({ target: { collection: "photos", field: "albumOrder",
  scope: { field: "event", id } } })`.
- Per-photo menu: **Set as album cover** (move to first, same endpoint),
  **Edit photo details** (the photo's own edit page or a drawer),
  **Remove from album** (sets `event` to null; the photo stays, shown as "Not
  in an album"; its order clears via the Photos hook), **Delete photo…**
  (confirmation; goes to the Photos Trash; warn if the photo is also used as
  a category cover/hero, hero slide, About photo, testimonial or package
  sample).
- Photo actions save immediately ("Photo changes save as you make them"),
  separate from the album's Save. If the grid changes anything the form also
  holds, keep the form's copy in sync without marking it changed (see
  CategoryPrefill.tsx: dispatch `UPDATE` with the same `initialValue`,
  deferred past mount).
- Tidy-up from Build 1: when an album is permanently deleted, the database
  sets its photos' `event` to null but leaves their `albumOrder`. Clear it
  (an `afterDelete` hook on Events, or when the photo is next saved).

### 6. Upload photos

- "Upload photos" (multiple, with a progress bar per file) and drag-and-drop
  onto the grid.
- Direct to R2 like the rest of the studio: ask the storage plugin's signed
  upload link endpoint (see `@payloadcms/storage-s3` `S3ClientUploadHandler`),
  PUT the file with XHR for progress, then create the photo with `event` set
  to this album and alt text filled in. Match the request Payload's own form
  sends for client uploads (`clientUploadContext`); check it against
  Payload's upload form code before building. Fallback if that fights:
  Payload's bulk-upload drawer (`useBulkUpload`, `setInitialForms` with the
  album filled in), which has no per-file progress.
- New albums: the button reads **Save & upload photos** and saves the album
  first.
- New albums start Hidden (form starting value).
- The server-side size cap and resizing (`resizeLargePhotos`) still apply.

### 7. Add existing photos

- A drawer grouped category → album → photos (reuse `GroupedList`), plus a
  "Not in an album" group. This album's own photos are shown but not
  selectable.
- Picking a photo from another album **moves** it here: say so on that
  album's heading ("Picking moves them here") and in the footer ("2 will move
  out of 'Vacation Test'"). Moved photos go to the end (Photos hook).

### 8. Live Preview and wrap-up

- After each photo change, refresh the Live Preview frame so it shows the new
  order, cover, uploads and removals (the category page reads photos from the
  server). Confirm the trigger works; at worst it updates on the preview's
  next refresh.
- Add launch-checklist entries: drop `photos.category` (hidden, unused) and
  `events.sort_date` (no longer used for order), both via migrations with a
  backup first.

## After Build 2: the Photos page retired (2026-09-30)

Photos have no page of their own any more. They're added in albums
(upload or "Add existing photos"), or straight from a photo field (a
category's cover or page photo, hero slides, About, a testimonial, Site
Settings: each has Create New, Choose from existing, and drag and drop).

- The sidebar and Editor overview no longer list Photos; the Photos list
  and Trash URLs redirect to Categories & Albums and its Trash tab
  (src/proxy.ts). A photo's own page (`/collections/photos/<id>`, with its
  History tab) still opens; its ✕ and breadcrumbs lead to its album, or to
  Unused photos if it's in none (components/admin/PhotoNav.tsx).
- "Where is this photo used" is one check, found from the config
  (lib/photo-usage.ts): every photo field in any collection or global,
  rich text included, trashed documents and retired hidden fields
  counted. It drives the delete warnings and "unused".
- Unused photos (bottom of Categories & Albums): in no album and used
  nowhere, worked out on each visit. Search, sort, pick, Move to Trash
  (each re-checked first).
- The Trash tab has a third section, Deleted photos, with a warning on
  Delete permanently if the photo is still used somewhere.
- Publishing a testimonial no longer puts its photo in an album.

## Mockups

Made during planning (in the old session's scratchpad, may be gone): album
page with the photo grid (upload progress tiles, Cover badge, per-photo
menu) and the "Add existing photos" picker. Layout: the album's fields on
the left, the Photos panel under Category/Date with "Add existing photos"
and "Upload photos" buttons, a drop zone, then the grid; Live Preview on the
right.

## Known issues and follow-ups

- Resolved, no change needed: Payload's own drag on Packages and Backstage
  (`orderable: true`, sorted by `_order` in the database) and new categories
  slotted above "Other" were thought to risk uppercase keys that the
  database sorts wrong. Payload 3.89's generator never makes them (see "How
  ordering works"), and every live key (categories, packages, backstage,
  including the Trash) is lowercase and sorts the same in the database as
  in code. Worth rechecking only if Payload's generator changes.
- Albums created on the live site by the pre-Build-1 code had no order key;
  they sort at the top of their category and get a key when next saved or
  dragged.
- `photos.category` is set on album photos but nothing reads it; to be
  dropped later (launch checklist). It isn't actually hidden: it still
  shows on the photo form and in the Photos list.
- `events.sort_date` is no longer used for album order; to be dropped once
  its last two readers move (launch checklist).

### Mobile follow-ups

- Every studio page scrolls about 15px sideways on phones. It's Payload's
  own side menu: its header (`.nav__header`) is as wide as the screen plus
  a few pixels, even while the menu is closed. Not caused by any of our
  pages; found while testing the album photo grid at 390px.

## Environment notes

- The local dev server uses the **live** database. Never run write actions
  in testing; fake them (Playwright route interception). Payload sends some
  reads as POST with header `x-payload-http-method-override: GET` (e.g. the
  category dropdown's labels); those are reads and can pass through.
- **Backups**: `pg_dump` 17.6 client tools are in `C:\Users\Jake\tools\pgsql17`
  (not on PATH). Supabase's direct connection is IPv6-only and unreachable
  from this network; use the **session pooler**, same host as
  `DATABASE_URI` but port **5432**, password through `PGPASSWORD`. Dump only
  the `public` schema (`--format=custom --schema=public`); Payload keeps
  everything there. Backups go in `C:\Users\Jake\hv-backups` (outside the
  project and outside OneDrive; they contain client data, never commit
  them). Last backup: `hamlet-visuals-public-2026-09-30-00-40.dump`, taken
  before the Build 1 migration.
- Migrations: generated files import `MigrateUpArgs` / `MigrateDownArgs`
  without `type`, which Node's type stripping refuses at load time; change
  them to `type` imports before running.
- Vercel's build runs `payload migrate`; run migrations yourself first, after
  a backup and approval, so the deploy finds nothing pending.
- The project was in OneDrive, which kept locking files in `.next` (builds
  failed with EPERM until `.next` was deleted). It's being moved out.
