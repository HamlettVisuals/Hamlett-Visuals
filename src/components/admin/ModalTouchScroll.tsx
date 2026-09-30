"use client";

import { useEffect, type ReactNode } from "react";

// Touch scrolling inside every drawer and modal in the studio, on iPhones.
// Mounted once for the whole admin (admin.components.providers in
// payload.config.ts), so any drawer or modal, now or later, works: Payload's
// own (a photo's "Edit photo details", upload fields' Create New and Choose
// from existing, relationship and rich-text drawers, bulk upload, Edit
// Image, confirmations) and ours (Add existing photos, Add to album, the
// kanban drawers).
//
// The bug: every Payload drawer and modal is a @faceless-ui/modal Modal,
// which locks the page behind it with body-scroll-lock, naming the modal's
// outer <dialog> as the one element allowed to scroll. That element never
// scrolls (the part that does is further in, and differs by drawer: a
// document drawer's .gutter, a list drawer's table, our drawers'
// .drawer__content-children). On iPhones the lock then cancels every
// touchmove inside it: the dialog's own ontouchmove sees an element that's
// always "at the top and the bottom", and a listener on the document
// catches the rest. So no swipe inside a drawer scrolled it.
//
// The fix does what the lock meant to do, for the right element. When a
// touch starts inside an open drawer or modal, the nearest element under it
// that can scroll gets a touchmove listener that stops the event there,
// before either of the lock's handlers sees it, so the browser scrolls it
// natively; overscroll-behavior: contain keeps a swipe past its end from
// carrying on to the page. Touches anywhere else (the backdrop, a part that
// doesn't scroll) still reach the lock, so the page behind stays put. A
// touch that starts on a drag handle (dnd-kit's sortable handles) is left
// alone, so dragging inside a drawer still works.
//
// It also keeps each drawer to the *visible* viewport (--visual-viewport-*
// on the root, used in admin-overrides.css): an on-screen keyboard shrinks
// only the visible area, so a full-height drawer would leave its lower part,
// and the field being typed in, under the keyboard.

const MODAL = ".payload__modal-container > .payload__modal-item";
const DRAG_HANDLE = "[aria-roledescription='sortable'], [data-dnd-draggable]";

const handled = new WeakSet<HTMLElement>();
let gestureOnDragHandle = false;

// Stops a touchmove at the scroller unless this gesture is a drag.
function stopAtScroller(event: TouchEvent) {
  if (!gestureOnDragHandle) event.stopPropagation();
}

function scrolls(el: HTMLElement, axis: "y" | "x") {
  const style = getComputedStyle(el);
  const overflow = axis === "y" ? style.overflowY : style.overflowX;
  if (!/(auto|scroll)/.test(overflow)) return false;
  return axis === "y" ? el.scrollHeight > el.clientHeight + 1 : el.scrollWidth > el.clientWidth + 1;
}

// The nearest element between the touch and the modal that can scroll,
// preferring one that scrolls up and down.
function scrollerFor(target: Element, modal: Element): HTMLElement | null {
  let sideways: HTMLElement | null = null;
  for (let el = target instanceof HTMLElement ? target : target.parentElement; el && el !== modal; el = el.parentElement) {
    if (scrolls(el, "y")) return el;
    if (!sideways && scrolls(el, "x")) sideways = el;
  }
  return sideways;
}

function onTouchStart(event: TouchEvent) {
  const target = event.target as Element | null;
  const modal = target?.closest?.(MODAL);
  if (!target || !modal) return;
  gestureOnDragHandle = Boolean(target.closest(DRAG_HANDLE));
  const scroller = scrollerFor(target, modal);
  if (!scroller || handled.has(scroller)) return;
  handled.add(scroller);
  scroller.addEventListener("touchmove", stopAtScroller, { passive: true });
  if (scrolls(scroller, "y")) scroller.style.overscrollBehavior = "contain";
}

export default function ModalTouchScroll({ children }: { children?: ReactNode }) {
  useEffect(() => {
    // Capture, so it runs before anything inside can stop the touchstart.
    document.addEventListener("touchstart", onTouchStart, { capture: true, passive: true });

    const viewport = window.visualViewport;
    const root = document.documentElement;
    const fitToViewport = () => {
      if (!viewport) return;
      root.style.setProperty("--visual-viewport-top", `${viewport.offsetTop}px`);
      root.style.setProperty("--visual-viewport-height", `${viewport.height}px`);
    };
    fitToViewport();
    viewport?.addEventListener("resize", fitToViewport);
    viewport?.addEventListener("scroll", fitToViewport);

    return () => {
      document.removeEventListener("touchstart", onTouchStart, { capture: true });
      viewport?.removeEventListener("resize", fitToViewport);
      viewport?.removeEventListener("scroll", fitToViewport);
    };
  }, []);

  return <>{children}</>;
}
