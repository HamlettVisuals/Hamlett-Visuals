// The "Something else" sentinel BookingForm's session-type select uses —
// outside any real Category slug on purpose, so it can never collide with
// one. Lives in its own plain module (no "use client") rather than inside
// BookingForm.tsx itself: booking/page.tsx (a Server Component) needs this
// same value to look up the fallback Category by slug, and importing a
// value from a "use client" file into a Server Component doesn't reliably
// carry the real value across — Next's RSC bundling treats the whole
// module as a client boundary and the import resolved to `undefined` in
// page.tsx (confirmed via curl against the rendered flight payload), even
// though the constant worked fine inside BookingForm's own client bundle.
export const OTHER_SESSION_TYPE = "other";
