"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { heroImages } from "@/lib/site-content";

// Placeholder hero with a rotating image array. Structure only — the crossfade,
// real images, and styling come with the design pass.
export default function Hero() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (heroImages.length <= 1) return;
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % heroImages.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section id="top" className="mx-auto max-w-4xl px-6 py-24">
      <div className="flex h-56 items-center justify-center rounded-md bg-zinc-200 text-sm text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={heroImages[index]}
          alt=""
          className="max-h-24"
        />
      </div>
      <h1 className="mt-8 text-4xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
        Hamlet Visuals
      </h1>
      <p className="mt-2 text-lg text-zinc-600 dark:text-zinc-400">
        Placeholder subhead — a short line about the photography.
      </p>
      <p className="mt-6">
        <Link href="/booking" className="underline">
          Book a session
        </Link>
      </p>
    </section>
  );
}
