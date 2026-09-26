import pg from "pg";

// One-time switch from dev-mode schema push to migrations. The live database
// already has every table in src/migrations/20260926_182105_initial.ts (dev
// push created them), so running that migration would fail on "already
// exists". This records it as already run, and removes the "dev" marker row
// that dev push leaves behind (Payload won't run migrations while it's
// there). Touches only the payload_migrations bookkeeping table, in one
// transaction, and does nothing if the baseline is already recorded.
// Run with `node --env-file=.env.local src/scripts/markInitialMigrationApplied.mjs`.
const BASELINE = "20260926_182105_initial";

const client = new pg.Client({
  connectionString: process.env.DATABASE_URI,
  ssl: { rejectUnauthorized: false },
});
await client.connect();

try {
  const { rowCount: done } = await client.query("select 1 from payload_migrations where name = $1", [BASELINE]);
  if (done) {
    console.log(`[markInitialMigrationApplied] ${BASELINE} is already recorded — skipping.`);
  } else {
    await client.query("begin");
    await client.query("delete from payload_migrations where batch = -1");
    await client.query(
      "insert into payload_migrations (name, batch, updated_at, created_at) values ($1, 1, now(), now())",
      [BASELINE],
    );
    await client.query("commit");
    console.log(`[markInitialMigrationApplied] Recorded ${BASELINE} as run and removed the dev-push marker.`);
  }
  const { rows } = await client.query("select name, batch from payload_migrations order by id");
  console.log(rows);
} catch (err) {
  await client.query("rollback");
  throw err;
} finally {
  await client.end();
}
