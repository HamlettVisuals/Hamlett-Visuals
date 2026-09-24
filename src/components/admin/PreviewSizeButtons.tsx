"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useLivePreviewContext } from "@payloadcms/ui";

// Desktop / Tablet / Phone buttons for the Live Preview toolbar, replacing
// Payload's breakpoint dropdown, width × height boxes and zoom menu (hidden
// in admin-overrides.css). Mounted through beforeDocumentControls on every
// screen with Live Preview — Payload has no slot inside the toolbar itself,
// so the buttons are portaled into it; they drive the same Live Preview
// state (breakpoint, size, zoom) the hidden controls did.
//
// Each button shows the site at that device's real width (the breakpoints
// in payload.config.ts), zoomed out when the preview pane is narrower —
// e.g. Desktop's 1440px shrunk to fit a ~870px pane — so the whole header
// stays visible. The frame fills the pane's height.
//
// On a phone-sized admin screen the preview already takes the full screen
// (behind the eye toggle), and anything but the phone layout would be
// unreadably small, so the buttons are hidden there and the preview simply
// fills the screen.

type Device = "desktop" | "tablet" | "phone";

const devices: { name: Device; label: string; breakpoint: string }[] = [
  { name: "desktop", label: "Desktop", breakpoint: "desktop" },
  { name: "tablet", label: "Tablet", breakpoint: "tablet" },
  { name: "phone", label: "Phone", breakpoint: "mobile" },
];

// Below this admin width the buttons are hidden (see above).
const NARROW_ADMIN = 768;
const storageKey = "hv-preview-device";

function readStoredDevice(): Device {
  if (typeof window === "undefined") return "desktop";
  try {
    const stored = window.localStorage.getItem(storageKey);
    if (devices.some((d) => d.name === stored)) return stored as Device;
  } catch {}
  return "desktop";
}

// The toolbar and the pane that holds the frame, found once Payload renders
// them; the pane's inner size (minus its padding) is re-measured on resize.
function usePreviewPane() {
  const [toolbar, setToolbar] = useState<HTMLElement | null>(null);
  const [pane, setPane] = useState<HTMLElement | null>(null);
  const [paneSize, setPaneSize] = useState({ width: 0, height: 0 });
  const [adminWidth, setAdminWidth] = useState(0);

  useEffect(() => {
    const find = () => {
      setToolbar(document.querySelector<HTMLElement>(".live-preview-toolbar"));
      setPane(document.querySelector<HTMLElement>(".live-preview-window__main"));
    };
    find();
    const observer = new MutationObserver(find);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const measure = () => {
      setAdminWidth(window.innerWidth);
      if (!pane) return;
      const style = getComputedStyle(pane);
      const width =
        pane.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
      const height =
        pane.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
      setPaneSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );
    };
    measure();
    const observer = pane ? new ResizeObserver(measure) : null;
    if (pane) observer?.observe(pane);
    window.addEventListener("resize", measure);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [pane]);

  return { toolbar, paneSize, adminWidth };
}

export default function PreviewSizeButtons() {
  const {
    breakpoint,
    breakpoints,
    isLivePreviewEnabled,
    setBreakpoint,
    setHeight,
    setWidth,
    setZoom,
    size,
    zoom,
  } = useLivePreviewContext();
  const [device, setDevice] = useState<Device>(readStoredDevice);
  const { toolbar, paneSize, adminWidth } = usePreviewPane();
  const narrow = adminWidth > 0 && adminWidth < NARROW_ADMIN;

  const choose = (next: Device) => {
    setDevice(next);
    try {
      window.localStorage.setItem(storageKey, next);
    } catch {}
  };

  // Keep Payload's Live Preview state matching the chosen device and the
  // pane's current size. Payload resets the frame to the breakpoint's
  // configured width × height whenever the breakpoint changes (an effect in
  // its LivePreviewProvider that runs after this one), so this re-applies
  // the fitted size on the next pass — it settles in one or two renders.
  // Relies on that Payload internal — recheck after upgrading @payloadcms/ui.
  useEffect(() => {
    if (!isLivePreviewEnabled || adminWidth === 0) return;
    if (narrow) {
      if (breakpoint !== "responsive") setBreakpoint("responsive");
      if (zoom !== 1) setZoom(1);
      return;
    }
    if (paneSize.width <= 0 || paneSize.height <= 0) return;
    const target = devices.find((d) => d.name === device)!;
    const deviceWidth = breakpoints?.find((bp) => bp.name === target.breakpoint)?.width;
    if (typeof deviceWidth !== "number") return;
    if (breakpoint !== target.breakpoint) {
      setBreakpoint(target.breakpoint);
      return;
    }
    // Payload's zoom keeps the frame's on-screen size and scales the page
    // inside it, so the frame is sized to what fits on screen and zoom
    // makes the page inside it `deviceWidth` wide.
    const nextZoom = Math.min(1, paneSize.width / deviceWidth);
    const width = Math.floor(deviceWidth * nextZoom);
    const height = Math.floor(paneSize.height);
    if (zoom !== nextZoom) setZoom(nextZoom);
    if (size.width !== width) setWidth(width);
    if (size.height !== height) setHeight(height);
  }, [
    adminWidth,
    breakpoint,
    breakpoints,
    device,
    isLivePreviewEnabled,
    narrow,
    paneSize,
    setBreakpoint,
    setHeight,
    setWidth,
    setZoom,
    size.height,
    size.width,
    zoom,
  ]);

  if (!isLivePreviewEnabled || !toolbar || narrow) return null;

  return createPortal(
    <div className="preview-size" role="group" aria-label="Preview size">
      {devices.map((d) => (
        <button
          key={d.name}
          type="button"
          className={`preview-size__btn${device === d.name ? " preview-size__btn--active" : ""}`}
          aria-pressed={device === d.name}
          onClick={() => choose(d.name)}
        >
          {d.label}
        </button>
      ))}
    </div>,
    toolbar,
  );
}
