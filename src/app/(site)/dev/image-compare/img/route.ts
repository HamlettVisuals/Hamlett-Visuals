import type { NextRequest } from "next/server";

// TEMPORARY, dev only — the image source for /dev/image-compare. Asks
// Next's own image optimizer (/_next/image) for the file, with an Accept
// header of just one format, so the page can show the same photo as AVIF
// and as WebP side by side. next/image otherwise always gets whichever
// format the browser prefers. 404s outside `next dev`.

const FORMATS = new Set(["avif", "webp"]);

export async function GET(request: NextRequest) {
  if (process.env.NODE_ENV !== "development") return new Response(null, { status: 404 });

  const { searchParams, origin } = request.nextUrl;
  const format = searchParams.get("fmt") ?? "";
  const url = searchParams.get("url");
  if (!FORMATS.has(format) || !url) return new Response("Needs ?url= and ?fmt=avif|webp", { status: 400 });

  const target = new URL("/_next/image", origin);
  target.searchParams.set("url", url);
  target.searchParams.set("w", searchParams.get("w") ?? "640");
  target.searchParams.set("q", searchParams.get("q") ?? "90");

  const response = await fetch(target, { headers: { accept: `image/${format}` }, cache: "no-store" });
  return new Response(response.body, {
    status: response.status,
    headers: {
      "content-type": response.headers.get("content-type") ?? "application/octet-stream",
      "cache-control": "no-store",
    },
  });
}
