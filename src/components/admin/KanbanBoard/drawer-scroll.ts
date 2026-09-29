// Makes a Payload Drawer's content touch-scrollable on phones. Attached as
// a callback ref on an element inside the drawer (DetailDrawer.tsx); styles
// that go with it are under .kanban-detail-drawer in admin-overrides.css.
//
// Why it's needed: Payload's Drawer is a @faceless-ui/modal Modal, which
// locks the page behind it with body-scroll-lock, handing it the drawer's
// outer <dialog class="drawer"> as the one element allowed to scroll. But
// that element is overflow: hidden and never scrolls — the element that
// does is .drawer__content-children inside it. On iOS the lock then
// cancels every touchmove: the dialog's own ontouchmove sees an element
// that is always "at the top and at the bottom", and a non-passive
// document listener catches the rest. So no swipe inside the drawer ever
// scrolls it.
//
// The fix does what the lock meant to do, for the right element: a
// touchmove inside the real scroller stops there, before either of the
// lock's handlers sees it, so the browser scrolls it natively. Touches
// anywhere else (the dimmed page, the backdrop) still reach the lock, so
// the page behind stays put. overscroll-behavior: contain (CSS) keeps a
// swipe past the end from carrying over to the page.
//
// It also sizes the drawer to the *visible* viewport (visualViewport),
// not the layout one: an on-screen keyboard shrinks only the visible area,
// so a 100dvh drawer would leave its lower part — and whatever field is
// being typed in — under the keyboard, out of reach of any scroll.
export function drawerScrollRef(inside: HTMLElement | null) {
  const scroller = inside?.closest<HTMLElement>(".drawer__content-children");
  const dialog = inside?.closest<HTMLElement>(".drawer");
  if (!scroller || !dialog) return;

  const stopAtScroller = (event: TouchEvent) => event.stopPropagation();
  scroller.addEventListener("touchmove", stopAtScroller, { passive: true });

  const viewport = window.visualViewport;
  const fitToViewport = () => {
    if (!viewport) return;
    dialog.style.setProperty("--kanban-drawer-top", `${viewport.offsetTop}px`);
    dialog.style.setProperty("--kanban-drawer-height", `${viewport.height}px`);
  };
  fitToViewport();
  viewport?.addEventListener("resize", fitToViewport);
  viewport?.addEventListener("scroll", fitToViewport);

  return () => {
    scroller.removeEventListener("touchmove", stopAtScroller);
    viewport?.removeEventListener("resize", fitToViewport);
    viewport?.removeEventListener("scroll", fitToViewport);
  };
}
