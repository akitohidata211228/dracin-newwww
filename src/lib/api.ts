import { MediaItem, SeriesDetail, UnlockedEpisode } from '../types.ts';
import { getStoredRegion } from './regionConfig.ts';

function normalizeClientLang(lang?: string): string {
  if (!lang) return 'id-ID';
  const l = lang.toLowerCase();
  if (l === 'id' || l === 'in' || l === 'ind') return 'id-ID';
  if (l === 'en') return 'en-US';
  return lang;
}

export async function fetchFeed(
  page = 1,
  count = 20,
  lang?: string,
  country?: string
): Promise<{ items: MediaItem[]; hasMore: boolean; page: number }> {
  const region = getStoredRegion();
  const effectiveLang = normalizeClientLang(lang || region.language);
  const effectiveCountry = country || region.country;

  const res = await fetch(`/api/feed?page=${page}&count=${count}&lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`);
  if (!res.ok) {
    throw new Error(`Gagal memuat katalog drama (${res.status})`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal memuat feed');
  return json.data;
}

export async function searchDramas(
  query: string,
  page = 1,
  count = 24,
  lang?: string,
  country?: string
): Promise<{ items: MediaItem[]; hasMore: boolean }> {
  const region = getStoredRegion();
  const effectiveLang = normalizeClientLang(lang || region.language);
  const effectiveCountry = country || region.country;

  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}&page=${page}&count=${count}&lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`
  );
  if (!res.ok) {
    throw new Error(`Gagal melakukan pencarian (${res.status})`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal mencari drama');
  return json.data;
}

export async function fetchSeriesDetail(seriesId: string, lang?: string, country?: string): Promise<SeriesDetail> {
  const region = getStoredRegion();
  const effectiveLang = normalizeClientLang(lang || region.language);
  const effectiveCountry = country || region.country;

  const res = await fetch(
    `/api/series/${encodeURIComponent(seriesId)}?lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`
  );
  if (!res.ok) {
    throw new Error(`Gagal mengambil detail drama (${res.status})`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal mengambil detail');
  return json.data;
}

export async function unlockEpisode(seriesId: string, episodeId: string, lang?: string, country?: string): Promise<UnlockedEpisode> {
  const region = getStoredRegion();
  const effectiveLang = normalizeClientLang(lang || region.language);
  const effectiveCountry = country || region.country;

  const res = await fetch(
    `/api/series/${encodeURIComponent(seriesId)}/unlock/${encodeURIComponent(episodeId)}?lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`,
    {
      method: 'POST'
    }
  );
  if (!res.ok) {
    throw new Error(`Gagal memutar episode (${res.status})`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal memutar video');
  return json.data;
}

export async function resolveDramaLink(input: string, episode?: number, lang?: string, country?: string): Promise<any> {
  const region = getStoredRegion();
  const effectiveLang = normalizeClientLang(lang || region.language);
  const effectiveCountry = country || region.country;

  const epParam = episode ? `&episode=${episode}` : '';
  const res = await fetch(
    `/api/resolve?input=${encodeURIComponent(input)}${epParam}&lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`
  );
  if (!res.ok) {
    throw new Error(`Gagal mengurai link drama (${res.status})`);
  }
  const json = await res.json();
  if (!json.success) throw new Error(json.error || 'Gagal mengurai link');
  return json.data;
}

export async function fetchHotWords(lang?: string, country?: string): Promise<string[]> {
  try {
    const region = getStoredRegion();
    const effectiveLang = normalizeClientLang(lang || region.language);
    const effectiveCountry = country || region.country;

    const res = await fetch(`/api/hot-words?lang=${encodeURIComponent(effectiveLang)}&country=${encodeURIComponent(effectiveCountry)}`);
    if (!res.ok) return [];
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      return json.data;
    }
    return [];
  } catch (e) {
    console.warn('Failed to fetch hot words client-side:', e);
    return [];
  }
}
