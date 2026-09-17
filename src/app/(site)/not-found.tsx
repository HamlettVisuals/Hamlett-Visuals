import Link from "next/link";

// Custom 404 — rendered inside the root layout's <main> (src/app/layout.tsx),
// so it already gets the shared <Nav /> / <Footer /> shell for free. Centered,
// minimal, no illustration: just the headline, one line of body copy, and the
// two ways back into the site.

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-gutter py-section text-center">
      <h1 className="font-display text-page text-ink">Page not found</h1>

      <p className="mt-4 max-w-measure text-body text-accent-text">
        That page doesn&rsquo;t exist, or may have moved.
      </p>

      <div className="mt-10 flex flex-col items-center gap-5">
        <Link href="/" className="btn">
          Back to home
        </Link>
        <Link href="/#categories" className="link text-ink">
          View the gallery
        </Link>
      </div>
    </div>
  );
}
