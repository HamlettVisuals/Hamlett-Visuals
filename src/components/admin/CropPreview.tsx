"use client";

import Image from "next/image";
import { useFormFields, useUploadEdits } from "@payloadcms/ui";
import { focalPosition } from "@/lib/focal-position";

// "Crop preview" on a photo's edit page: the photo in small frames shaped
// like every place the site crops it. Every one of those crops is centred on
// the focal point by lib/focal-position.ts in a size container, and so is
// each frame here, so a frame is the live crop scaled down.
//
// The focal point is Payload's Edit Image drawer's, which keeps it in its
// own state until "Apply Changes". That lands in the upload-edits context
// (not yet saved), which is read here first, so the frames change as soon
// as she applies, before Save; otherwise the saved focalX/focalY from the
// form. Payload gives no way to add to the drawer itself, so the preview
// sits right under the file box, at the top of the form.
//
// A pending crop isn't drawn: the frames use the stored file until Save
// writes the cropped one, and say so.

type Frame = {
  label: string;
  /** Where the size comes from, shown under the label. */
  detail: string;
  /** The frame's width and height in px (or just its aspect ratio). */
  width: number;
  height: number;
};

// Measured on the live page (Chrome, Windows, 15px scrollbar): the hero is
// the full width by 88svh.
const FRAMES: Frame[] = [
  { label: "Hero — desktop", detail: "1920×945 screen", width: 1905, height: 832 },
  { label: "Hero — laptop", detail: "1440×790 screen", width: 1425, height: 695 },
  { label: "Hero — phone", detail: "390×844 screen, unless the slide has a mobile image", width: 390, height: 743 },
  { label: "Studio thumbnail", detail: "400×400, cut when you Save", width: 400, height: 400 },
  { label: "Category tile", detail: "Homepage, 9:16", width: 9, height: 16 },
  { label: "Popular offer — desktop", detail: "From 1024px, 3:4", width: 3, height: 4 },
  { label: "Popular offer — phone", detail: "Below 1024px, 4:3", width: 4, height: 3 },
  { label: "Testimonial", detail: "Testimonials page (and the sparse photo grid), 4:5", width: 4, height: 5 },
  { label: "Lightbox thumbnail", detail: "Strip under the big photo, 52×68", width: 52, height: 68 },
];

// Every frame is drawn this tall; its width follows its shape.
const FRAME_HEIGHT = 120;

export default function CropPreview() {
  const { url, width, height, focalX, focalY } = useFormFields(([fields]) => ({
    url: fields.url?.value as string | undefined,
    width: fields.width?.value as number | undefined,
    height: fields.height?.value as number | undefined,
    focalX: fields.focalX?.value as number | undefined,
    focalY: fields.focalY?.value as number | undefined,
  }));
  const { uploadEdits } = useUploadEdits();

  if (!url) {
    return (
      <div className="field-type crop-preview">
        <p className="field-label">Crop preview</p>
        <p className="crop-preview__note">Upload the photo and save to see how the site crops it.</p>
      </div>
    );
  }

  const photo = {
    focalX: uploadEdits?.focalPoint?.x ?? focalX,
    focalY: uploadEdits?.focalPoint?.y ?? focalY,
    width,
    height,
  };
  const position = focalPosition(photo);
  const pendingFocal = Boolean(uploadEdits?.focalPoint) &&
    (uploadEdits.focalPoint?.x !== focalX || uploadEdits.focalPoint?.y !== focalY);
  // Apply Changes always sends a crop box, the whole photo when she didn't
  // crop; only a smaller box changes the file.
  const crop = uploadEdits?.crop;
  const [fullWidth, fullHeight] = crop?.unit === "px" ? [width ?? 0, height ?? 0] : [100, 100];
  const pendingCrop = Boolean(crop) &&
    (crop!.x > 0.5 || crop!.y > 0.5 || crop!.width < fullWidth - 0.5 || crop!.height < fullHeight - 0.5);

  return (
    <div className="field-type crop-preview">
      <p className="field-label">Crop preview</p>
      <p className="crop-preview__note">
        How this photo is cropped around the site. Use Edit Image above to move the focal point; these update when you
        click Apply Changes.
        {pendingFocal && " Showing your new focal point — Save to put it on the site."}
        {pendingCrop && " Your crop isn't shown here until you Save."}
      </p>
      <div className="crop-preview__group">
        <p className="crop-preview__group-title">Follows the focal point</p>
        <ul className="crop-preview__frames">
          {FRAMES.map((frame) => (
            <li key={frame.label} className="crop-preview__item">
              <div
                className="crop-preview__frame"
                style={{
                  width: Math.round((FRAME_HEIGHT * frame.width) / frame.height),
                  height: FRAME_HEIGHT,
                }}
              >
                <Image
                  src={url}
                  alt=""
                  fill
                  // Frames are at most ~280px wide; 2× for sharp screens.
                  sizes="560px"
                  style={{
                    objectFit: "cover",
                    objectPosition: position,
                  }}
                />
              </div>
              <p className="crop-preview__label">{frame.label}</p>
              <p className="crop-preview__detail">{frame.detail}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
