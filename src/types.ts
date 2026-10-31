export interface MediaItem {
  id: string;
  title: string;
  synopsis: string;
  thumbnail: string | null;
  landscape: string | null;
  genre: string;
  tags: string[];
  episodeCount: number | null;
  followers: number | null;
  comments: number | null;
  free: boolean;
  latestEpisodeId: string | null;
  episodeIndex: number;
}

export interface EpisodeItem {
  videoId: string;
  episodeId: string;
  seriesId: string;
  index: number;
  episode: number;
  title: string;
  price: number;
  isPaid: boolean;
}

export interface SubtitleItem {
  language: string;
  displayName: string;
  vtt: string | null;
  srt: string | null;
  isOriginal: boolean;
}

export interface UnlockedEpisode {
  seriesId: string;
  episodeId: string;
  index: number | null;
  unlocked: boolean;
  videoType: string;
  duration: number;
  url: string | null;
  proxiedUrl?: string | null;
  subtitles: SubtitleItem[];
  audioTracks: any[];
  originalAudio: string | null;
  spriteVtt: string | null;
}

export interface SeriesDetail {
  id: string;
  title: string;
  synopsis: string;
  totalEpisodes: number;
  latestEpisode: number | null;
  earliestEpisode: number | null;
  payIndex: number | null;
  thumbnail?: string | null;
  cover?: string | null;
  firstEpisode: {
    id: string;
    cover: string | null;
    streamUrl: string | null;
    subtitles: any[];
    audio: any[];
  } | null;
  episodes: EpisodeItem[];
}

export interface WatchHistoryItem {
  seriesId: string;
  seriesTitle: string;
  thumbnail: string | null;
  genre?: string;
  lastEpisodeIndex: number;
  lastEpisodeId: string;
  totalEpisodes: number;
  watchedAt: number; // timestamp
  progressSeconds?: number;
}

export interface BookmarkItem {
  seriesId: string;
  seriesTitle: string;
  thumbnail: string | null;
  genre: string;
  totalEpisodes: number | null;
  bookmarkedAt: number;
}
