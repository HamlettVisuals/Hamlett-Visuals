// An album video as the album page's Videos panel loads it (AlbumVideos,
// PosterPicker): the video with its posters populated.

export type Poster = {
  id: number;
  alt?: string | null;
  url?: string | null;
  sizes?: { thumbnail?: { url?: string | null } | null } | null;
};

export type AlbumVideo = {
  id: number;
  title?: string | null;
  filename?: string | null;
  duration?: number | null;
  fastStart?: boolean | null;
  poster?: Poster | number | null;
  autoPoster?: Poster | number | null;
  albumOrder?: string | null;
  createdAt?: string | null;
};

export const videoLabel = (video: AlbumVideo) => video.title?.trim() || video.filename || "this video";
