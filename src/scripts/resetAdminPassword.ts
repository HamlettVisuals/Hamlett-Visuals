import { createInterface } from "node:readline";
import { getPayload } from "payload";
import config from "#src/payload.config.ts";

// Sets a new password for an existing /hv-studio account and clears any
// failed-login lockout — for when she's locked out and the forgot-password
// email can't help (e.g. no verified sending domain yet). Needs the live
// DATABASE_URI, so it runs against the real database. Run with
//   npm run payload -- run src/scripts/resetAdminPassword.ts <her-login-email>
// and type the new password at the (hidden) prompt: it never goes on the
// command line, so it stays out of shell history. Only ever changes the one
// account whose email is given; changes nothing if there's no such account.

// Asks each question in turn on one readline session (a second session
// would miss input the first had already buffered), without echoing what's
// typed: readline echoes keystrokes through _writeToOutput, so that's
// silenced once each question is on screen.
function askHidden(questions: string[]): Promise<string[]> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    const rlWithOutput = rl as unknown as { _writeToOutput: (text: string) => void };
    const write = rlWithOutput._writeToOutput.bind(rl);
    let muted = false;
    rlWithOutput._writeToOutput = (text: string) => {
      if (!muted) write(text);
    };
    const answers: string[] = [];
    const next = () => {
      if (answers.length === questions.length) {
        rl.close();
        resolve(answers);
        return;
      }
      muted = false;
      rl.question(questions[answers.length], (answer) => {
        process.stdout.write("\n");
        answers.push(answer);
        next();
      });
      muted = true;
    };
    // Input ending early (e.g. Ctrl+D) counts as a blank answer, which the
    // checks below then refuse.
    rl.on("close", () => {
      if (answers.length < questions.length) resolve([...answers, ...questions.slice(answers.length).map(() => "")]);
    });
    next();
  });
}

async function reset() {
  const email = process.argv.slice(2).find((arg) => arg.includes("@"))?.trim().toLowerCase();
  if (!email) {
    console.error("Usage: npm run payload -- run src/scripts/resetAdminPassword.ts <login-email>");
    process.exit(1);
  }

  const payload = await getPayload({ config });
  const { docs } = await payload.find({
    collection: "users",
    where: { email: { equals: email } },
    limit: 1,
    depth: 0,
    overrideAccess: true,
  });
  const user = docs[0];
  if (!user) {
    payload.logger.error(`[resetAdminPassword] No account with the email ${email} — nothing changed.`);
    await payload.destroy();
    process.exit(1);
  }

  const [password, confirm] = await askHidden([`New password for ${email}: `, "Type it again: "]);
  if (password !== confirm) {
    payload.logger.error("[resetAdminPassword] The two passwords didn't match — nothing changed.");
    await payload.destroy();
    process.exit(1);
  }
  if (password.length < 12) {
    payload.logger.error("[resetAdminPassword] Use at least 12 characters — nothing changed.");
    await payload.destroy();
    process.exit(1);
  }

  // The local API hashes a `password` in update data, same as the admin UI.
  // Zeroing the failed-login count and lock time is what Payload's own
  // unlock does.
  await payload.update({
    collection: "users",
    id: user.id,
    data: { password, loginAttempts: 0, lockUntil: null },
    overrideAccess: true,
  });

  payload.logger.info(`[resetAdminPassword] Password reset and account unlocked for ${email}.`);
  await payload.destroy();
  process.exit(0);
}

await reset();
