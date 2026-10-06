"use client";

import { useRowLabel } from "@payloadcms/ui";

// The heading of each Instagram account card (globals/InstagramSection.ts),
// in place of Payload's "Account 01".
export default function AccountRowLabel() {
  const { data } = useRowLabel<{ slot?: number | null; handle?: string | null }>();
  const name = data?.slot === 2 ? "Second account" : "Main account";
  return (
    <span className="ig-account__label">
      {name}
      {data?.handle ? <span className="ig-account__handle">{data.handle}</span> : null}
    </span>
  );
}
