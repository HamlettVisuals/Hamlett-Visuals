// Shared setup for the end-to-end tests (see ../README.md).
//
//   const { launchBrowser, newContext, report, ADMIN, API } = require("./lib/harness.cjs");
//   const r = report("album-grid");
//   const browser = await launchBrowser();
//   const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
//   ...
//   r.check("grid shows every photo", ok, detail);
//   await browser.close();
//   r.finish(); // prints the results and exits 1 if anything failed
//
// Every context comes signed in (the session saved by `npm run
// test:e2e:login`) and behind the write guard (guard.cjs): nothing a test
// does reaches the database or R2 unless the test itself answers it.
const fs = require("fs");
const path = require("path");
const playwright = require("playwright");
const { createGuard } = require("./guard.cjs");

const E2E = path.resolve(__dirname, "..");
const ROOT = path.resolve(E2E, "..", "..");
const AUTH = path.join(E2E, ".auth", "state.json");
const OUT = path.join(E2E, ".output");
const BASE = (process.env.E2E_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const ADMIN = `${BASE}/hv-studio`;
const API = `${ADMIN}/api`;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function authState() {
  if (!fs.existsSync(AUTH)) {
    console.error("Not signed in. Run `npm run test:e2e:login` once and sign in (see tests/e2e/README.md).");
    process.exit(2);
  }
  return AUTH;
}

/**
 * A browser: headless unless HEADED=1. Chromium unless `engine: "webkit"`
 * (Safari's engine; `npx playwright install webkit` once).
 */
function launchBrowser({ engine = "chromium", ...options } = {}) {
  return playwright[engine].launch({ headless: !process.env.HEADED, ...options });
}

/** A signed-in context behind the write guard. Options go to browser.newContext. */
async function newContext(browser, options = {}) {
  const ctx = await browser.newContext({ storageState: authState(), ...options });
  const guard = createGuard(BASE);
  await guard.install(ctx);
  return { ctx, guard };
}

/** A folder for this test's screenshots (tests/e2e/.output/<name>). */
function outDir(name) {
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

// Test images, made on first use (not committed): two small JPEGs, a text
// file, and a 51MB "photo" (over the 50MB limit).
async function fixtures() {
  const dir = outDir("fixtures");
  const file = (name) => path.join(dir, name);
  if (!fs.existsSync(file("test-a.jpg")) || !fs.existsSync(file("test-b.jpg"))) {
    const sharp = require(path.join(ROOT, "node_modules", "sharp"));
    for (const [name, color] of [["test-a", "rgb(200,80,60)"], ["test-b", "rgb(60,120,200)"]]) {
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400"><rect width="600" height="400" fill="${color}"/><text x="40" y="220" font-size="90" fill="white" font-family="Arial">${name}</text></svg>`;
      await sharp(Buffer.from(svg)).jpeg({ quality: 80 }).toFile(file(`${name}.jpg`));
    }
  }
  if (!fs.existsSync(file("notes.txt"))) fs.writeFileSync(file("notes.txt"), "hello");
  if (!fs.existsSync(file("huge.jpg"))) fs.writeFileSync(file("huge.jpg"), Buffer.alloc(51 * 1024 * 1024, 1));
  return { dir, testA: file("test-a.jpg"), testB: file("test-b.jpg"), notes: file("notes.txt"), huge: file("huge.jpg") };
}

// Results. PASS / FAIL as usual. EXPECTED: an outcome the test causes on
// purpose or that changed on purpose, checked to be exactly that (FAIL if
// it isn't). KNOWN: a known issue outside this code, reported without
// failing the run. finish() prints them all and exits 1 if anything failed.
function report(name) {
  const lines = [];
  const add = (tag, label, ok, extra) => {
    lines.push(`${ok ? tag : "FAIL"}  ${label}${extra ? `  — ${typeof extra === "string" ? extra : JSON.stringify(extra)}` : ""}`);
    return ok;
  };
  return {
    lines,
    check: (label, ok, extra = "") => add("PASS", label, Boolean(ok), extra),
    asExpected: (label, ok, extra = "") => add("EXPECTED", label, Boolean(ok), extra),
    known: (label, extra = "") => lines.push(`KNOWN  ${label}${extra ? `  — ${extra}` : ""}`),
    section: (title) => lines.push(`\n=== ${title}`),
    failed: () => lines.some((l) => l.startsWith("FAIL")),
    finish(error) {
      if (error) lines.push(`FAIL  test stopped: ${String(error?.stack || error).split("\n").slice(0, 4).join(" | ")}`);
      const count = (tag) => lines.filter((l) => l.startsWith(`${tag} `)).length;
      console.log(`# ${name}`);
      console.log(lines.join("\n"));
      console.log(`\n${count("PASS")} passed, ${count("EXPECTED")} expected, ${count("KNOWN")} known issue(s), ${count("FAIL")} failed`);
      process.exit(count("FAIL") ? 1 : 0);
    },
  };
}

// A known issue several tests meet: Payload's own side menu header is a few
// pixels wider than a phone screen on every studio page
// (docs/build-2-plan.md, Mobile follow-ups). Reports sideways scroll at the
// current viewport: PASS if none, KNOWN if it's only that, FAIL otherwise.
async function checkNoSidewaysScroll(page, r, label) {
  const found = await page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const overflow = document.documentElement.scrollWidth - vw;
    const culprits = [...document.querySelectorAll("body *")]
      .filter((el) => el.getBoundingClientRect().right > vw + 1)
      .map((el) => String(el.className).split(" ")[0]);
    return { overflow, culprits: [...new Set(culprits)] };
  });
  if (found.overflow <= 0) return r.check(label, true);
  if (found.overflow <= 20 && found.culprits.length && found.culprits.every((c) => c.startsWith("nav"))) {
    return r.known(`${label}: Payload's side menu scrolls sideways on phones`, `${found.overflow}px, from ${found.culprits.join(", ")}`);
  }
  return r.check(label, false, `${found.overflow}px, from ${found.culprits.slice(0, 6).join(", ")}`);
}

module.exports = { BASE, ADMIN, API, ROOT, E2E, AUTH, OUT, sleep, launchBrowser, newContext, outDir, fixtures, report, checkNoSidewaysScroll };
