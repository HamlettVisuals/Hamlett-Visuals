import Image from "next/image";

type HoverZoomImageProps = {
  src: string;
  alt: string;
  /**
   * Responsive `sizes` hint for next/image, e.g.
   * "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 320px".
   */
  sizes: string;
  /**
   * Classes for the fixed-size crop frame. Set an aspect ratio or an explicit
   * height here — the frame has no intrinsic size. e.g. "aspect-[4/5]", "h-64".
   */
  className?: string;
  priority?: boolean;
  quality?: number;
  /** object-position for the crop, e.g. "center", "top", "50% 30%". */
  objectPosition?: string;
};

/**
 * The site-wide photo treatment: a fixed-size, overflow-hidden frame with the
 * image cropped to fill it. On a fine pointer, hovering the frame scales the
 * image to --zoom-scale over --zoom-duration with --ease-standard. This is the
 * ONE deliberate hover effect on Hamlet Visuals — never pair it with a lift,
 * shadow, or colour shift. It is disabled under prefers-reduced-motion and on
 * touch devices (see the .hover-zoom rules in globals.css).
 *
 * Use it for every photo thumbnail: category tiles, event tiles, gallery grids,
 * offer-row galleries, Instagram tiles. Sizing lives on the frame:
 *
 *   <HoverZoomImage src={photo.url} alt="" sizes="25vw" className="aspect-[4/5]" />
 *
 * For hand-written markup that can't use this component, add the `hover-zoom`
 * class to an overflow-hidden element wrapping a plain <img>; the CSS handles
 * the rest.
 */
export default function HoverZoomImage({
  src,
  alt,
  sizes,
  className = "",
  priority = false,
  quality = 90,
  objectPosition,
}: HoverZoomImageProps) {
  return (
    <div className={`hover-zoom ${className}`}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        className="object-cover"
        style={objectPosition ? { objectPosition } : undefined}
      />
    </div>
  );
}
