"use client";

import { useState } from "react";
import { Button, useAuth, useConfig, useDocumentInfo } from "@payloadcms/ui";
import { formatAdminURL } from "payload/shared";

// "Sign out everywhere" on her account page (a ui field on Users, shown only
// on her own account): ends every studio login, this one included, through
// Payload's logout with ?allSessions=true, then goes to the login page. For
// a lost phone. Asks first, in place, rather than in a pop-up.
export default function SignOutEverywhere() {
  const { config } = useConfig();
  const { user } = useAuth();
  const { id } = useDocumentInfo();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Only on her own account, not when looking at another user.
  if (!user || id == null || String(user.id) !== String(id)) return null;

  const signOutEverywhere = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${config.serverURL ?? ""}${config.routes.api}/${config.admin.user}/logout?allSessions=true`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Couldn't sign out. Try again.");
      window.location.assign(formatAdminURL({ adminRoute: config.routes.admin, path: "/login" }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't sign out. Try again.");
      setBusy(false);
    }
  };

  return (
    <div className="field-type sign-out-everywhere">
      <h3 className="sign-out-everywhere__title">Signed in on other devices?</h3>
      <p className="sign-out-everywhere__text">
        If you&apos;ve lost a phone or signed in somewhere you shouldn&apos;t stay signed in, sign out of the studio on every
        device at once. Changing your password does this too, apart from the device you change it on.
      </p>
      {confirming ? (
        <div className="sign-out-everywhere__confirm" role="alertdialog" aria-labelledby="sign-out-everywhere-question">
          <p id="sign-out-everywhere-question" className="sign-out-everywhere__question">
            This signs you out on every device, including this one.
          </p>
          <div className="sign-out-everywhere__actions">
            <Button buttonStyle="primary" size="medium" margin={false} onClick={() => void signOutEverywhere()} disabled={busy}>
              {busy ? "Signing out…" : "Sign out everywhere"}
            </Button>
            <Button buttonStyle="secondary" size="medium" margin={false} onClick={() => setConfirming(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <Button buttonStyle="secondary" size="medium" margin={false} onClick={() => setConfirming(true)}>
          Sign out everywhere
        </Button>
      )}
      {error && (
        <p className="field-warning" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
