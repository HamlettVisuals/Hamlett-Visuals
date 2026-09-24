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
    const scrollMargin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    window.scrollTo({
      top: target.getBoundingClientRect().top + window.scrollY - scrollMargin,
      behavior: prefersReducedMotion ? "auto" : "smooth",
    });
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
      window.clearTimeout(clearHashTimeout);
      window.clearTimeout(removeTimeout);
      target.classList.remove(HIGHLIGHT_CLASS);
    };
  }, []);

  return null;
}
