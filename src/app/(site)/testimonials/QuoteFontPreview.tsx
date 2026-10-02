import { QUOTE_CLASS, QUOTE_FONTS, quoteFontLabel, quoteFontProps, type QuoteFontKey } from "@/lib/quote-fonts";

// Dev-only preview of every quote font in lib/quote-fonts.ts, shown at the
// top of /testimonials with ?fontPreview=1 (page.tsx only renders it in
// development). Same quote, size, line-height and column width as the real
// cards, so the fonts compare fairly. Rendering every font here downloads
// them all; the live page only downloads the selected one.
export default function QuoteFontPreview({
  quote,
  clientName,
  context,
  current,
}: {
  quote: string;
  clientName: string;
  context: string;
  current: QuoteFontKey;
}) {
  const keys = Object.keys(QUOTE_FONTS) as QuoteFontKey[];

  return (
    <section className="mt-10 border border-dashed border-accent p-5">
      <p className="text-caption text-muted">
        Quote fonts (dev only). Switch in the admin: Testimonials, Page settings (this page) or the Testimonials Section (homepage).
      </p>
      <ul className="mt-4 flex flex-col">
        {keys.map((key) => {
          const { weight, style } = QUOTE_FONTS[key];
          const label = quoteFontLabel(key);
          const { className, style: css } = quoteFontProps(key);
          return (
            <li key={key} className="border-t border-hairline py-8 first:border-t-0 first:pt-2">
              <p className="text-caption text-muted">
                {label} <code>{key}</code>, {style} {weight}
                {css.fontVariationSettings ? `, ${css.fontVariationSettings}` : ""}
                {key === current ? " (in use on this page)" : ""}
              </p>
              {/* A real card's grid with the photo column left empty, so the
                  quote column is the same width. */}
              <div className="mt-4 grid gap-5 sm:grid-cols-[200px_1fr] sm:gap-8">
                <div aria-hidden="true" className="hidden border border-dashed border-hairline sm:block" />
                <figure className="min-w-0">
                  <blockquote className={`${className} ${QUOTE_CLASS}`} style={css}>
                    &ldquo;{quote}&rdquo;
                  </blockquote>
                  <figcaption className="mt-4 text-caption">
                    <span className="text-ink">{clientName}</span>
                    <span className="mt-0.5 block text-muted">{context}</span>
                  </figcaption>
                </figure>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
