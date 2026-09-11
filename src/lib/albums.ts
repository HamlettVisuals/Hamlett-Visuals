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
  // Deliberately unencoded: next/image's built-in loader encodeURIComponent's
  // the whole src itself, so a pre-encoded path here would get double-encoded.
  return "/" + segments.join("/");
}

export function getEventsForCategoryFolder(folderName: string): Event[] {
  const albumDir = path.join(PHOTOS_DIR, folderName);

  return listSubdirectories(albumDir).map((eventFolder) => {
    const eventDir = path.join(albumDir, eventFolder);
    const photos: Photo[] = listImageFiles(eventDir).map((filename) => ({
      filename,
      url: urlFor("photos", folderName, eventFolder, filename),
    }));

    return {
      slug: slugify(eventFolder),
      name: toDisplayName(eventFolder),
      folderName: eventFolder,
      photos,
    };
  });
}

export function getAlbums(): Album[] {
  return listSubdirectories(PHOTOS_DIR).map((albumFolder) => ({
    slug: slugify(albumFolder),
    name: toDisplayName(albumFolder),
    folderName: albumFolder,
    events: getEventsForCategoryFolder(albumFolder),
  }));
}

export function getAlbumBySlug(slug: string): Album | undefined {
  return getAlbums().find((album) => album.slug === slug);
}
