import fs from "node:fs";
import path from "node:path";

const PHOTOS_DIR = path.join(process.cwd(), "public", "photos");
const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp"]);

export type Photo = {
  filename: string;
  url: string;
};

export type Event = {
  slug: string;
  name: string;
  folderName: string;
  photos: Photo[];
};

export type Album = {
  slug: string;
  name: string;
  folderName: string;
  events: Event[];
};

function slugify(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toDisplayName(raw: string): string {
  return raw
    .replace(/[-_]+/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

function listSubdirectories(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function listImageFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        IMAGE_EXTENSIONS.has(path.extname(entry.name).toLowerCase()),
    )
    .map((entry) => entry.name)
    .sort();
}

function urlFor(...segments: string[]): string {
  return "/" + segments.map(encodeURIComponent).join("/");
}

export function getAlbums(): Album[] {
  return listSubdirectories(PHOTOS_DIR).map((albumFolder) => {
    const albumDir = path.join(PHOTOS_DIR, albumFolder);

    const events: Event[] = listSubdirectories(albumDir).map(
      (eventFolder) => {
        const eventDir = path.join(albumDir, eventFolder);
        const photos: Photo[] = listImageFiles(eventDir).map((filename) => ({
          filename,
          url: urlFor("photos", albumFolder, eventFolder, filename),
        }));

        return {
          slug: slugify(eventFolder),
          name: toDisplayName(eventFolder),
          folderName: eventFolder,
          photos,
        };
      },
    );

    return {
      slug: slugify(albumFolder),
      name: toDisplayName(albumFolder),
      folderName: albumFolder,
      events,
    };
  });
}

export function getAlbumBySlug(slug: string): Album | undefined {
  return getAlbums().find((album) => album.slug === slug);
}

export function getEventBySlug(
  albumSlug: string,
  eventSlug: string,
): Event | undefined {
  return getAlbumBySlug(albumSlug)?.events.find(
    (event) => event.slug === eventSlug,
  );
}
