// Data the Categories & Albums page (index.tsx) hands to its client side
// (PortfolioList.tsx).

export type Thumbnail = { src: string; alt: string };

export type PortfolioAlbum = {
  id: number;
  title: string;
  date: string | null;
  published: boolean;
  /** The album's first photo in her order (its cover). */
  thumbnail: Thumbnail | null;
};

export type PortfolioCategory = {
  id: number;
  name: string;
  slug: string;
  published: boolean;
  /** Its stored drag-order key (`_order`), for Payload's /api/reorder. */
  order: string | null;
  /** The CRM-only "Other": last, muted, no albums. */
  isOther: boolean;
  /** The category's own cover photo (its homepage tile). */
  cover: Thumbnail | null;
  albums: PortfolioAlbum[];
};
