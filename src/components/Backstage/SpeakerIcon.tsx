type SpeakerIconProps = {
  muted: boolean;
  className?: string;
};

/** Mute/unmute glyph for BackstageLightbox's custom video controls. */
export default function SpeakerIcon({
  muted,
  className = "h-4 w-4",
}: SpeakerIconProps) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" className={className}>
      <path d="M2 6v4h2.5L8 12.5v-9L4.5 6H2Z" fill="currentColor" />
      {muted ? (
        <path
          d="M10.5 6.3l3 3.4m0-3.4-3 3.4"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      ) : (
        <path
          d="M10.2 5.2a3.4 3.4 0 0 1 0 5.6"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
          fill="none"
        />
      )}
    </svg>
  );
}
