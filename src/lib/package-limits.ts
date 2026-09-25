// Limits for Packages (src/collections/PricingRows.ts), enforced on save by
// the field config and shown in the editor by the live counters.
//
// Measured on the real Offers & pricing row (components/home/Offers.tsx) at
// a 320px phone — the narrowest supported — and at 390px. The row is 261px
// wide at 320 (329 at 390), and the title shares its line with the price,
// which never wraps:
//   - TITLE_MAX: beside a typical "From $2,800" (70px), realistic titles
//     take two lines at 320 from about 20 characters ("Wedding Day
//     Coverage"), so one line isn't realistic on phones. 28 ("Family
//     Portrait Mini Session") stays at two; 29 reaches three. At 390 every
//     title up to 37 fits in two. (The spotlight's larger title wraps too.)
//   - PRICE_MAX: "$2,800" is 70px, "$450/hr" 78px, "Custom quote" 132px;
//     past that the price squeezes the title to three lines or more.
//   - PRICE_PREFIX_MAX: the small word above the price. "Starting from" (13)
//     is 80px, about a price's width; longer prefixes widen the column.
//   - SUMMARY_MAX: 100 characters fill three lines at both widths; at 320,
//     110 reaches four.
//   - FEATURE_MAX: each feature is a ticked line behind "Show details". At
//     320, 30 characters fit one line and 60 fit two; 70 reaches three.
//   - FEATURES_MAX: at up to two lines each, 8 features is a full screen of
//     list on a phone once opened — enough for a real package; more reads
//     as fine print.
// Recheck if the row's fonts, the price size or the page gutters change.
export const TITLE_MAX = 28;
export const PRICE_PREFIX_MAX = 13;
export const PRICE_MAX = 12;
export const SUMMARY_MAX = 100;
export const FEATURES_MAX = 8;
export const FEATURE_MAX = 60;
// How many of the album's photos the Popular right now card shows.
export const SAMPLE_PHOTOS = 3;
