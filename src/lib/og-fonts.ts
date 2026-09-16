// Fetches a Google Font as raw TrueType/OpenType bytes for next/og's
// ImageResponse, which can't load a font the way a browser <link> does and
// only accepts ttf/otf/woff data. Scoping the request to `text` (rather than
// a whole subset) keeps the fetch small — callers only ever render a few
// known words. Returns null on any failure so callers can fall back to a
// system font instead of failing the whole image.

export async function loadGoogleFont(
  family: string,
  weight: number,
  text: string,
): Promise<ArrayBuffer | null> {
  try {
    const params = new URLSearchParams({
      family: `${family}:wght@${weight}`,
      text,
    });
    const css = await fetch(
      `https://fonts.googleapis.com/css2?${params.toString()}`,
    ).then((res) => res.text());

    const match = css.match(
      /src: url\((.+?)\) format\('(?:opentype|truetype)'\)/,
    );
    if (!match) return null;

    const fontResponse = await fetch(match[1]);
    if (!fontResponse.ok) return null;

    return await fontResponse.arrayBuffer();
  } catch {
    return null;
  }
}
