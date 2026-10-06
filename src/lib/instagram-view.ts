import { instagramLink, type InstagramLink } from "#src/lib/contact-details.ts";
import { normalizeAccounts } from "#src/lib/instagram-accounts.ts";
import { toTilePost, type InstagramHome, type TilePost } from "#src/lib/instagram-home.ts";
import { layoutFor, type LayoutBlock } from "#src/lib/instagram-layout.ts";
import type { InstagramSection } from "#src/payload-types.ts";

// What the homepage Instagram section (components/home/Instagram.tsx)
// renders, decided without React so unit tests can check it:
//   - hidden: switched off, or no Instagram username anywhere to link to;
//   - follow: nothing to show (no account connected, switched on and
//     synced), so just the heading and a Follow link made from Site
//     Settings' username;
//   - single / pair: the grids (lib/instagram-layout.ts), each with the
//     Follow link for its own account, falling back to Site Settings'.
//
// "#src/" imports so plain Node can load it (tests/unit).

export type ViewBlock = LayoutBlock<TilePost> & { link: InstagramLink | null };

export type InstagramView =
  | { kind: "hidden" }
  | { kind: "follow"; heading: string; follow: InstagramLink }
  | { kind: "single"; heading: string; block: ViewBlock }
  | { kind: "pair"; heading: string; blocks: [ViewBlock, ViewBlock] };

export function instagramView(
  section: InstagramSection,
  home: Pick<InstagramHome, "connectedSlots" | "recentBySlot" | "mockAllowed">,
  siteHandle: string | null | undefined,
): InstagramView {
  if (section.showOnHomepage === false) return { kind: "hidden" };
  const fallback = instagramLink(siteHandle);
  const heading = section.heading || "Recent on Instagram";
  const layout = layoutFor<TilePost>(
    normalizeAccounts(section.accounts).map((account) => ({
      slot: account.slot,
      handle: account.handle ?? null,
      label: account.label ?? null,
      connected: home.connectedSlots.includes(account.slot),
      visible: account.visible === true,
      featured: (account.featured ?? []).map((post) => toTilePost(post, home.mockAllowed)).filter((post) => post !== null),
      recent: home.recentBySlot[account.slot] ?? [],
    })),
  );
  const withLink = (block: LayoutBlock<TilePost>): ViewBlock => ({ ...block, link: instagramLink(block.handle) ?? fallback });

  if (layout.kind === "single") return { kind: "single", heading, block: withLink(layout.block) };
  if (layout.kind === "pair") return { kind: "pair", heading, blocks: [withLink(layout.blocks[0]), withLink(layout.blocks[1])] };
  return fallback ? { kind: "follow", heading, follow: fallback } : { kind: "hidden" };
}
