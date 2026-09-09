import Link from "next/link";

// Testimonials page — placeholder content only.

export const metadata = {
  title: "Testimonials — Hamlet Visuals",
};

const testimonials = [
  { quote: "Placeholder testimonial quote one.", author: "Client A" },
  { quote: "Placeholder testimonial quote two.", author: "Client B" },
  { quote: "Placeholder testimonial quote three.", author: "Client C" },
  { quote: "Placeholder testimonial quote four.", author: "Client D" },
];

export default function TestimonialsPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-1 flex-col gap-8 px-6 py-16">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
          Testimonials
        </h1>
        <p className="mt-2 text-sm text-zinc-500 dark:text-zinc-400">
          Placeholder testimonials page.
        </p>
      </div>

      <div className="flex flex-col gap-6">
        {testimonials.map((testimonial) => (
          <blockquote
            key={testimonial.author}
            className="border-l-2 border-zinc-300 pl-4 text-zinc-600 dark:border-zinc-700 dark:text-zinc-400"
          >
            <p>&ldquo;{testimonial.quote}&rdquo;</p>
            <footer className="mt-1 text-sm text-zinc-500 dark:text-zinc-500">
              — {testimonial.author}
            </footer>
          </blockquote>
        ))}
      </div>

      <p>
        <Link href="/" className="underline">
          Back to home
        </Link>
      </p>
    </div>
  );
}
