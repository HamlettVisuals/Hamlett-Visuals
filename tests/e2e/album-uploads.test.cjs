// Uploading photos into an album: signed link, PUT to R2 (to a made-up host), the photo create request, one file at a time, refusals, drag-and-drop, and "Save & upload photos" on a new album (starts Hidden). Album 16, category 27 "Test".
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// Run with `npm run test:e2e album-uploads` (see README.md).
const fs = require("fs");
const { launchBrowser, newContext, report, outDir, fixtures, ADMIN, API } = require("./lib/harness.cjs");

const r = report("album-uploads");
const { check } = r;
const shots = outDir("album-uploads");
const ALBUM = 16;
const CATEGORY = 27;

// Pulls the named text parts out of a multipart body.
function multipart(req) {
  const type = req.headers()["content-type"] || "";
  const boundary = type.split("boundary=")[1];
  const raw = req.postDataBuffer()?.toString("utf8") ?? "";
  const parts = {};
  for (const chunk of raw.split(`--${boundary}`)) {
    const m = chunk.match(/name="([^"]+)"\r\n\r\n([\s\S]*)\r\n$/);
    if (m) parts[m[1]] = m[2];
  }
  return parts;
}

(async () => {
  const browser = await launchBrowser();
  const fx = await fixtures();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  // --- Fakes, in the order the browser meets them.
  const events = [];
  let signCount = 0;
  let createCount = 0;
  let putStatus = 200;
  let createFail = null;
  await page.route("**/hv-studio/api/storage-s3-generate-signed-url", async (route) => {
    const body = JSON.parse(route.request().postData());
    signCount += 1;
    events.push({ step: "sign", body });
    const filename = body.filename.replace(/\.jpg$/, `-${signCount}.jpg`); // as if renamed to stay unique
    await route.fulfill({ json: { url: `https://fake-r2.invalid/photos/${filename}?X-Amz-Signature=fake`, filename, docPrefix: "photos" } });
  });
  await page.route("https://fake-r2.invalid/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
    events.push({ step: "put", url: req.url(), method: req.method(), type: req.headers()["content-type"], bytes: req.postDataBuffer()?.length });
    await new Promise((r) => setTimeout(r, 1200));
    await route.fulfill({ status: putStatus, headers: { "access-control-allow-origin": "*" }, body: "" });
  });
  await page.route(/\/hv-studio\/api\/photos\?depth=0$/, async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    const parts = multipart(req);
    events.push({ step: "create", payload: JSON.parse(parts._payload), file: JSON.parse(parts.file) });
    await new Promise((r) => setTimeout(r, 600));
    if (createFail) return route.fulfill({ status: 400, json: { errors: [{ message: createFail }] } });
    createCount += 1;
    await route.fulfill({ status: 201, json: { doc: { id: 90000 + createCount }, message: "Photo successfully created." } });
  });

  const fileA = { name: "test-a.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(fx.testA) };
  const fileB = { name: "test-b.jpg", mimeType: "image/jpeg", buffer: fs.readFileSync(fx.testB) };
  const tooBig = fx.huge;

  // ===== 1. Existing album: Upload photos
  await page.goto(`${ADMIN}/collections/events/${ALBUM}`, { timeout: 120000 });
  await page.locator(".album-photos__tile").first().waitFor({ timeout: 60000 });
  const startTiles = await page.locator(".album-photos__tile").count();
  check("button reads 'Upload photos'", (await page.getByRole("button", { name: "Upload photos" }).count()) === 1);
  const input = page.locator(".album-photos__file-input");
  await input.setInputFiles([fx.testA, fx.notes, fx.testB, tooBig]);
  await page.waitForTimeout(700);
  await page.locator(".album-photos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/6-uploading.png` });
  check("one tile per picked file", (await page.locator(".album-photos__upload").count()) === 4);
  check("wrong type refused on the spot", (await page.locator(".album-photos__upload--error").filter({ hasText: "notes.txt" }).innerText()).includes("Not a photo"));
  check("too big refused on the spot", (await page.locator(".album-photos__upload--error").filter({ hasText: "huge.jpg" }).innerText()).includes("Photos can be up to 50MB"));
  check("progress bar shown", (await page.locator(".album-photos__progress").count()) >= 1);
  const handleDisabled = await page.locator(".album-photos__handle").first().isDisabled();
  const handleTitle = await page.locator(".album-photos__handle").first().getAttribute("title");
  check("reordering waits during uploads", handleDisabled && handleTitle === "Wait for the uploads to finish", `${handleDisabled} ${handleTitle}`);
  // Both files go through.
  for (let i = 0; i < 60 && createCount < 2; i++) await page.waitForTimeout(250);
  await page.waitForTimeout(1500);
  check("both photos created", createCount === 2, `created ${createCount}`);
  const steps = events.map((e) => e.step).join(",");
  check("one file at a time, in the order picked", steps === "sign,put,create,sign,put,create", steps);
  const sign1 = events.find((e) => e.step === "sign").body;
  check(
    "signed-link request matches Payload's",
    sign1.collectionSlug === "photos" && sign1.docPrefix === "photos" && sign1.filename === "test-a.jpg" && sign1.filesize === fileA.buffer.length && sign1.mimeType === "image/jpeg",
    JSON.stringify(sign1),
  );
  const put1 = events.find((e) => e.step === "put");
  check("PUT sends the file with its type (body size isn't visible to Playwright for XHR blobs)", put1.method === "PUT" && put1.type === "image/jpeg", JSON.stringify(put1));
  const creates = events.filter((e) => e.step === "create");
  check(
    "create: _payload has album, alt text and prefix",
    JSON.stringify(creates[0].payload) === JSON.stringify({ alt: "Photo from Vacation Test", event: ALBUM, prefix: "photos" }),
    JSON.stringify(creates[0].payload),
  );
  check(
    "create: file describes the R2 object (renamed name, prefix, type, size)",
    JSON.stringify(creates[0].file) ===
      JSON.stringify({ clientUploadContext: { prefix: "photos" }, collectionSlug: "photos", filename: "test-a-1.jpg", mimeType: "image/jpeg", size: fileA.buffer.length }),
    JSON.stringify(creates[0].file),
  );
  check("second file second", creates[1]?.file.filename === "test-b-2.jpg", creates[1]?.file.filename);
  check("finished tiles give way (only the 2 refusals left)", (await page.locator(".album-photos__upload").count()) === 2);
  check("reordering back on after uploads", !(await page.locator(".album-photos__handle").first().isDisabled()));
  await page.locator(".album-photos__upload--error").first().getByRole("button", { name: "Dismiss" }).click();
  await page.locator(".album-photos__upload--error").first().getByRole("button", { name: "Dismiss" }).click();
  check("refusals dismiss", (await page.locator(".album-photos__upload").count()) === 0);
  check("grid unchanged (creates were faked)", (await page.locator(".album-photos__tile").count()) === startTiles);

  // ===== 2. Failures: R2 refuses the PUT; then the save is refused.
  putStatus = 403;
  events.length = 0;
  await input.setInputFiles([fileA]);
  await page.locator(".album-photos__upload--error").waitFor({ timeout: 15000 });
  check("refused PUT: says so, no photo created", (await page.locator(".album-photos__upload--error").innerText()).includes("refused (403)") && !events.some((e) => e.step === "create"));
  await page.getByRole("button", { name: "Dismiss" }).click();
  putStatus = 200;
  createFail = "That photo is 62MB. Photos can be up to 50MB.";
  await input.setInputFiles([fileB]);
  await page.locator(".album-photos__upload--error").waitFor({ timeout: 15000 });
  check("refused save: shows the server's reason", (await page.locator(".album-photos__upload--error").innerText()).includes("62MB"));
  await page.screenshot({ path: `${shots}/6-refused.png` });
  await page.getByRole("button", { name: "Dismiss" }).click();
  createFail = null;

  // ===== 3. Dropping files on the panel.
  events.length = 0;
  const before = createCount;
  const dt = await page.evaluateHandle(async ([a]) => {
    const data = new DataTransfer();
    const bytes = Uint8Array.from(atob(a), (c) => c.charCodeAt(0));
    data.items.add(new File([bytes], "dropped.jpg", { type: "image/jpeg" }));
    return data;
  }, [fileA.buffer.toString("base64")]);
  const panel = page.locator(".album-photos");
  await panel.dispatchEvent("dragenter", { dataTransfer: dt });
  await panel.dispatchEvent("dragover", { dataTransfer: dt });
  await page.waitForTimeout(200);
  check("panel lights up while dragging files over it", await panel.evaluate((el) => el.classList.contains("album-photos--dropping")));
  await page.screenshot({ path: `${shots}/6-dropping.png` });
  await panel.dispatchEvent("drop", { dataTransfer: dt });
  for (let i = 0; i < 40 && createCount === before; i++) await page.waitForTimeout(250);
  check("dropped file uploaded", createCount === before + 1 && events.find((e) => e.step === "sign")?.body.filename === "dropped.jpg");
  check("highlight off after drop", !(await panel.evaluate((el) => el.classList.contains("album-photos--dropping"))));

  // ===== 4. New album: starts Hidden, Save & upload photos.
  await page.goto(`${ADMIN}/collections/events/create?category=${CATEGORY}`, { timeout: 120000 });
  await page.locator(".album-photos").waitFor({ timeout: 60000 });
  await page.waitForTimeout(2500);
  check("button reads 'Save & upload photos'", (await page.getByRole("button", { name: "Save & upload photos" }).count()) === 1);
  const toggle = page.locator("#field-published, input[name='published']").first();
  check("new album starts Hidden", (await toggle.isChecked().catch(() => null)) === false, String(await toggle.isChecked().catch((e) => e.message)));
  // Leaving now wouldn't ask about unsaved changes: nothing marked changed.
  check("form not marked changed by the Hidden start", await page.evaluate(() => !document.querySelector(".doc-controls__status, .form-submit button")?.textContent?.includes("*")));
  await page.screenshot({ path: `${shots}/6-new-album.png` });

  // 4a. No title: the album isn't saved, nothing is uploaded.
  events.length = 0;
  const albumPosts = [];
  await page.route(/\/hv-studio\/api\/events(\?|$)/, async (route) => {
    if (route.request().method() !== "POST") return route.fallback();
    const parts = multipart(route.request());
    const payload = JSON.parse(parts._payload ?? "{}");
    albumPosts.push(payload);
    // As the server does: the title is required.
    if (!payload.title) {
      return route.fulfill({ status: 400, json: { errors: [{ name: "ValidationError", message: "The following field is invalid: Title", data: { collection: "events", errors: [{ path: "title", message: "This field is required." }] } }] } });
    }
    const real = await (await page.request.get(`${API}/events/${ALBUM}?depth=0`)).json();
    await route.fulfill({ status: 201, json: { doc: real, message: "Album successfully created." } });
  });
  await page.locator(".album-photos__file-input").setInputFiles([fileA]);
  await page.waitForTimeout(2500);
  check("no title: the server refuses the save", albumPosts.length === 1 && page.url().includes("/create"), page.url());
  check("no title: says why, nothing uploaded", (await page.locator(".album-photos__error").innerText().catch(() => "")).includes("wasn't saved") && events.length === 0);
  await page.screenshot({ path: `${shots}/6-new-album-invalid.png` });

  // 4b. With a title: saves the album (faked: answers as album 16), Payload
  // moves to the album's page, the picked files upload there.
  await page.locator("#field-title").fill("Save and upload test");
  const created = createCount;
  await page.locator(".album-photos__file-input").setInputFiles([fileA, fileB]);
  await page.waitForURL(new RegExp(`/collections/events/${ALBUM}`), { timeout: 30000 }).catch(() => {});
  for (let i = 0; i < 80 && createCount < created + 2; i++) await page.waitForTimeout(250);
  check("album saved, as Hidden", albumPosts.length === 2 && albumPosts[1].published === false && albumPosts[1].title === "Save and upload test", JSON.stringify(albumPosts[1]));
  check("moved to the saved album's page", page.url().includes(`/collections/events/${ALBUM}`), page.url());
  const newCreates = events.filter((e) => e.step === "create");
  check("both picked files uploaded into it, in order", createCount === created + 2 && newCreates[0]?.payload.event === ALBUM && newCreates[0]?.file.filename.startsWith("test-a") && newCreates[1]?.file.filename.startsWith("test-b"), JSON.stringify(newCreates.map((c) => [c.payload, c.file.filename])));

  // Phone width with an upload tile showing.
  putStatus = 403;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".album-photos__file-input").setInputFiles([fileA]);
  await page.locator(".album-photos__upload--error").waitFor({ timeout: 15000 });
  await page.locator(".album-photos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/6-phone.png` });

  check("no page errors", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/fake-r2|storage-s3|api\/photos\?depth|api\/events\?/.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 400));
  await browser.close();
})().then(() => r.finish(), (err) => r.finish(err));
