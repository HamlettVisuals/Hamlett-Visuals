# Image pipeline audit

Audited 2026-09-27, read-only (no code changed). Next.js 16.3.4, Payload ^3.89.0.

**Main finding:** the live gallery's tiles are rendered bigger than their `sizes`
value says, so the browser downloads a file that's too small and stretches it.
The hero doesn't have this problem. See section 6.

## 1. Payload upload config (`src/collections/Photos.ts`)

- **`imageSizes`:** one, `thumbnail`, 400×400, `fit: "cover"`, centred crop.
  Only used by the admin list cells (`AlbumThumbnailCell`, `CategoryCells`);
  the public site never uses it.
- **`formatOptions` / `resizeOptions`:** not set; the thumbnail uses
  Payload/sharp defaults.
- **Before-save hook (`src/lib/photo-resize.ts`):** if a photo's long edge is
  over 3000px, or it has GPS data, it's turned upright, keeps its colour
  profile, and is resized to fit inside 3000×3000. JPEGs are re-saved with
  mozjpeg at quality 90; WebP and AVIF at 90; PNG stays lossless.
- **Original kept in R2?** Only if the photo was already ≤3000px with no GPS
  data (stored byte for byte). Otherwise the resized file is written over it
  in R2 (same key) and the camera original is gone. Most straight-from-camera
  photos fall in this second group.

## 2. Where images render

Every one of these passes the full stored file (`photo.url`) to `next/image`,
never `sizes.thumbnail`. None uses `unoptimized`.

| Place | File | Frame | `sizes` | quality | layout |
|---|---|---|---|---|---|
| Hero | `components/home/Hero.tsx` | 100vw × ≥88svh | `100vw` | 90 | `fill`, `object-cover`, focal-point `objectPosition` |
| Category tiles | `components/home/CategoryTile.tsx` | `aspect-[9/16]` | `(min-width:1024px) 336px, (min-width:640px) 50vw, 100vw` | 90 (component default) | `fill`, `object-cover` |
| **Gallery (live)** | `components/Gallery/EventRow.tsx` | `aspect-[3/4]`, 280px wide (68vw on phones) | `(max-width:640px) 68vw, 280px` | 90 | `fill`, `object-cover`, centred |
| Gallery grid | `components/Gallery/PhotoGrid.tsx` | `aspect-[3/4]` | `(min-width:1024px) 208px, (min-width:640px) 30vw, 45vw` | 90 | `fill`, `object-cover` |
| Lightbox main | `components/Gallery/CategoryLightbox.tsx` | up to `max-w-5xl` | `90vw` | 95 | `fill`, `object-contain` |
| Lightbox filmstrip | `components/Gallery/CategoryLightbox.tsx` | 52×68 | `52px` | 75 (Next default) | `fill`, `object-cover` |

`PhotoGrid` only shows in the dev-only `?state=sparse` preview. The real
portfolio page uses the `EventRow` horizontal rows (`CategoryGallery.tsx`).

## 3. `next.config.ts` images section

- **`formats`:** `["image/avif", "image/webp"]`, so most browsers get AVIF.
- **`qualities`:** `[75, 90, 95]`.
- **`localPatterns`:** one per upload collection,
  `/hv-studio/api/<slug>/file/**` with `?prefix=<folder>`, plus `/**` with no
  query string.
- **`remotePatterns`:** the R2 hostname from `R2_ENDPOINT` if set, otherwise
  empty. Photos are served through Payload's own file route (a local path), so
  this entry doesn't apply to them. (URL shape taken from the config comment,
  not checked against the live site.)
- **`deviceSizes` / `imageSizes`:** Next defaults —
  `[640, 750, 828, 1080, 1200, 1920, 2048, 3840]` and
  `[32, 48, 64, 96, 128, 256, 384]`.

## 4. Hover bulge

`--zoom-scale: 1.06` over `--zoom-duration: 350ms` (`src/app/globals.css`).
Mouse only (not touch), off under reduced motion.

## 5. Gallery tile aspect ratio

Tiles are **3:4** (0.75). A 4:5 portrait (0.8) is slightly wider, so
`object-cover` crops **about 6% of its width**, ~3% each side, centred; top
and bottom aren't cropped. Category tiles are 9:16, so a 4:5 photo loses about
30% of its width there.

## 6. Every resize or re-compression

1. **Camera → saved file:** over 3000px (or with GPS) is resized and re-saved
   at quality 90. Same for hero and gallery, so not the difference.
2. **Payload's 400×400 thumbnail:** admin only; no effect on the site.
3. **Next image optimizer:** a second lossy copy, usually AVIF at 90 (95 in the
   lightbox). Same for hero and gallery.
4. **Browser `object-cover` stretching beyond what `sizes` requested:** differs
   between hero and gallery.
5. **Hover `scale(1.06)`:** a little more stretching while hovered.

### What most likely makes the gallery look softer

- **`sizes` describes the frame, not the drawn image (main cause).** With
  `object-cover`, the image is drawn at whatever size covers the frame, which
  can be much wider than the frame, but the browser picks a file from `sizes`
  alone. For a 280×373 gallery tile:

  | Photo shape | Drawn width | File chosen (2× screen) | Needed | Upscaled by |
  |---|---|---|---|---|
  | 4:5 portrait | ~299px | 640w | ~598 | none (barely enough) |
  | Square | 373px | 640w | 746 | ~1.17× |
  | 3:2 landscape | 560px | 640w | 1120 | **~1.75×** |

  On a 1× screen a landscape gets the 384w file stretched to 560px. The hover's
  1.06× adds to all of these. Category tiles have the same problem, worse
  because `336px` is below their real width on wide screens (up to ~389px).
  The hero's `100vw` always picks a large enough file.
- **Heavy downscaling (moderate cause).** Even with enough pixels, tiles are
  shrunk ~4.7× (3000 → 640) with no sharpening afterwards, and AVIF at 90 tends
  to smooth grain and fine texture. The hero is shown near 1:1 on desktop, so
  it keeps its micro-contrast.
- **Hover scale (minor):** 6% extra enlargement, only while hovered.
- **Quality setting: not a cause.** Hero and gallery both use 90.
