// The write guard every test runs behind (harness.cjs installs it on each
// browser context). The local dev server uses the LIVE database and the
// studio uploads straight to R2, so a test must never write for real.
//
// Let through:
//   - GET / HEAD / OPTIONS (reads), to any host;
//   - signing in and refreshing the session;
//   - Payload's reads sent as POST (header x-payload-http-method-override: GET);
//   - Payload server functions that only read (form state, rendering).
// Everything else is answered here with a harmless 200 and logged: saves,
// deletes, reorders, a PUT to R2, an unknown server function (aborted).
// A test that wants a write to look a certain way (a refusal, a real-looking
// saved document) adds its own page.route() for it, which runs first and
// can answer it; anything it doesn't answer falls through to this guard.
const READ_ONLY_SERVER_FNS = new Set([
  "form-state",
  "render-document",
  "render-list",
  "table-state",
  "render-field",
  "render-document-slots",
  "get-default-layout",
  "render-widget",
  "get-folder-results-component-and-data",
  "render-dashboard",
]);
const ALLOW = [/\/api\/users\/login(\?|$)/, /\/api\/users\/refresh-token/, /\/api\/users\/me(\?|$)/];

function createGuard(base = "http://localhost:3000") {
  const log = [];
  async function install(ctx) {
    await ctx.route("**/*", async (route) => {
      const req = route.request();
      const method = req.method();
      const url = req.url();
      const local = url.startsWith(`${base}/`);
      if (["GET", "HEAD", "OPTIONS"].includes(method)) return route.continue();
      if (local && ALLOW.some((r) => r.test(url))) {
        log.push({ kind: "pass", method, url });
        return route.continue();
      }
      if (local && (await req.headerValue("x-payload-http-method-override")) === "GET") return route.continue();
      if (local && (await req.headerValue("next-action"))) {
        let name = "?";
        try {
          const body = JSON.parse(req.postData() || "[]");
          name = (Array.isArray(body) ? body[0] : body)?.name ?? "?";
        } catch {}
        if (READ_ONLY_SERVER_FNS.has(name)) return route.continue();
        log.push({ kind: "faked-action", method, url, name });
        return route.abort();
      }
      log.push({ kind: "faked", method, url, body: req.postData()?.slice(0, 500) ?? null });
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ doc: {}, docs: [], message: "faked" }) });
    });
  }
  // The log as text lines ("FAKED POST <url>"), for tests that match on it.
  const lines = () => log.map((e) => `${e.kind === "pass" ? "PASS" : "FAKED"} ${e.method} ${e.url}${e.name ? ` (${e.name})` : ""}`);
  // Writes that were attempted (faked), leaving out the harmless ones:
  // saved admin preferences and Payload's document access checks.
  const writes = (ignore = /payload-preferences|\/access\//) => log.filter((e) => e.kind !== "pass" && !ignore.test(e.url));
  return { install, log, lines, writes };
}

module.exports = { createGuard };
