import QRCode from "qrcode";

// Inline SVG QR code for the Instagram profile URL, shown in the footer.
//
// Generated with the bundled `qrcode` package — no runtime network call.
// Takes the URL as a parameter (rather than importing a static constant)
// since it now comes from the Site Settings global and can change; keyed by
// URL so repeat calls with the same value (the common case) still avoid
// regenerating the SVG.
//
// The colours are spelled out because QRCode can't read CSS custom properties
// (same hardcode-with-a-note approach the Hero scrim uses): --color-ink
// (#171614) for the modules, and --color-canvas-tint (#f0eeeb) for the quiet
// zone so the code blends into the tinted footer it sits in.
const cache = new Map<string, Promise<string>>();

export function getInstagramQrSvg(url: string): Promise<string> {
  let svg = cache.get(url);
  if (!svg) {
    svg = QRCode.toString(url, {
      type: "svg",
      // One module of quiet zone — just enough to stay scannable while the
      // code still reads as filling its hairline frame in the footer.
      margin: 1,
      width: 128,
      color: { dark: "#171614", light: "#f0eeeb" },
      errorCorrectionLevel: "M",
    });
    cache.set(url, svg);
  }
  return svg;
}
