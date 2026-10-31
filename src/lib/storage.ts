import { WatchHistoryItem, BookmarkItem } from '../types.ts';

const STORAGE_KEYS = {
  HISTORY: 'dracinhub_history_v1',
  BOOKMARKS: 'dracinhub_bookmarks_v1',
  LANG: 'dracinhub_lang_pref',
  EPISODE_PROGRESS: 'dracinhub_ep_progress_v1',
};

export interface EpisodeProgressRecord {
  seriesId: string;
  episodeIndex: number;
  currentTime: number;
  duration: number;
  finished: boolean;
  updatedAt: number;
}

export function saveEpisodePlaybackPosition(
  seriesId: string,
  episodeIndex: number,
  currentTime: number,
  duration: number,
  finished: boolean = false
) {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EPISODE_PROGRESS);
    const map: Record<string, EpisodeProgressRecord> = raw ? JSON.parse(raw) : {};
    const key = `${seriesId}_${episodeIndex}`;

    // If near the end (within 3 seconds or >= 97% of duration) or finished is true, mark finished
    const isFinished = finished || (duration > 0 && (currentTime >= duration - 3 || (currentTime / duration) >= 0.97));

    map[key] = {
      seriesId,
      episodeIndex,
      currentTime: isFinished ? 0 : Math.max(0, Math.floor(currentTime)),
      duration: Math.floor(duration),
      finished: isFinished,
      updatedAt: Date.now(),
    };

    // Clean up if map gets too large (keep newest 200 entries)
    const keys = Object.keys(map);
    if (keys.length > 200) {
      const sortedKeys = keys.sort((a, b) => map[b].updatedAt - map[a].updatedAt);
      const pruned: Record<string, EpisodeProgressRecord> = {};
      for (let i = 0; i < 150; i++) {
        pruned[sortedKeys[i]] = map[sortedKeys[i]];
      }
      localStorage.setItem(STORAGE_KEYS.EPISODE_PROGRESS, JSON.stringify(pruned));
    } else {
      localStorage.setItem(STORAGE_KEYS.EPISODE_PROGRESS, JSON.stringify(map));
    }
  } catch (e) {
    console.error('Failed to save episode playback position:', e);
  }
}

export function getEpisodePlaybackPosition(
  seriesId: string,
  episodeIndex: number
): EpisodeProgressRecord | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EPISODE_PROGRESS);
    if (!raw) return null;
    const map: Record<string, EpisodeProgressRecord> = JSON.parse(raw);
    const key = `${seriesId}_${episodeIndex}`;
    return map[key] || null;
  } catch {
    return null;
  }
}

export function getWatchHistory(): WatchHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.HISTORY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveWatchProgress(item: Omit<WatchHistoryItem, 'watchedAt'>) {
  try {
    const history = getWatchHistory();
    const existing = history.find((h) => h.seriesId === item.seriesId);

    // Always prefer the authentic vertical poster banner over episode frame snapshots
    let bestThumbnail = item.thumbnail;
    if (existing?.thumbnail && !existing.thumbnail.includes('/vt/video/cover/episode/')) {
      if (!bestThumbnail || bestThumbnail.includes('/vt/video/cover/episode/')) {
        bestThumbnail = existing.thumbnail;
      }
    }

    const filtered = history.filter((h) => h.seriesId !== item.seriesId);
    const updated: WatchHistoryItem = {
      ...item,
      thumbnail: bestThumbnail,
      watchedAt: Date.now(),
    };
    // Keep last 30 dramas
    const sliced = [updated, ...filtered].slice(0, 30);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(sliced));
  } catch (e) {
    console.error('Failed to save watch progress:', e);
  }
}

export function syncHistoryThumbnails(knownDramas: Array<{ id: string; thumbnail?: string | null }>) {
  try {
    const history = getWatchHistory();
    let changed = false;
    const updated = history.map((item) => {
      const match = knownDramas.find((d) => d.id === item.seriesId && d.thumbnail);
      if (match?.thumbnail && (item.thumbnail !== match.thumbnail || item.thumbnail?.includes('/vt/video/cover/episode/'))) {
        changed = true;
        return { ...item, thumbnail: match.thumbnail };
      }
      return item;
    });

    if (changed) {
      localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(updated));
    }
  } catch (e) {
    console.error('Failed to sync history thumbnails:', e);
  }
}

export function removeWatchHistory(seriesId: string) {
  try {
    const history = getWatchHistory().filter((h) => h.seriesId !== seriesId);
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to remove history:', e);
  }
}

export function clearAllWatchHistory() {
  try {
    localStorage.removeItem(STORAGE_KEYS.HISTORY);
  } catch {}
}

export function getBookmarks(): BookmarkItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BOOKMARKS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function isBookmarked(seriesId: string): boolean {
  return getBookmarks().some((b) => b.seriesId === seriesId);
}

export function toggleBookmark(item: Omit<BookmarkItem, 'bookmarkedAt'>): boolean {
  try {
    const bookmarks = getBookmarks();
    const exists = bookmarks.some((b) => b.seriesId === item.seriesId);
    let next: BookmarkItem[];

    if (exists) {
      next = bookmarks.filter((b) => b.seriesId !== item.seriesId);
    } else {
      next = [
        {
          ...item,
          bookmarkedAt: Date.now(),
        },
        ...bookmarks,
      ];
    }

    localStorage.setItem(STORAGE_KEYS.BOOKMARKS, JSON.stringify(next));
    return !exists;
  } catch {
    return false;
  }
}

export function getPreferredLanguage(): string {
  try {
    return localStorage.getItem(STORAGE_KEYS.LANG) || 'id';
  } catch {
    return 'id';
  }
}

export function setPreferredLanguage(lang: string) {
  try {
    localStorage.setItem(STORAGE_KEYS.LANG, lang);
  } catch {}
}
