import QRCode from "qrcode";
import { instagram } from "@/lib/site-content";

// Inline SVG QR code for the Instagram profile URL, shown in the footer.
//
// Generated with the bundled `qrcode` package — no runtime network call. The
// promise is memoised at module scope so it runs once per server process, and
// since every page that renders the footer is static it is effectively baked
// in at build time.
//
// The colours are spelled out because QRCode can't read CSS custom properties;
// they mirror --color-ink (#171614) on --color-canvas (#faf9f6), the same
// hardcode-with-a-note approach the Hero scrim uses.
let cached: Promise<string> | undefined;

export function getInstagramQrSvg(): Promise<string> {
  cached ??= QRCode.toString(instagram.url, {
    type: "svg",
    // One module of quiet zone — just enough to stay scannable while the code
    // still reads as filling its hairline frame in the footer.
    margin: 1,
    width: 128,
    color: { dark: "#171614", light: "#faf9f6" },
    errorCorrectionLevel: "M",
  });
  return cached;
}
