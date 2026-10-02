export type Thumbnail = { src: string; alt: string };

export type TestimonialRow = {
  id: number;
  clientName: string;
  /** The quote, cut short for the list. */
  snippet: string;
  albumTitle: string | null;
  published: boolean;
  onHomepage: boolean;
  fromClient: boolean;
  /** The photo the site shows: its own, else its album's cover, else its category's. */
  thumbnail: Thumbnail | null;
};

export type TestimonialSection = {
  /** null: testimonials with no category yet (client submissions). */
  id: number | null;
  name: string;
  published: boolean;
  rows: TestimonialRow[];
};
