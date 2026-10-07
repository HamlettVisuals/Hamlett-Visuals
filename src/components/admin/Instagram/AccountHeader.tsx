"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import type { UIFieldClientComponent } from "payload";
import { useFormFields } from "@payloadcms/ui";
import type { InstagramStatus } from "@/lib/instagram-status";
import { reloadStatus, rowPathOf, statusChanged, useInstagramStatus } from "./store";

// The top of each Instagram account card (globals/InstagramSection.ts,
// `accounts`; its heading is AccountRowLabel.tsx): its connection status
// and last sync, and "Sync now". An account that isn't connected (or needs
// reconnecting, or soon will) gets Connect / Reconnect: Facebook Login on
// the live site (app/api/instagram/connect, then callback), the mock
// account where mock posts are allowed. Facebook Login comes back here with
// the outcome in the query string (ig-slot, ig-result, ig-msg); "pick"
// means she has several Instagram accounts and chooses one here
// (app/api/instagram/choose).

// Reconnect before Meta's data access for the token runs out; shown this
// many days ahead.
const RECONNECT_WARN_DAYS = 14;

type Message = { text: string; tone: "ok" | "error" };
type Choice = { igUserId: string; username: string };

// Back from Facebook Login: the outcome in the URL, read once per page load
// (null on the server, so the first render matches).
type Returned = { slot: number; result: string; text: string } | null;
let returned: Returned | undefined;
const readReturned = (): Returned => {
  if (returned === undefined) {
    const params = new URLSearchParams(window.location.search);
    const result = params.get("ig-result");
    returned = result ? { slot: Number(params.get("ig-slot") || 1), result, text: params.get("ig-msg") ?? "" } : null;
  }
  return returned;
};
const noSubscribe = () => () => {};
const useReturned = () => useSyncExternalStore(noSubscribe, readReturned, () => null);

const dueWithin = (iso: string | null | undefined, days: number) =>
  Boolean(iso) && Date.parse(iso as string) - Date.now() < days * 86_400_000;

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
  const [busy, setBusy] = useState<"sync" | "connect" | "choose" | null>(null);
  const [message, setMessage] = useState<Message | null>(null);
  const [choices, setChoices] = useState<Choice[] | null>(null);
  // Shown until she does something else on this card.
  const [actedOn, setActedOn] = useState(false);
  const back = useReturned();
  const backHere = back && slot && back.slot === slot ? back : null;

  // Back from Facebook Login to this card: tidy the URL, then fresh
  // statuses, or the accounts to pick from.
  useEffect(() => {
    if (!backHere) return;
    const params = new URLSearchParams(window.location.search);
    for (const key of ["ig-slot", "ig-result", "ig-msg"]) params.delete(key);
    const query = params.toString();
    window.history.replaceState(window.history.state, "", `${window.location.pathname}${query ? `?${query}` : ""}`);
    if (backHere.result === "ok") void reloadStatus();
    if (backHere.result !== "pick") return;
    fetch(`/api/instagram/choose?slot=${slot}`, { credentials: "include" })
      .then(async (res) => {
        const body = (await res.json().catch(() => null)) as { accounts?: Choice[]; error?: string } | null;
        if (!res.ok || !body?.accounts?.length) throw new Error(body?.error ?? "");
        setChoices(body.accounts);
      })
      .catch((err: Error) =>
        setMessage({ text: err.message || "Couldn't load your Instagram accounts. Click Connect again.", tone: "error" }),
      );
  }, [backHere, slot]);

  const run = async (action: "sync" | "connect" | "choose", igUserId?: string) => {
    setBusy(action);
    setMessage(null);
    setActedOn(true);
    try {
      const res = await fetch(`/api/instagram/${action}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot, igUserId }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        // Facebook Login, for a real connect: the card stays busy while it goes.
        redirect?: string;
        username?: string;
        result?: { outcome: string; message?: string; created: number; updated: number; pruned: number };
        status?: InstagramStatus;
      } | null;
      if (res.ok && body?.redirect) {
        window.location.assign(body.redirect);
        return;
      }
      if (body?.status) statusChanged(body.status);
      if (action === "choose" && res.ok) setChoices(null);
      if (!res.ok || !body?.result) {
        setMessage({ text: body?.error ?? "That didn't work. Try again in a minute.", tone: "error" });
      } else if (body.result.outcome !== "synced") {
        setMessage({ text: body.result.message ?? "Nothing to sync.", tone: "error" });
      } else {
        const { created, updated } = body.result;
        setMessage({
          text: body.username
            ? `Connected @${body.username}. ${created} post${created === 1 ? "" : "s"} copied.`
            : created || updated
              ? `Synced: ${created} new, ${updated} updated.`
              : "Synced. No new posts.",
          tone: "ok",
        });
      }
      setBusy(null);
    } catch {
      setMessage({ text: "That didn't work. Check your connection and try again.", tone: "error" });
      setBusy(null);
    }
  };

  const reconnectSoon = dueWithin(account?.reconnectBy, RECONNECT_WARN_DAYS);
  const shown: Message | null =
    message ?? (backHere && !actedOn ? { text: backHere.text, tone: backHere.result === "ok" ? "ok" : "error" } : null);

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
        {account && account.status !== "connected" && account.lastError && (
          <span className="ig-account__error">{account.lastError}</span>
        )}
        {connected && reconnectSoon && (
          <span className="ig-account__error">
            Reconnect by{" "}
            {new Date(account.reconnectBy as string).toLocaleDateString(undefined, { day: "numeric", month: "short" })} to keep
            your posts updating.
          </span>
        )}
      </div>
      {account && (
        <div className="ig-account__actions">
          {connected && (
            <button type="button" className="ig-account__button" disabled={busy !== null} onClick={() => run("sync")}>
              {busy === "sync" ? "Syncing…" : "Sync now"}
            </button>
          )}
          {(!connected || reconnectSoon) && (
            <button type="button" className="ig-account__button" disabled={busy !== null} onClick={() => run("connect")}>
              {busy === "connect"
                ? "Connecting…"
                : account.status === "not_connected"
                  ? slot === 1
                    ? "Connect account"
                    : "Connect second account"
                  : "Reconnect"}
            </button>
          )}
        </div>
      )}
      {choices && (
        <div className="ig-account__choices" role="group" aria-label="Choose an Instagram account">
          {choices.map((choice) => (
            <button
              key={choice.igUserId}
              type="button"
              className="ig-account__button"
              disabled={busy !== null}
              onClick={() => run("choose", choice.igUserId)}
            >
              {busy === "choose" ? "Connecting…" : `@${choice.username}`}
            </button>
          ))}
        </div>
      )}
      {shown && (
        <p className={`ig-account__message ig-account__message--${shown.tone}`} role="status">
          {shown.text}
        </p>
      )}
    </div>
  );
};

export default AccountHeader;
