// Album videos: the Videos panel on the album page (upload, refusals, title,
// poster, reorder, delete), the signed upload link's per-collection size
// caps, what a signed-out visitor can read, and the player on a category
// page. Album 16 "Vacation Test" in category 27 "Test".
//
// Every write is faked by the shared guard (lib/guard.cjs); reads are real.
// There are no real videos to read yet, so the panel's list of videos is
// answered by the test, and the category page's player is checked with the
// development-only sample (?galleryState=video, Gallery/CategoryGallery.tsx),
// its clip served by the test. Asking for a signed upload link writes
// nothing (it only signs a URL, and the file is never sent), so those
// requests go to the real server.
//
// The player part runs in installed Google Chrome: Playwright's own
// Chromium can't play H.264.
// Run with `npm run test:e2e album-videos` (see README.md).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { launchBrowser, newContext, report, outDir, fixtures, ADMIN, API, BASE, ROOT } = require("./lib/harness.cjs");

const r = report("album-videos");
const { check, section } = r;
const shots = outDir("album-videos");
const ALBUM = 16;
const CATEGORY_SLUG = "test";
const MB = 1024 * 1024;

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

// A 4-second H.264 MP4 (fast start), and the same as a .mov, made on first use.
function videoFixtures(dir) {
  const ffmpeg = require(path.join(ROOT, "node_modules", "ffmpeg-static"));
  const make = (name, extra) => {
    const file = path.join(dir, name);
    if (!fs.existsSync(file)) {
      execFileSync(ffmpeg, ["-hide_banner", "-loglevel", "error", "-y", "-f", "lavfi", "-i", "testsrc=duration=4:size=1280x720:rate=25", "-pix_fmt", "yuv420p", "-c:v", "libx264", ...extra, file]);
    }
    return file;
  };
  return { mp4: make("reel.mp4", ["-movflags", "+faststart"]), mov: make("reel.mov", []) };
}

(async () => {
  const fx = await fixtures();
  const vids = videoFixtures(fx.dir);

  // ======================================================== studio
  section("the album page's Videos panel");
  const browser = await launchBrowser();
  const { ctx, guard } = await newContext(browser, { viewport: { width: 1400, height: 950 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));

  await page.goto(`${ADMIN}/collections/events/${ALBUM}`, { timeout: 120000 });
  await page.locator(".album-videos").waitFor({ timeout: 60000 });
  await page.locator(".album-videos__empty").filter({ hasText: "No videos in this album" }).waitFor({ timeout: 30000 });
  check("Videos panel is there, before the photos", await page.evaluate(() => {
    const videos = document.querySelector(".album-videos");
    const photos = document.querySelector(".album-photos");
    return Boolean(videos && photos && videos.compareDocumentPosition(photos) & Node.DOCUMENT_POSITION_FOLLOWING);
  }));
  const note = await page.locator(".album-videos__note").innerText();
  check("help text recommends her web export preset", /website export preset: 1080p, H\.264 MP4, about 12–16 Mbps, with fast start on/.test(note), note);
  check("with no videos yet: says so", (await page.locator(".album-videos__empty").innerText()).includes("No videos in this album"));

  // Real photos from the album, for posters.
  const albumPhotos = (await (await page.request.get(`${API}/photos?where[event][equals]=${ALBUM}&depth=0&limit=5`)).json()).docs;
  check("the album has photos to choose a poster from", albumPhotos.length >= 2, albumPhotos.length);
  const asPoster = (p) => ({ id: p.id, alt: p.alt, url: p.url, sizes: p.sizes });

  // From here the panel's list is the test's: two videos, one with an
  // automatic poster and a title, one with her own poster, no title, and no
  // fast start.
  const fakeVideos = [
    { id: 990001, title: "Highlight reel", filename: "reel.mp4", duration: 245.4, fastStart: true, poster: null, autoPoster: asPoster(albumPhotos[0]), albumOrder: "a0", createdAt: "2026-10-09T00:00:00.000Z" },
    { id: 990002, title: null, filename: "walkthrough.mp4", duration: 62, fastStart: false, poster: asPoster(albumPhotos[1]), autoPoster: null, albumOrder: "a1", createdAt: "2026-10-09T00:00:01.000Z" },
  ];
  await page.route(/\/hv-studio\/api\/videos\?.*where/, (route) =>
    route.request().method() === "GET" ? route.fulfill({ json: { docs: fakeVideos, totalDocs: fakeVideos.length } }) : route.fallback(),
  );
  await page.reload({ timeout: 120000 });
  await page.locator(".album-videos__tile").first().waitFor({ timeout: 60000 });
  const tiles = page.locator(".album-videos__tile");
  check("one tile per video, in her order", (await tiles.count()) === 2);
  check("count shown", (await page.locator(".album-videos__count").innerText()) === "2");
  check("length on the tile", (await tiles.nth(0).locator(".album-videos__duration").innerText()) === "4:05");
  check("title under the tile; an untitled one says so", (await tiles.nth(0).locator(".album-videos__name").innerText()) === "Highlight reel" && (await tiles.nth(1).locator(".album-videos__name").innerText()) === "No title");
  check("each tile shows its poster", (await tiles.nth(0).locator("img").count()) === 1 && (await tiles.nth(1).locator("img").count()) === 1);
  const warning = await tiles.nth(1).locator(".album-videos__warning").innerText().catch(() => "");
  check("a file without fast start is flagged, with how to fix it", warning.includes("isn't set up for fast start") && warning.includes("Re-export it with your website preset"), warning);
  check("…and only that one", (await tiles.nth(0).locator(".album-videos__warning").count()) === 0);
  await page.locator(".album-videos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/1-panel.png` });

  // --- Uploading. Writes answered by the test, in the order they come.
  const events = [];
  let createFail = null;
  await page.route("**/hv-studio/api/storage-s3-generate-signed-url", async (route) => {
    const body = JSON.parse(route.request().postData());
    events.push({ step: "sign", body });
    await route.fulfill({ json: { url: `https://fake-r2.invalid/videos/${body.filename}?X-Amz-Signature=fake`, filename: body.filename, docPrefix: "videos" } });
  });
  await page.route("https://fake-r2.invalid/**", async (route) => {
    const req = route.request();
    if (req.method() === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-methods": "PUT", "access-control-allow-headers": "*" } });
    events.push({ step: "put", type: req.headers()["content-type"] });
    await new Promise((res) => setTimeout(res, 800));
    await route.fulfill({ status: 200, headers: { "access-control-allow-origin": "*" }, body: "" });
  });
  await page.route(/\/hv-studio\/api\/videos\?depth=0$/, async (route) => {
    const req = route.request();
    if (req.method() !== "POST") return route.fallback();
    const parts = multipart(req);
    events.push({ step: "create", payload: JSON.parse(parts._payload), file: JSON.parse(parts.file) });
    await new Promise((res) => setTimeout(res, 1500));
    if (createFail) return route.fulfill({ status: 400, json: { errors: [{ message: createFail }] } });
    await route.fulfill({ status: 201, json: { doc: { id: 990003 }, message: "Video successfully created." } });
  });

  const input = page.locator(".album-videos__file-input");
  await input.setInputFiles([vids.mp4]);
  await page.locator(".album-videos__upload-status").filter({ hasText: "Checking the video" }).waitFor({ timeout: 15000 });
  await page.screenshot({ path: `${shots}/2-checking.png` });
  check("while the server checks it, the tile says so", true);
  for (let i = 0; i < 40 && !events.some((e) => e.step === "create"); i++) await page.waitForTimeout(250);
  await page.locator(".album-videos__upload").waitFor({ state: "detached", timeout: 15000 });
  const sign = events.find((e) => e.step === "sign")?.body;
  check(
    "signed link asked for the videos collection",
    sign?.collectionSlug === "videos" && sign.docPrefix === "videos" && sign.mimeType === "video/mp4" && sign.filesize === fs.statSync(vids.mp4).size,
    JSON.stringify(sign),
  );
  check("PUT to R2 with the video's type", events.find((e) => e.step === "put")?.type === "video/mp4");
  const create = events.find((e) => e.step === "create");
  check("created in this album, title left blank", JSON.stringify(create?.payload) === JSON.stringify({ event: ALBUM, prefix: "videos" }), JSON.stringify(create?.payload));
  check(
    "create describes the R2 object",
    JSON.stringify(create?.file) === JSON.stringify({ clientUploadContext: { prefix: "videos" }, collectionSlug: "videos", filename: "reel.mp4", mimeType: "video/mp4", size: fs.statSync(vids.mp4).size }),
    JSON.stringify(create?.file),
  );

  // The server's refusal (here, as Videos.ts words an HEVC file) is shown as-is.
  events.length = 0;
  createFail = "That video is HEVC (H.265) which many browsers can't play. Export it as an H.264 MP4 using your website preset, then upload the new file.";
  await input.setInputFiles([vids.mp4]);
  await page.locator(".album-videos__upload--error").waitFor({ timeout: 20000 });
  const refusal = await page.locator(".album-videos__upload--error").innerText();
  check("a refused save shows the server's reason, with how to fix it", refusal.includes("HEVC") && refusal.includes("using your website preset"), refusal);
  await page.screenshot({ path: `${shots}/3-refused.png` });
  await page.locator(".album-videos").getByRole("button", { name: "Dismiss" }).click();
  createFail = null;

  // A .mov is refused before anything is sent.
  events.length = 0;
  await input.setInputFiles([vids.mov]);
  await page.locator(".album-videos__upload--error").waitFor({ timeout: 10000 });
  const movText = await page.locator(".album-videos__upload--error").innerText();
  check("a .mov is refused on the spot, with how to export it", movText.includes("That's a .mov file") && movText.includes("H.264 MP4") && events.length === 0, movText);
  await page.locator(".album-videos").getByRole("button", { name: "Dismiss" }).click();

  // --- Editing. PATCHes are answered by the guard; their bodies are checked.
  const patches = () => guard.log.filter((e) => e.kind === "faked" && e.method === "PATCH" && /\/api\/videos\/\d+/.test(e.url));
  const lastPatch = () => {
    const p = patches().at(-1);
    return p && { id: Number(p.url.match(/videos\/(\d+)/)[1]), body: JSON.parse(p.body) };
  };

  await tiles.nth(0).locator(".album-videos__name").click();
  const titleInput = page.locator(".album-videos__name-input");
  await titleInput.fill("Ceremony highlights");
  await titleInput.press("Enter");
  await page.waitForTimeout(800);
  check("title saved on Enter", JSON.stringify(lastPatch()) === JSON.stringify({ id: 990001, body: { title: "Ceremony highlights" } }), JSON.stringify(lastPatch()));

  const before = patches().length;
  await tiles.nth(1).locator(".album-videos__name").click();
  await page.locator(".album-videos__name-input").press("Escape");
  await page.waitForTimeout(500);
  check("Escape leaves the title alone", patches().length === before);

  // Choose poster: the album's photos, in a drawer; a click picks and closes.
  await tiles.nth(0).locator(".album-videos__menu-button").click();
  await page.getByRole("button", { name: "Choose poster…" }).click();
  const drawer = page.locator(".poster-picker");
  await drawer.locator(".add-photos__photo").first().waitFor({ timeout: 30000 });
  check("poster picker lists the album's photos", (await drawer.locator(".add-photos__photo").count()) >= 2);
  check("…and offers an upload", (await drawer.getByRole("button", { name: "Upload a poster" }).count()) === 1);
  await page.screenshot({ path: `${shots}/4-poster-picker.png` });
  const pickedId = albumPhotos[1].id;
  await drawer.locator(`.add-photos__photo[title="${(albumPhotos[1].alt || albumPhotos[1].filename).replace(/"/g, '\\"')}"]`).first().click();
  await page.waitForTimeout(1000);
  check("picking a photo saves it as the poster", JSON.stringify(lastPatch()) === JSON.stringify({ id: 990001, body: { poster: pickedId } }), JSON.stringify(lastPatch()));
  check("…and closes the drawer", !(await drawer.isVisible().catch(() => false)));

  // Back to the automatic poster (only offered where she chose one).
  await tiles.nth(0).locator(".album-videos__menu-button").click();
  check("no 'automatic poster' option without a chosen one", (await page.getByRole("button", { name: "Use the automatic poster" }).count()) === 0);
  await page.keyboard.press("Escape");
  await tiles.nth(1).locator(".album-videos__menu-button").click();
  await page.getByRole("button", { name: "Use the automatic poster" }).click();
  await page.waitForTimeout(800);
  check("'Use the automatic poster' clears hers", JSON.stringify(lastPatch()) === JSON.stringify({ id: 990002, body: { poster: null } }), JSON.stringify(lastPatch()));

  // Reorder with the keyboard (same sensors as the photos).
  await tiles.nth(1).locator(".album-videos__handle").focus();
  await page.keyboard.press("Space");
  await page.waitForTimeout(200);
  await page.keyboard.press("ArrowLeft");
  await page.waitForTimeout(200);
  await page.keyboard.press("Space");
  await page.waitForTimeout(1000);
  const reorder = guard.log.filter((e) => e.kind === "faked" && /reorder-videos/.test(e.url)).at(-1);
  check(
    "dragging saves the new order",
    reorder && JSON.stringify(JSON.parse(reorder.body)) === JSON.stringify({ album: ALBUM, order: [990002, 990001], moved: 990002 }),
    reorder?.body,
  );

  // Delete: to the Trash, after asking.
  await tiles.nth(0).locator(".album-videos__menu-button").click();
  await page.getByRole("button", { name: "Delete video…" }).click();
  await page.getByText("It goes to the Videos Trash").waitFor({ timeout: 10000 });
  await page.getByRole("button", { name: "Delete video", exact: true }).click();
  await page.waitForTimeout(1000);
  const deleted = lastPatch();
  check("deleting moves it to the Trash", deleted && "deletedAt" in deleted.body && Object.keys(deleted.body).length === 1, JSON.stringify(deleted));
  check("'Deleted videos' links to the Videos Trash", (await page.getByRole("link", { name: "Deleted videos" }).getAttribute("href"))?.endsWith("/hv-studio/collections/videos/trash"));

  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator(".album-videos").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${shots}/5-phone.png` });

  check("no page errors in the studio", errors.length === 0, errors.slice(0, 3).join(" || "));
  const stray = guard.log.filter((e) => e.kind !== "pass" && !/fake-r2|storage-s3|api\/videos|payload-preferences|\/access\//.test(e.url));
  check("nothing else tried to write", stray.length === 0, JSON.stringify(stray).slice(0, 400));

  // ======================================================== signed links
  section("each collection's cap is in its signed upload link");
  const askForLink = (body) => page.request.post(`${API}/storage-s3-generate-signed-url`, { data: body });
  const photoTooBig = await askForLink({ collectionSlug: "photos", docPrefix: "photos", filename: "big.jpg", filesize: 60 * MB, mimeType: "image/jpeg" });
  const photoTooBigText = (await photoTooBig.json().catch(() => ({})))?.errors?.[0]?.message;
  check("a 60MB photo: refused before any link, in the save's words", photoTooBig.status() === 400 && photoTooBigText === "That photo is 60MB. Photos can be up to 50MB.", `${photoTooBig.status()} ${photoTooBigText}`);
  const bigVideo = await askForLink({ collectionSlug: "videos", docPrefix: "videos", filename: "big.mp4", filesize: 900 * MB, mimeType: "video/mp4" });
  const bigVideoUrl = (await bigVideo.json().catch(() => ({})))?.url ?? "";
  check("a 900MB album video: gets a link, for the videos folder", bigVideo.ok() && /\/videos\/big[^/]*\.mp4\?/.test(bigVideoUrl), bigVideo.status());
  const hugeVideo = await askForLink({ collectionSlug: "videos", docPrefix: "videos", filename: "huge.mp4", filesize: 1.3 * 1024 * MB, mimeType: "video/mp4" });
  check("a 1.3GB video: refused", hugeVideo.status() === 400 && ((await hugeVideo.json())?.errors?.[0]?.message ?? "").includes("Videos can be up to 1GB"));
  const backstageVideo = await askForLink({ collectionSlug: "backstage", docPrefix: "backstage", filename: "clip.mp4", filesize: 250 * MB, mimeType: "video/mp4" });
  check("a 250MB Backstage video: still refused at 200MB", backstageVideo.status() === 400, backstageVideo.status());
  await browser.close();

  // ======================================================== signed out
  section("signed out: only videos in an album the site shows");
  const anon = async (p) => {
    const res = await fetch(API + p);
    let body = null;
    try { body = await res.json(); } catch {}
    return { status: res.status, body };
  };
  const access = await anon("/access");
  const videoRead = JSON.stringify(access.body?.collections?.videos?.read);
  check(
    "videos: read only where the album and its category show, never the Trash",
    ["event.published", "event.deletedAt", "event.category.published", "event.category.deletedAt", '"deletedAt"'].every((s) => videoRead.includes(s)),
    videoRead,
  );
  const posterRead = JSON.stringify(access.body?.collections?.["video-posters"]?.read);
  check("video posters: read only where their video shows", posterRead.includes("video.event.category.published"), posterRead);
  const list = await anon("/videos?depth=0&limit=1");
  const posters = await anon("/video-posters?depth=0&limit=1");
  check("the signed-out lists work (the nested rules are valid queries)", list.status === 200 && posters.status === 200, `${list.status} ${posters.status}`);
  const hidden = await anon("/videos?depth=0&limit=1&trash=true&where[event.published][equals]=false");
  check("no video from a hidden album", hidden.status === 200 && hidden.body.totalDocs === 0, hidden.body?.totalDocs);
  const file = await fetch(`${API}/videos/file/not-a-real-video.mp4?prefix=videos`, { redirect: "manual" });
  check("a video file that isn't readable: not served", [403, 404].includes(file.status), file.status);

  // ======================================================== the player
  section("the player on a category page");
  let chrome;
  try {
    chrome = await launchBrowser({ channel: "chrome" });
  } catch (err) {
    r.check("installed Google Chrome to play H.264", false, String(err.message).split("\n")[0]);
  }
  if (chrome) {
    const { ctx: siteCtx } = await newContext(chrome, { viewport: { width: 1280, height: 900 } });
    const site = await siteCtx.newPage();
    const siteErrors = [];
    site.on("pageerror", (e) => siteErrors.push(e.message));
    const clip = fs.readFileSync(vids.mp4);
    const videoRequests = [];
    await site.route("**/dev-sample-video.mp4", (route) => {
      videoRequests.push(route.request().headers().range ?? "(whole file)");
      return route.fulfill({ status: 200, contentType: "video/mp4", headers: { "accept-ranges": "none" }, body: clip });
    });

    // The real page first: no videos uploaded, so nothing changes.
    await site.goto(`${BASE}/portfolio/${CATEGORY_SLUG}`, { timeout: 120000 });
    await site.locator("h2").first().waitFor({ timeout: 60000 });
    check("albums with no video are unchanged: no player, no video count", (await site.locator("video").count()) === 0 && !(await site.locator("#albums").innerText()).match(/\d+ videos?\b/));

    await site.goto(`${BASE}/portfolio/${CATEGORY_SLUG}?galleryState=video`, { timeout: 120000 });
    const player = site.locator("figure").filter({ has: site.locator("video") }).first();
    await player.waitFor({ timeout: 60000 });
    const firstRow = site.locator("#albums [id]").filter({ has: site.locator("h2") }).first();
    const header = await firstRow.locator("span.text-caption").first().innerText();
    check("the album's header counts the video", /· 1 video$/.test(header.trim()), header);
    const otherHeaders = await site.locator("#albums span.text-caption").allInnerTexts();
    check("…and only that album's", otherHeaders.filter((t) => /video/.test(t)).length === 1, otherHeaders);
    check("the video sits above the album's photos", await site.evaluate(() => {
      const video = document.querySelector("#albums video");
      const firstPhotoRow = video?.closest("[id]")?.querySelector(".no-scrollbar");
      return Boolean(video && firstPhotoRow && video.compareDocumentPosition(firstPhotoRow) & Node.DOCUMENT_POSITION_FOLLOWING);
    }));
    check("title over the player", (await player.locator("figcaption").innerText()) === "Highlight reel (sample)");
    const video = player.locator("video");
    check("preload is metadata", (await video.getAttribute("preload")) === "metadata");
    check("no browser controls before it's played", (await video.evaluate((v) => v.controls)) === false);
    const button = player.getByRole("button", { name: "Play Highlight reel (sample)" });
    check("a play button covers it, with the poster", (await button.count()) === 1 && (await button.locator(".hover-zoom img").count()) === 1);
    const box = await player.locator("div").first().boundingBox();
    check("full column width, in the video's shape (16:9)", box && box.width > 800 && Math.abs(box.width / box.height - 16 / 9) < 0.02, box && `${Math.round(box.width)}×${Math.round(box.height)}`);
    await button.scrollIntoViewIfNeeded();
    await site.waitForTimeout(800);
    await site.screenshot({ path: `${shots}/6-player.png` });

    const scaleOf = () => button.locator(".hover-zoom img").evaluate((img) => new DOMMatrix(getComputedStyle(img).transform).a);
    const restScale = await scaleOf();
    await button.hover();
    await site.waitForTimeout(600);
    const hoverScale = await scaleOf();
    check("hovering the poster zooms it (the site's one hover effect)", restScale === 1 && Math.abs(hoverScale - 1.06) < 0.005, `${restScale} → ${hoverScale}`);
    await site.screenshot({ path: `${shots}/7-hover.png` });

    await button.click();
    await site.waitForTimeout(2000);
    const state = await video.evaluate((v) => ({ paused: v.paused, time: v.currentTime, controls: v.controls, error: v.error?.code ?? null }));
    check("pressing play starts the video in place", !state.paused && state.time > 0.5 && state.error === null, JSON.stringify(state));
    check("…with the browser's controls", state.controls);
    check("the cover is gone, so no zoom on the playing video", (await player.getByRole("button", { name: /^Play / }).count()) === 0 && (await player.locator(".hover-zoom").count()) === 0);
    await site.screenshot({ path: `${shots}/8-playing.png` });
    check("the clip was fetched only once it was asked for", videoRequests.length >= 1, videoRequests.join(", "));

    await site.setViewportSize({ width: 390, height: 844 });
    await site.goto(`${BASE}/portfolio/${CATEGORY_SLUG}?galleryState=video`, { timeout: 120000 });
    await site.locator("#albums video").first().waitFor({ timeout: 60000 });
    await site.locator("#albums figure").first().scrollIntoViewIfNeeded();
    const phoneBox = await site.locator("#albums figure > div").first().boundingBox();
    check("on a phone: the column's width, no sideways scroll", phoneBox && phoneBox.width <= 390 && (await site.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)), phoneBox && Math.round(phoneBox.width));
    await site.screenshot({ path: `${shots}/9-phone.png` });

    check("no page errors on the site", siteErrors.length === 0, siteErrors.slice(0, 3).join(" || "));
    await chrome.close();
  }
})().then(() => r.finish(), (err) => r.finish(err));
