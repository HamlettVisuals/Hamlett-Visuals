import Link from "next/link";

// Booking page — structure/routing only. No real booking logic, form handling,
// or calendar integration yet; that comes later.

export const metadata = {
  title: "Book a session — Hamlett Visuals",
};

export default function BookingPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Book a session
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Placeholder booking page. The booking flow is not built yet.
        </p>
      </div>

      <ol className="flex flex-col gap-3 text-sm text-zinc-600 dark:text-zinc-400">
        <li>1. Choose a category / offer (placeholder)</li>
        <li>2. Pick a date (placeholder)</li>
        <li>3. Your details (placeholder)</li>
        <li>4. Confirm (placeholder)</li>
      </ol>

      <p>
        <Link href="/#offers" className="underline">
          Back to offers &amp; pricing
        </Link>
      </p>
    </div>
  );
}
