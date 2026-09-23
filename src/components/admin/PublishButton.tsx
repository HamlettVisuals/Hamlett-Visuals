"use client";

import { SaveButton } from "@payloadcms/ui";

// The one button on every website-editor Global (wired via each global's
// admin.components.elements.SaveButton). Drafts are off on those globals,
// so Payload's plain Save already writes straight to the live site — this
// only relabels it so that's obvious. Collections keep "Save": most of them
// have their own "Published" checkbox, so saving doesn't always mean live.
export default function PublishButton() {
  return <SaveButton label="Publish" />;
}
