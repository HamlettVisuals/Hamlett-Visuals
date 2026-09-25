# Collection Live Preview: showing unsaved edits

Status: **built for Categories, Albums and Packages** (lib/use-scoped-collection-live-preview.ts).
Categories: Categories.ts livePreview.url, components/home/CategoryTile.tsx —
the homepage tile follows name, blurb and cover photo. Albums (`events`):
Events.ts livePreview.url, components/Gallery/LiveEventRow.tsx — the album's
row on its category page follows title, description and date; it falls back
to the top of the album list (`#albums`) when the row isn't there, and to the
homepage's categories when the category is hidden. Packages (`pricing-rows`):
PricingRows.ts livePreview.url, components/home/Offers.tsx — the package's row
in Offers & pricing (and the "Popular right now" card, when it's the featured
one) follows title, price prefix, price, summary and features, with its
details opened; it falls back to the section (`#offers`) when the row isn't
there. Add it per collection as
each page comes up in the cleanup.

## Why collections only refresh on save today

Globals update Live Preview on every keystroke via `useScopedLivePreview`
(`src/lib/use-scoped-live-preview.ts`), which ignores messages for other
globals by checking `event.data.globalSlug`.

Collections can't be filtered that way. Payload's live-preview message
carries the `collectionSlug` and the form values, but **not the document
id**, and a page often renders many documents from one collection at once
(every Pricing Row, every Testimonial…). If each rendered item listened, editing
one row would overwrite all of them. So collections are listed in
`admin.livePreview.collections` (in `payload.config.ts`) without any
per-item listener, and `LivePreviewRefresh` refreshes the page on save.

With drafts off, Save is live immediately — so today there is no way to see
a collection edit anywhere before it's public.

## Agreed approach: ID-scoped preview

1. **Put the document id in the preview URL.** Each collection's
   `admin.livePreview.url` receives the document's data, so it can add e.g.
   `?lpDoc=<id>` and also point at the right page (an Event →
   `/portfolio/<category-slug>`).
2. **Add a collection version of the scoped hook** (e.g.
   `useScopedCollectionLivePreview({ collectionSlug, id, initialData })`):
   same as the global hook, but it applies a message only when
   `event.data.collectionSlug` matches *and* the URL's `lpDoc` equals this
   item's id. Every other item keeps its server data.
3. **Wrap each rendered item** in a small client component using that hook —
   pricing cards, testimonial cards, Backstage tiles, event rows, category
   tiles and hero slides. Several of these are server components today, so
   each list needs a client child per item.

Suggested start: Pricing Rows and Testimonials (mostly text fields).

## Limits and tradeoffs

- **Server-side filtering/sorting/grouping doesn't re-run.** Changing
  `published`, `order` or `category` won't move, hide or show the item in the
  preview until saved. An unpublished item, or a brand-new unsaved one, won't
  appear at all without extra work (e.g. render the `lpDoc` item even if it
  would normally be filtered out). Tell her which fields only show after
  saving.
- **Clicking a link inside the preview drops `?lpDoc`**, so the preview stops
  following edits and falls back to saved data (safe, but confusing).
- **Slightly more client JS on public pages** (per-item client wrappers). The
  message listener only does anything inside the admin's preview iframe.
- **Latency:** each change runs `mergeData`, which fetches populated
  relationships — expect the same ~1–3 s lag the globals show on the dev
  server.
- **Alternative (not chosen):** re-enable `versions.drafts` on collections for
  a true "not public yet" state, including new/unpublished items. Costs a
  schema migration, reverses the top-bar simplification in `f407a48`, and
  brings back Save Draft / Publish.
