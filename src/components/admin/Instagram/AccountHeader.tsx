"use client";

import { useState } from "react";
import type { UIFieldClientComponent } from "payload";
import { useFormFields } from "@payloadcms/ui";
import type { InstagramStatus } from "@/lib/instagram-status";
import { rowPathOf, statusChanged, useInstagramStatus } from "./store";

// The top of each Instagram account card (globals/InstagramSection.ts,
// `accounts`; its heading is AccountRowLabel.tsx): its connection status
// and last sync, and "Sync now". An account that isn't connected gets a Connect button
// instead, stubbed until the real Instagram API is set up
// (app/api/instagram/connect).

const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - Date.parse(iso)) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

const AccountHeader: UIFieldClientComponent = ({ path }) => {
  const rowPath = rowPathOf(path);
  const slot = useFormFields(([fields]) => Number(fields[`${rowPath}.slot`]?.value) || 0);
  const { status, error } = useInstagramStatus();
  const account = status?.accounts.find((a) => a.slot === slot);
  const [busy, setBusy] = useState<"sync" | "connect" | null>(null);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);

  const run = async (action: "sync" | "connect") => {
    setBusy(action);
    setMessage(null);
    try {
      const res = await fetch(`/api/instagram/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        result?: { outcome: string; message?: string; created: number; updated: number; pruned: number };
        status?: InstagramStatus;
      } | null;
      if (body?.status) statusChanged(body.status);
      if (!res.ok || !body?.result) {
        setMessage({ text: body?.error ?? "That didn't work. Try again in a minute.", tone: "error" });
      } else if (body.result.outcome !== "synced") {
        setMessage({ text: body.result.message ?? "Nothing to sync.", tone: "error" });
      } else {
        const { created, updated } = body.result;
        setMessage({
          text: created || updated ? `Synced: ${created} new, ${updated} updated.` : "Synced. No new posts.",
          tone: "ok",
        });
      }
    } catch {
      setMessage({ text: "That didn't work. Check your connection and try again.", tone: "error" });
    } finally {
      setBusy(null);
    }
  };

  const connected = account?.status === "connected";
  const statusText = !account
    ? error ?? "Loading…"
    : account.status === "connected"
      ? `Connected${account.lastSyncedAt ? ` · last synced ${timeAgo(account.lastSyncedAt)}` : ""}`
      : account.status === "needs_reconnect"
        ? "Needs reconnecting"
        : "Not connected";

  return (
    <div className="ig-account__header" data-slot={slot}>
      <div className="ig-account__title">
        {account?.isMock && <span className="ig-account__mock">Mock data (local only)</span>}
        <span className={`ig-account__status ig-account__status--${account?.status ?? "loading"}`} role="status">
          {statusText}
        </span>
        {account?.status === "needs_reconnect" && account.lastError && (
          <span className="ig-account__error">{account.lastError}</span>
        )}
      </div>
      {account && (
        <div className="ig-account__actions">
          {connected ? (
            <button type="button" className="ig-account__button" disabled={busy !== null} onClick={() => run("sync")}>
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
          ) : (
            <button type="button" className="ig-account__button" disabled={busy !== null} onClick={() => run("connect")}>
              {busy === "connect" ? "Connecting…" : slot === 1 ? "Connect account" : "Connect second account"}
            </button>
          )}
        </div>
      )}
      {message && (
        <p className={`ig-account__message ig-account__message--${message.tone}`} role="status">
          {message.text}
        </p>
      )}
    </div>
  );
};

export default AccountHeader;
