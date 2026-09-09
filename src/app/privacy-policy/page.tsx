import Link from "next/link";

// Privacy policy page — placeholder content only. Real policy copy comes later.

export const metadata = {
  title: "Privacy Policy — Hamlet Visuals",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Privacy Policy
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Placeholder privacy policy page. No real policy copy yet.
        </p>
      </div>

      <div className="flex flex-col gap-4 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
        <p>
          Placeholder section — what information is collected. Real copy will
          replace this before launch.
        </p>
        <p>
          Placeholder section — how information is used. Real copy will replace
          this before launch.
        </p>
        <p>
          Placeholder section — contact for privacy questions. Real copy will
          replace this before launch.
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
