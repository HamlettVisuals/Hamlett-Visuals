// `npm run test:e2e [name…]`: runs every tests/e2e/*.test.* file (or only
// those whose file name contains one of the given words), one after
// another, each in its own process, then prints a summary. Exits 1 if any
// test failed. Needs the dev server running and a saved sign-in (see
// README.md).
const fs = require("fs");
const { spawnSync } = require("child_process");
const { ADMIN, AUTH } = require("./lib/harness.cjs");

const dir = __dirname;
const filters = process.argv.slice(2);
const files = fs
  .readdirSync(dir)
  .filter((f) => /\.test\.(cjs|mts)$/.test(f))
  .filter((f) => !filters.length || filters.some((word) => f.includes(word)))
  .sort();

(async () => {
  if (!files.length) {
    console.error(`No test matches ${filters.join(", ")}.`);
    process.exit(2);
  }
  if (!fs.existsSync(AUTH)) {
    console.error("Not signed in. Run `npm run test:e2e:login` once and sign in (see tests/e2e/README.md).");
    process.exit(2);
  }
  const alive = await fetch(`${ADMIN}/login`).then((res) => res.ok, () => false);
  if (!alive) {
    console.error(`The dev server isn't answering at ${ADMIN}. Start it with \`npm run dev\`.`);
    process.exit(2);
  }

  const results = [];
  for (const file of files) {
    console.log(`\n────────── ${file}`);
    const started = Date.now();
    const args = file.endsWith(".mts") ? ["--experimental-strip-types", "--no-warnings", file] : [file];
    const run = spawnSync(process.execPath, args, { cwd: dir, stdio: "inherit", env: process.env });
    results.push({ file, ok: run.status === 0, status: run.status, seconds: Math.round((Date.now() - started) / 1000) });
  }

  console.log("\n══════════ Summary");
  for (const r of results) console.log(`${r.ok ? "ok    " : "FAILED"}  ${r.file}  (${r.seconds}s${r.ok ? "" : `, exit ${r.status}`})`);
  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed} of ${results.length} test files passed.`);
  process.exit(failed ? 1 : 0);
})();
