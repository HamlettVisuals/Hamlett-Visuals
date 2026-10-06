// The site's emails, offline (`npm run test:unit`): the sender address
// (lib/email-from.ts), the inquiry emails hook (owner notification and
// client auto-reply, hooks/sendInquiryEmails.ts) when Resend accepts,
// refuses, can't be reached or isn't set up, Payload's Resend adapter (used
// for forgot-password), and payload.config.ts choosing the adapter.
//
// Nothing leaves this machine: fetch is replaced before any project code
// loads, Resend calls get a scripted fake reply, and every other network
// call throws. No database is touched and no sign-in is needed.
import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const src = (p: string) => pathToFileURL(path.join(ROOT, "src", p)).href;

// ---- fake Resend -------------------------------------------------------
type Reply = { status: number; body: unknown } | "network-error";
const calls: { url: string; body: any }[] = [];
let replies: Reply[] = [];
const OK = (id = "email_fake_1"): Reply => ({ status: 200, body: { id } });
const REJECT: Reply = {
  status: 403,
  body: { statusCode: 403, name: "validation_error", message: "You can only send testing emails to your own email address." },
};

globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input instanceof Request ? input.url : input);
  if (!url.startsWith("https://api.resend.com/")) {
    throw new Error(`Test blocked a non-Resend network call: ${url}`);
  }
  calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : null });
  const reply = replies.shift() ?? OK();
  if (reply === "network-error") throw new TypeError("fetch failed (simulated)");
  return new Response(JSON.stringify(reply.body), { status: reply.status, headers: { "content-type": "application/json" } });
}) as typeof fetch;

function stubReq() {
  const logs: { level: string; msg: string }[] = [];
  const log = (level: string) => (a: unknown, b?: string) => logs.push({ level, msg: typeof a === "string" ? a : String(b) });
  return {
    logs,
    req: {
      payload: {
        logger: { info: log("info"), warn: log("warn"), error: log("error") },
        findGlobal: async () => ({ contact: { email: "owner@example.test" } }),
        findByID: async ({ id }: { id: number }) => ({ id, name: "Weddings", slug: "weddings" }),
      },
    },
  };
}

const doc = { id: 4242, type: "booking", name: "Test Client", email: "client@example.test", sourcePage: "/booking", message: "Hello" };

function reset(env: Record<string, string | undefined>) {
  calls.length = 0;
  replies = [];
  for (const [k, v] of Object.entries(env)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

// ---- emailFrom ----------------------------------------------------------
test("emailFrom: fallback, 'Name <addr>', bare address", async () => {
  const { emailFrom } = await import(src("lib/email-from.ts"));
  reset({ RESEND_FROM_ADDRESS: undefined });
  assert.deepEqual(emailFrom(), { name: "Hamlett Visuals", address: "onboarding@resend.dev", formatted: "Hamlett Visuals <onboarding@resend.dev>" });
  reset({ RESEND_FROM_ADDRESS: "Studio <hello@example.com>" });
  assert.deepEqual(emailFrom(), { name: "Studio", address: "hello@example.com", formatted: "Studio <hello@example.com>" });
  reset({ RESEND_FROM_ADDRESS: '"Hamlett Visuals" <hello@example.com>' });
  assert.equal(emailFrom().name, "Hamlett Visuals");
  reset({ RESEND_FROM_ADDRESS: "hello@example.com" });
  assert.deepEqual(emailFrom(), { name: "Hamlett Visuals", address: "hello@example.com", formatted: "Hamlett Visuals <hello@example.com>" });
});

// ---- inquiry emails hook -------------------------------------------------
test("hook: both sends succeed — no errors logged", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: "re_fake_for_tests", RESEND_FROM_ADDRESS: undefined });
  replies = [OK("a"), OK("b")];
  const { req, logs } = stubReq();
  await sendInquiryEmails({ doc, operation: "create", req } as any);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].body.to, "owner@example.test");
  assert.equal(calls[0].body.from, "Hamlett Visuals <onboarding@resend.dev>");
  assert.equal(calls[1].body.to, "client@example.test");
  assert.deepEqual(logs.filter((l) => l.level === "error"), []);
});

test("hook: a booking's session type, time and Instagram are on their own lines; an empty message says so", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: "re_fake_for_tests" });
  replies = [OK("a"), OK("b")];
  const { req } = stubReq();
  const booking = { ...doc, category: 11, preferredTime: "afternoon", instagramHandle: "@testclient", message: "" };
  await sendInquiryEmails({ doc: booking, operation: "create", req } as any);
  const text: string = calls[0].body.text;
  assert.match(text, /^Session type: Weddings$/m);
  assert.match(text, /^Preferred time: Afternoon$/m);
  assert.match(text, /^Instagram: @testclient$/m);
  assert.match(text, /\(No message\.\)/);
});

test("hook: owner email rejected — logged clearly, auto-reply still sent", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: "re_fake_for_tests" });
  replies = [REJECT, OK("b")];
  const { req, logs } = stubReq();
  const result = await sendInquiryEmails({ doc, operation: "create", req } as any);
  assert.equal(result, doc, "the inquiry itself is still saved/returned");
  assert.equal(calls.length, 2, "auto-reply still attempted");
  const errors = logs.filter((l) => l.level === "error").map((l) => l.msg);
  assert.equal(errors.length, 1);
  assert.match(errors[0], /couldn't send the owner notification email for inquiry 4242 — Resend: validation_error: You can only send testing emails/);
});

test("hook: both rejected — two distinct errors", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: "re_fake_for_tests" });
  replies = [REJECT, REJECT];
  const { req, logs } = stubReq();
  await sendInquiryEmails({ doc, operation: "create", req } as any);
  const errors = logs.filter((l) => l.level === "error").map((l) => l.msg);
  assert.equal(errors.length, 2);
  assert.match(errors[0], /owner notification/);
  assert.match(errors[1], /client auto-reply/);
});

test("hook: Resend unreachable — the SDK returns it as { error }; logged, doesn't throw", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: "re_fake_for_tests" });
  replies = ["network-error", "network-error"];
  const { req, logs } = stubReq();
  await sendInquiryEmails({ doc, operation: "create", req } as any);
  const errors = logs.filter((l) => l.level === "error").map((l) => l.msg);
  assert.equal(errors.length, 2);
  assert.ok(
    errors.every((m) => /couldn't send the .* email for inquiry 4242 — Resend: application_error: Unable to fetch data/.test(m)),
    errors.join("\n"),
  );
});

test("hook: no API key — skips without calling Resend", async () => {
  const { sendInquiryEmails } = await import(src("hooks/sendInquiryEmails.ts"));
  reset({ RESEND_API_KEY: undefined });
  const { req, logs } = stubReq();
  await sendInquiryEmails({ doc, operation: "create", req } as any);
  assert.equal(calls.length, 0);
  assert.equal(logs.filter((l) => l.level === "warn").length, 1);
});

// ---- Payload's Resend adapter (forgot-password etc.) --------------------
test("adapter: success returns Resend's id; rejection throws a readable error", async () => {
  const { resendAdapter } = await import(pathToFileURL(path.join(ROOT, "node_modules/@payloadcms/email-resend/dist/index.js")).href);
  const { emailFrom } = await import(src("lib/email-from.ts"));
  reset({ RESEND_FROM_ADDRESS: undefined });
  const adapter = resendAdapter({ apiKey: "re_fake_for_tests", defaultFromAddress: emailFrom().address, defaultFromName: emailFrom().name })({ payload: {} as any });
  replies = [OK("pw_1")];
  const ok = await adapter.sendEmail({ to: "admin@example.test", subject: "Reset your password", html: "<p>x</p>" });
  assert.deepEqual(ok, { id: "pw_1" });
  assert.equal(calls[0].body.from, "Hamlett Visuals <onboarding@resend.dev>");
  replies = [REJECT];
  await assert.rejects(
    adapter.sendEmail({ to: "admin@example.test", subject: "Reset your password", html: "<p>x</p>" }),
    /Error sending email: 403 validation_error - You can only send testing emails/,
  );
});

// ---- payload.config.ts wiring (config only — no DB connection) -----------
test("config: RESEND_API_KEY set → Resend adapter with the shared sender", async () => {
  reset({ RESEND_API_KEY: "re_fake_for_tests", RESEND_FROM_ADDRESS: "Studio <hello@example.com>", PAYLOAD_SECRET: "test-secret" });
  const config = await (await import(src("payload.config.ts") + "?withKey")).default;
  assert.equal(typeof config.email, "function");
  const adapter = config.email({ payload: {} });
  assert.equal(adapter.name, "resend-rest");
  assert.equal(adapter.defaultFromAddress, "hello@example.com");
  assert.equal(adapter.defaultFromName, "Studio");
});

test("config: no RESEND_API_KEY → no adapter (Payload's console fallback)", async () => {
  reset({ RESEND_API_KEY: undefined, PAYLOAD_SECRET: "test-secret" });
  const config = await (await import(src("payload.config.ts") + "?noKey")).default;
  assert.equal(config.email, undefined);
});
