"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { InstagramStatus } from "@/lib/instagram-status";

// The Instagram Section's account cards all read one copy of every slot's
// status (/api/instagram/status, lib/instagram-status.ts), so "Sync now" on
// one card updates the status line, the Visible switch and the picker at
// once. `version` goes up after every sync, so the picker reloads its posts.

type State = { status: InstagramStatus | null; version: number; error: string | null };

let state: State = { status: null, version: 0, error: null };
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();

const set = (next: Partial<State>) => {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export function loadStatus(): Promise<void> {
  loading ??= fetch("/api/instagram/status", { credentials: "include" })
    .then(async (res) => {
      if (!res.ok) throw new Error();
      set({ status: (await res.json()) as InstagramStatus, error: null });
    })
    .catch(() => set({ error: "Couldn't load your Instagram accounts. Reload the page to try again." }))
    .finally(() => {
      loading = null;
    });
  return loading;
}

/** After a sync or connect: the new statuses, and posts to reload. */
export function statusChanged(status: InstagramStatus) {
  set({ status, version: state.version + 1, error: null });
}

export function useInstagramStatus(): State {
  const current = useSyncExternalStore(subscribe, () => state, () => state);
  useEffect(() => {
    if (!state.status) void loadStatus();
  }, []);
  return current;
}

/** The array row's path ("accounts.0") from one of its fields' paths. */
export const rowPathOf = (path: string) => path.split(".").slice(0, -1).join(".");
