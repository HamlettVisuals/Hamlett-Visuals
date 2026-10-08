// The Privacy Policy and Terms pages' rules (lib/legal-pages.ts), offline
// (`npm run test:unit`): "Last updated" moves to today when the text
// changes, unless she set the date herself in the same save; a body counts
// as empty until it has words; the footer leaves out an empty page's link.
// No database, no sign-in.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const { stampLastUpdated, todayAsDayOnly, hasText, formatLastUpdated, emptyLegalPages } = await import(
  pathToFileURL(path.join(ROOT, "src", "lib", "legal-pages.ts")).href
);

const body = (...texts: string[]) => ({
  root: {
    type: "root",
    children: texts.map((text) => ({ type: "paragraph", children: text ? [{ type: "text", text }] : [] })),
  },
});

// 2026-10-09 01:30 UTC is still October 8 in New York.
const NOW = new Date("2026-10-09T01:30:00.000Z");
const TODAY = "2026-10-08T12:00:00.000Z";
const BEFORE = "2026-09-15T12:00:00.000Z";

test("today is her day, stored at 12:00 UTC", () => {
  assert.equal(todayAsDayOnly(NOW), TODAY);
  assert.equal(todayAsDayOnly(new Date("2026-10-08T15:00:00.000Z")), TODAY);
});

test("text changed, date untouched: date becomes today", () => {
  const saved = { title: "Terms", body: body("Old"), lastUpdated: BEFORE };
  const out = stampLastUpdated({ ...saved, body: body("New") }, saved, NOW);
  assert.equal(out.lastUpdated, TODAY);
  assert.deepEqual(out.body, body("New"));
});

test("first text on a page with no date yet: date becomes today", () => {
  const saved = { title: "Terms", body: null, lastUpdated: null };
  assert.equal(stampLastUpdated({ ...saved, body: body("Hello") }, saved, NOW).lastUpdated, TODAY);
});

test("text changed and date changed by her: her date is kept", () => {
  const saved = { body: body("Old"), lastUpdated: BEFORE };
  const mine = "2026-01-01T12:00:00.000Z";
  assert.equal(stampLastUpdated({ body: body("New"), lastUpdated: mine }, saved, NOW).lastUpdated, mine);
});

test("she cleared the date while changing the text: left empty", () => {
  const saved = { body: body("Old"), lastUpdated: BEFORE };
  assert.equal(stampLastUpdated({ body: body("New"), lastUpdated: null }, saved, NOW).lastUpdated, null);
});

test("only the date changed: her date is kept", () => {
  const saved = { body: body("Same"), lastUpdated: BEFORE };
  const mine = "2026-02-02T12:00:00.000Z";
  assert.equal(stampLastUpdated({ body: body("Same"), lastUpdated: mine }, saved, NOW).lastUpdated, mine);
});

test("nothing in the text changed (title only): date unchanged", () => {
  const saved = { title: "Terms", body: body("Same"), lastUpdated: BEFORE };
  assert.equal(stampLastUpdated({ ...saved, title: "Our terms" }, saved, NOW).lastUpdated, BEFORE);
});

test("same text with its keys in another order: not a change", () => {
  const saved = { body: { root: { type: "root", children: [{ type: "paragraph", children: [{ type: "text", text: "A" }] }] } }, lastUpdated: BEFORE };
  const reordered = { root: { children: [{ children: [{ text: "A", type: "text" }], type: "paragraph" }], type: "root" } };
  assert.equal(stampLastUpdated({ body: reordered, lastUpdated: BEFORE }, saved, NOW).lastUpdated, BEFORE);
});

test("same day sent back with another time: not her change, so the text change still stamps today", () => {
  const saved = { body: body("Old"), lastUpdated: BEFORE };
  const out = stampLastUpdated({ body: body("New"), lastUpdated: "2026-09-15T04:00:00.000Z" }, saved, NOW);
  assert.equal(out.lastUpdated, TODAY);
});

test("a save without the body leaves the date alone", () => {
  const saved = { title: "Terms", body: body("Old"), lastUpdated: BEFORE };
  assert.deepEqual(stampLastUpdated({ title: "New title" }, saved, NOW), { title: "New title" });
});

test("hasText: words count, empty paragraphs and spaces don't", () => {
  assert.equal(hasText(null), false);
  assert.equal(hasText(body("")), false);
  assert.equal(hasText(body("", "   ")), false);
  assert.equal(hasText(body("", "Hi")), true);
  const nested = { root: { children: [{ type: "list", children: [{ type: "listitem", children: [{ type: "text", text: "x" }] }] }] } };
  assert.equal(hasText(nested), true);
});

test("formatLastUpdated: Month D, YYYY in every time zone", () => {
  assert.equal(formatLastUpdated(TODAY), "October 8, 2026");
  assert.equal(formatLastUpdated(null), null);
  assert.equal(formatLastUpdated("nonsense"), null);
});

test("emptyLegalPages: an empty page's href, a written one left out", async () => {
  const docs: Record<string, unknown> = { "privacy-policy": { body: body("") }, terms: { body: body("Hi") } };
  const payload = { findGlobal: async ({ slug }: { slug: string }) => docs[slug] };
  assert.deepEqual(await emptyLegalPages(payload as never), ["/privacy-policy"]);
  docs["privacy-policy"] = { body: body("Now written") };
  assert.deepEqual(await emptyLegalPages(payload as never), []);
});
