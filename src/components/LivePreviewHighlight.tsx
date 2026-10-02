"use client";

import { useEffect } from "react";

const HASH_PREFIX = "#live-preview:";
const HIGHLIGHT_CLASS = "live-preview-highlight";
const HIGHLIGHT_DURATION_MS = 1800;

// Payload's Live Preview iframe just loads a plain URL — there's no
// postMessage channel to react to until the page has mounted and called
// useLivePreview()'s ready() handshake, and even then that channel only
// carries field data, not "which section is being edited". So "scroll to
// and highlight the section" is driven by the URL itself instead: a
// global's admin.livePreview.url can point here with
// `#live-preview:<element id>` (see globals/Hero.ts), or a comma-separated
// list of ids to try in order, and this component
// reads that hash once on mount, scrolls the matching element into view,
// and briefly outlines it via the .live-preview-highlight class (see
// globals.css). Only ever set by Payload's own Live Preview URL function —
// not a real, navigable link anywhere on the site.
// How far below the viewport top the target should land: clear of the
// sticky header (components/Nav.tsx, #site-header), measured live since it's
// taller on phones than on desktop, so the section's top edge (and the
// highlight outline drawn inside it) sits just under it. window.scrollTo ignores html's scroll-padding-top (that
// only applies to anchor jumps), so it's added here. A target's own
// scroll-margin-top still wins if larger. The header itself, or anything
// inside it, needs no offset.
function headerOffset(target: HTMLElement): number {
  const ownMargin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
  const header = document.getElementById("site-header");
  if (!header || header.contains(target) || target.contains(header)) return ownMargin;
  const { position } = getComputedStyle(header);
  if (position !== "sticky" && position !== "fixed") return ownMargin;
  return Math.max(ownMargin, header.getBoundingClientRect().height);
}

export default function LivePreviewHighlight() {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash.startsWith(HASH_PREFIX)) return;

    // A comma-separated list tries each id in turn, e.g. a category's tile
    // then the whole section (Categories.ts), for when the tile isn't
    // rendered (hidden or no cover photo yet).
    const target = hash
      .slice(HASH_PREFIX.length)
      .split(",")
      .map((id) => document.getElementById(decodeURIComponent(id)))
      .find((el): el is HTMLElement => el !== null);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // window.scrollTo rather than target.scrollIntoView(): inside the
    // same-origin preview iframe, scrollIntoView also scrolls every
    // scrollable ancestor in the admin page around it — it was pushing the
    // admin's Live Preview toolbar and the whole edit screen out of view.
    const scrollToTarget = () =>
      window.scrollTo({
        top: target.getBoundingClientRect().top + window.scrollY - headerOffset(target),
        behavior: prefersReducedMotion ? "auto" : "smooth",
      });
    // Payload keeps the preview iframe hidden until it has loaded, so on a
    // first open this can run while the frame has no height and the scroll
    // would do nothing. Then it waits for the frame to be shown.
    const onResize = () => {
      if (window.innerHeight === 0) return;
      window.removeEventListener("resize", onResize);
      scrollToTarget();
    };
    if (window.innerHeight > 0) scrollToTarget();
    else window.addEventListener("resize", onResize);
    target.classList.add(HIGHLIGHT_CLASS);

    // Clears the marker so it can't re-trigger on back/forward navigation
    // and doesn't linger in the (invisible, iframed) address bar. Deferred
    // to a macrotask rather than called synchronously here: instrumenting
    // window.history.replaceState showed Next's own App Router re-asserts
    // its internally-tracked canonical URL (hash included) back onto the
    // history entry from its own commit-phase effects — confirmed happening
    // right after a same-tick replaceState call here cleared it, under dev
    // Strict Mode's second effect pass. (router.replace() doesn't avoid
    // this either — tried it, and it goes further: replacing to the same
    // path still runs Next through a soft navigation, which re-fetches and
    // remounts the tree, undoing the scroll/highlight above entirely.)
    // setTimeout(0) runs after that synchronous commit work has settled, so
    // this is the one that actually sticks.
    const clearHash = () => {
      if (!window.location.hash.startsWith(HASH_PREFIX)) return;
      window.history.replaceState(
        null,
        "",
        window.location.pathname + window.location.search,
      );
    };
    const clearHashTimeout = window.setTimeout(clearHash, 0);

    const removeTimeout = window.setTimeout(() => {
      target.classList.remove(HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION_MS);

    // Symmetric with the mount above — undoes exactly what it did (the
    // class and both pending timeouts) — so if dev Strict Mode's
    // mount -> cleanup -> mount runs this twice, the second mount redoes
    // the work cleanly (reading the still-untouched hash straight off
    // window.location, same as the first) instead of leaving a class with
    // no timer left to remove it.
    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(clearHashTimeout);
      window.clearTimeout(removeTimeout);
      target.classList.remove(HIGHLIGHT_CLASS);
    };
  }, []);

  return null;
}
