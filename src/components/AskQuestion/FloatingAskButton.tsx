"use client";

import { useRef, useState } from "react";
import { usePathname } from "next/navigation";
import AskQuestionPanel from "./AskQuestionPanel";

// Fixed bottom-right pill, added to the root layout so it shows on every
// page. Owns only the open/closed boolean — everything about the form
// itself (fields, validation, submit state machine, focus trap) lives in
// AskQuestionPanel, so swapping that component's internals never touches
// this one. The one thing this component hands over is buttonRef — the
// panel's focus trap returns focus to it on close.
//
// Stacking the panel and the button as a column in the same fixed-position
// wrapper (panel first, button last) is what anchors the panel directly
// above the button without any separate absolute-positioning math.
export default function FloatingAskButton() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const buttonRef = useRef<HTMLButtonElement>(null);

  // Don't persist the open panel across navigation. Adjusting state during
  // render (rather than in an effect) per React's "storing information from
  // previous renders" pattern — this bails out on every render except the
  // one where pathname actually changed.
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (pathname !== prevPathname) {
    setPrevPathname(pathname);
    setOpen(false);
  }

  return (
    <div className="fixed bottom-5 right-5 z-30 flex flex-col items-end gap-3 sm:bottom-6 sm:right-6">
      {open && (
        <AskQuestionPanel
          onClose={() => setOpen(false)}
          triggerRef={buttonRef}
        />
      )}

      <button
        type="button"
        ref={buttonRef}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="ask-question-panel"
        className="btn rounded-full"
      >
        <span>Ask a question</span>
        {open ? (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="M3.5 3.5l9 9M12.5 3.5l-9 9"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
            className="h-4 w-4"
          >
            <path
              d="M2 3.5A1.5 1.5 0 0 1 3.5 2h9A1.5 1.5 0 0 1 14 3.5v6a1.5 1.5 0 0 1-1.5 1.5H6l-3 3v-3h-.5A1.5 1.5 0 0 1 2 9.5v-6Z"
              stroke="currentColor"
              strokeWidth="1.3"
              strokeLinejoin="round"
            />
            <path
              d="M6.4 6.05c0-.85.68-1.45 1.6-1.45s1.5.55 1.5 1.3c0 .55-.3.85-.75 1.15-.45.3-.65.5-.65.95"
              stroke="currentColor"
              strokeWidth="1.15"
              strokeLinecap="round"
            />
            <circle cx="8" cy="9.55" r="0.65" fill="currentColor" />
          </svg>
        )}
      </button>
    </div>
  );
}
