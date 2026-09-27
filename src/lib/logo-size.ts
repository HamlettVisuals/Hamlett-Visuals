// Logo sizes for the header (Nav.tsx) and footer (Footer.tsx), shared by the
// Site Settings fields (globals/SiteSettings.ts), their slider
// (components/admin/LogoSizeField.tsx) and the Wordmark that draws them.
//
// The header is a fixed height (not sized by its contents): 72px from the
// `header:` breakpoint (1024px) up, 76px below it — what it measured before
// it was fixed, at the default 40px logo with the Book button (desktop) or
// the 44px menu button (phones). The logo is capped 8px short of it, so it
// can never make the header taller. Nav.tsx and Wordmark.tsx write these as
// Tailwind literals (h-[72px], 64px, 68px) — keep them in step.
export const HEADER_HEIGHT = { desktop: 72, mobile: 76 } as const;

export const HEADER_LOGO = {
  min: 28,
  max: HEADER_HEIGHT.desktop - 8, // 64
  // Below `header:` the logo is drawn at 80% of the setting, clamped to this.
  mobileMax: HEADER_HEIGHT.mobile - 8, // 68
  default: 40,
} as const;

export const FOOTER_LOGO = { min: 32, max: 120, default: 56 } as const;
