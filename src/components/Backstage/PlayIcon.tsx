type PlayIconProps = {
  className?: string;
};

/** Shared triangle glyph for both the grid's small play badge and the
 * lightbox's larger play button. */
export default function PlayIcon({ className = "h-4 w-4" }: PlayIconProps) {
  return (
    <svg
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M5 3.3v9.4a.6.6 0 0 0 .92.5l7.4-4.7a.6.6 0 0 0 0-1l-7.4-4.7a.6.6 0 0 0-.92.5Z" />
    </svg>
  );
}
