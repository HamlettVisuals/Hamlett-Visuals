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
// `#live-preview:<element id>` (see globals/Hero.ts), and this component
// reads that hash once on mount, scrolls the matching element into view,
// and briefly outlines it via the .live-preview-highlight class (see
// globals.css). Only ever set by Payload's own Live Preview URL function —
// not a real, navigable link anywhere on the site.
export default function LivePreviewHighlight() {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash.startsWith(HASH_PREFIX)) return;

    const targetId = hash.slice(HASH_PREFIX.length);
    const target = document.getElementById(targetId);
    if (!target) return;

    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    target.scrollIntoView({
      behavior: prefersReducedMotion ? "auto" : "smooth",
      block: "start",
    });
    target.classList.add(HIGHLIGHT_CLASS);

    // Clears the marker so it can't re-trigger on back/forward navigation
    // and doesn't linger in the (invisible, iframed) address bar.
    window.history.replaceState(
      null,
      "",
      window.location.pathname + window.location.search,
    );

    const timeout = window.setTimeout(() => {
      target.classList.remove(HIGHLIGHT_CLASS);
    }, HIGHLIGHT_DURATION_MS);

    return () => window.clearTimeout(timeout);
  }, []);

  return null;
}
