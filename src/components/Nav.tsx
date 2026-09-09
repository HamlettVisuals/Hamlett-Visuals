import Link from "next/link";

// Single-page site: most nav items are anchors into the homepage sections;
// booking and testimonials are their own routed pages. Plain placeholder markup.
const links = [
  { href: "/#categories", label: "Portfolio" },
  { href: "/#about", label: "About" },
  { href: "/#offers", label: "Pricing" },
  { href: "/#instagram", label: "Instagram" },
  { href: "/testimonials", label: "Testimonials" },
  { href: "/booking", label: "Book" },
];

export default function Nav() {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-4xl items-center justify-between px-6 py-4">
        <Link href="/" className="font-semibold tracking-tight">
          Hamlet Visuals
        </Link>
        <ul className="flex flex-wrap gap-4 text-sm">
          {links.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                className="text-zinc-600 transition-colors hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
