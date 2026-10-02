// Testimonial quotes are shown inside the site's own curly quotes
// (/testimonials and the homepage Testimonials Section), so any she pasted
// in are dropped. Double quotes always; single quotes only when they wrap
// the whole quote, so a closing possessive ("…at the Joneses’") survives.
export function trimQuoteMarks(quote: string): string {
  let text = quote.trim().replace(/^["“”„‟«»]+|["“”„‟«»]+$/g, "").trim();
  if (/^['‘’‛]/.test(text) && /['‘’]$/.test(text)) text = text.slice(1, -1).trim();
  return text;
}
