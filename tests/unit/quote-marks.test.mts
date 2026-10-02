// The quote-mark trim used before a testimonial is wrapped in the site's own
// curly quotes (lib/quote-marks.ts), offline (`npm run test:unit`).
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { trimQuoteMarks } = await import(pathToFileURL(path.join(ROOT, "src", "lib", "quote-marks.ts")).href);

test("drops straight and curly double quotes around the quote", () => {
  assert.equal(trimQuoteMarks('"Lovely day."'), "Lovely day.");
  assert.equal(trimQuoteMarks("“Lovely day.”"), "Lovely day.");
  assert.equal(trimQuoteMarks('  ""Lovely day.""  '), "Lovely day.");
});

test("drops single quotes only when they wrap the whole quote", () => {
  assert.equal(trimQuoteMarks("'Lovely day.'"), "Lovely day.");
  assert.equal(trimQuoteMarks("‘Lovely day.’"), "Lovely day.");
  assert.equal(trimQuoteMarks("We loved the Joneses’"), "We loved the Joneses’");
});

test("leaves quote marks inside the text alone", () => {
  assert.equal(trimQuoteMarks('She said "smile" and we did.'), 'She said "smile" and we did.');
  assert.equal(trimQuoteMarks("Didn’t want it to end."), "Didn’t want it to end.");
});
