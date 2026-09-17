import { ImageResponse } from "next/og";
import { getSiteSettings } from "@/lib/site-settings";
import { loadGoogleFont } from "@/lib/og-fonts";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

// Mirrors globals.css's --color-ink / --color-canvas — this renderer runs
// outside the page's CSS cascade, so the values are copied rather than
// referenced.
const INK = "#171614";
const CANVAS = "#FAF9F6";

export default async function Icon() {
  const { faviconUrl } = await getSiteSettings();

  if (faviconUrl) {
    const response = await fetch(faviconUrl);
    return new Response(await response.arrayBuffer(), {
      headers: {
        "Content-Type": response.headers.get("Content-Type") ?? contentType,
      },
    });
  }

  // Placeholder mark: the Wordmark's leading letter, set in Fraunces where
  // it renders; a plain bold sans-serif "H" is legible enough at 32x32 if
  // the font fetch fails.
  const fraunces = await loadGoogleFont("Fraunces", 600, "H");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: INK,
          color: CANVAS,
          fontSize: 20,
          fontFamily: fraunces ? "Fraunces" : "sans-serif",
          fontWeight: 600,
        }}
      >
        H
      </div>
    ),
    {
      ...size,
      fonts: fraunces
        ? [{ name: "Fraunces", data: fraunces, weight: 600, style: "normal" }]
        : undefined,
    },
  );
}
