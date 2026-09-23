type InstagramIconProps = {
  className?: string;
};

/** Grid badge marking a "reel_embed" tile as a link out to Instagram,
 * rather than something that opens the lightbox — same glyph as the
 * homepage Instagram section's "Follow along" link. */
export default function InstagramIcon({ className = "h-3 w-3" }: InstagramIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="12" cy="12" r="4.2" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
    </svg>
  );
}
