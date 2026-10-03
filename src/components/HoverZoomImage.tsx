import Image from "next/image";
import { focalPosition, type FocalPhoto } from "@/lib/focal-position";

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
  /**
   * The photo's focal point and stored size (a Payload upload has all four
   * fields). The crop is then centred on the focal point as far as the frame
   * allows (lib/focal-position.ts); with no focal point set, that's the
   * centre, same as leaving this off.
   */
  focal?: FocalPhoto;
  /**
   * Skip the image optimizer and load the file itself. For Live Preview's
   * unsaved photos only (see lib/use-scoped-live-preview.ts `live`).
   */
  unoptimized?: boolean;
};

/**
 * The site-wide photo treatment: a fixed-size, overflow-hidden frame with the
 * image cropped to fill it. On a fine pointer, hovering the frame scales the
 * image to --zoom-scale over --zoom-duration with --ease-standard. This is the
 * ONE deliberate hover effect on Hamlett Visuals — never pair it with a lift,
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
  focal,
  unoptimized = false,
}: HoverZoomImageProps) {
  return (
    // A size container, so the focal position's cqw/cqh are this frame's.
    <div className={`hover-zoom ${className}`} style={focal ? { containerType: "size" } : undefined}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        quality={quality}
        unoptimized={unoptimized}
        className="object-cover"
        style={focal ? { objectPosition: focalPosition(focal) } : undefined}
      />
    </div>
  );
}
