import Link from "next/link";

// Backstage page — structure/routing only. Reels and behind-the-scenes clips
// come later; this is a placeholder shell matching the other sub-pages
// (/booking, /testimonials, /privacy-policy).

export const metadata = {
  title: "Backstage — Hamlett Visuals",
};

export default function BackstagePage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Backstage
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Placeholder backstage page. Reels and behind-the-scenes clips will
          live here.
        </p>
      </div>

      <div className="flex flex-col gap-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <p>
          Placeholder section — short reels from recent shoots. Real clips will
          replace this before launch.
        </p>
        <p>
          Placeholder section — behind-the-scenes stills and notes from set.
          Real content will replace this before launch.
        </p>
      </div>

      <p>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
