import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/site-settings";
import { loadGoogleFont } from "@/lib/og-fonts";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const SITE_NAME = "Hamlett Visuals";
const TAGLINE = "Weddings, portraits, pets, and more — captured as they happen.";

// Mirrors globals.css's --color-canvas / --color-ink / --color-muted — this
// renderer runs outside the page's CSS cascade, so the values are copied
// rather than referenced.
const CANVAS = "#FAF9F6";
const INK = "#171614";
const MUTED = "#5F5B52";

// The asset doesn't depend on request data, so it's read once at module
// scope (see Next.js's "Predictable values" guidance).
const settings = await getSiteSettings();

export const alt = settings.ogImageAlt;

export default async function Image() {
  if (settings.ogImageUrl) {
    const response = await fetch(settings.ogImageUrl);
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? contentType,
      },
    });
  }

  const [fraunces, inter] = await Promise.all([
    loadGoogleFont("Fraunces", 500, SITE_NAME),
    loadGoogleFont("Inter", 400, TAGLINE),
  ]);

  const fonts: { name: string; data: ArrayBuffer; weight: 400 | 500; style: "normal" }[] = [];
  if (fraunces) fonts.push({ name: "Fraunces", data: fraunces, weight: 500, style: "normal" });
  if (inter) fonts.push({ name: "Inter", data: inter, weight: 400, style: "normal" });

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 24,
          background: CANVAS,
        }}
      >
        <div
          style={{
            fontSize: 96,
            color: INK,
            fontFamily: fraunces ? "Fraunces" : "serif",
            fontWeight: 500,
            letterSpacing: "-0.02em",
          }}
        >
          {SITE_NAME}
        </div>
        <div
          style={{
            fontSize: 32,
            color: MUTED,
            fontFamily: inter ? "Inter" : "sans-serif",
          }}
        >
          {TAGLINE}
        </div>
      </div>
    ),
    {
      ...size,
      fonts,
    },
  );
}
