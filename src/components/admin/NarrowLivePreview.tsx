"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";

// On phones (and anything up to Payload's 1024px mid-break, where an open
// Live Preview takes the whole width and squeezes the form to nothing),
// every editor opens on its fields, with the preview one tap away on the
// eye button. Wider screens are untouched: an editor that opens with the
// preview (livePreview.openByDefault, or because she left it open) still
// does.
//
// Payload's own open/closed state can't be used for this: it's one setting
// per editor, saved as her preference (payload-preferences, editViewType)
// on every change and read on the server when the page loads, so closing
// the preview on a phone would close it on her desktop too. Instead
// Payload is left "previewing" as it chose, and on narrow screens this
// keeps a separate, unsaved switch, `data-narrow-preview="shown"` on <html>:
//   - it starts off on every page, so the fields show and the preview is
//     hidden (admin-overrides.css, "Live Preview on narrow screens");
//   - while Payload is previewing, a tap on the eye button flips it instead
//     of reaching Payload (caught on the way down, before React sees the
//     click), so nothing is saved; the button then reads "Show preview" /
//     "Hide preview" and shows the matching icon;
//   - while Payload isn't previewing, the tap goes through as usual (Payload
//     opens the preview and saves that, as it always has) and the switch
//     turns on, so the preview it opens is shown.
// Mounted once for the whole studio (admin.components.providers in
// payload.config.ts).

const NARROW = "(max-width: 1024px)";
const TOGGLER = ".live-preview-toggler";
const ACTIVE = "live-preview-toggler--active";

const isNarrow = () => window.matchMedia(NARROW).matches;

// The eye button's name for what a tap does on a narrow screen. Payload
// names it from its own state ("Exit Live Preview" while previewing),
// which is wrong while the fields are showing. Left alone on wide screens
// and when Payload isn't previewing.
function labelTogglers(shown: boolean) {
  for (const toggler of document.querySelectorAll<HTMLElement>(TOGGLER)) {
    const narrowLabel = toggler.classList.contains(ACTIVE) && isNarrow() ? (shown ? "Hide preview" : "Show preview") : null;
    const current = toggler.getAttribute("aria-label");
    if (narrowLabel) {
      if (current === narrowLabel) continue;
      // Payload's own, to put back if the screen widens.
      if (current !== "Hide preview" && current !== "Show preview") toggler.dataset.payloadLabel = current ?? "";
      toggler.setAttribute("aria-label", narrowLabel);
      toggler.setAttribute("title", narrowLabel);
    } else if (toggler.dataset.payloadLabel !== undefined && (current === "Hide preview" || current === "Show preview")) {
      toggler.setAttribute("aria-label", toggler.dataset.payloadLabel);
      toggler.setAttribute("title", toggler.dataset.payloadLabel);
    }
  }
}

export default function NarrowLivePreview({ children }: { children?: ReactNode }) {
  const pathname = usePathname();
  // Shown only on the page it was turned on for, so every page (and every
  // return to one) opens on the fields.
  const [shownOn, setShownOn] = useState<string | null>(null);
  const shown = shownOn !== null && shownOn === pathname;

  useEffect(() => {
    const root = document.documentElement;
    if (shown) root.dataset.narrowPreview = "shown";
    else delete root.dataset.narrowPreview;
    labelTogglers(shown);
    // Payload re-renders the button (and resets its name) whenever its own
    // state changes, and a new page brings a new one.
    const observer = new MutationObserver(() => labelTogglers(shown));
    observer.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["class"] });
    const media = window.matchMedia(NARROW);
    const onResize = () => labelTogglers(shown);
    media.addEventListener("change", onResize);
    return () => {
      observer.disconnect();
      media.removeEventListener("change", onResize);
    };
  }, [shown]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const toggler = (event.target as Element | null)?.closest?.(TOGGLER);
      if (!toggler || !isNarrow()) return;
      if (toggler.classList.contains(ACTIVE)) {
        event.preventDefault();
        event.stopPropagation();
        setShownOn((current) => (current === pathname ? null : pathname));
      } else {
        setShownOn(pathname);
      }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [pathname]);

  return <>{children}</>;
}
