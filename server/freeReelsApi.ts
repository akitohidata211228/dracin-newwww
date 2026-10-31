import crypto from 'node:crypto';

const BASE_URL = 'https://apiv2.free-reels.com/frv2-api';
const SALT = '8IAcbWyCsVhYv82S2eofRqK1DF3nNDAv';
const APP_NAME = 'com.freereels.app';
const APP_VERSION = '2.5.01';
const DEVICE_VERSION = '34';
const DEFAULT_LANG = 'id-ID';
const DEFAULT_COUNTRY = 'ID';

export function normalizeLanguage(lang?: string, country?: string): string {
  if (!lang) return DEFAULT_LANG;
  const lower = lang.toLowerCase().trim();
  if (
    lower === 'id' ||
    lower === 'in' ||
    lower === 'ind' ||
    lower === 'id_id' ||
    lower === 'id-id' ||
    lower === 'in-id' ||
    lower === 'in_id'
  ) {
    return 'id-ID';
  }
  if (lower === 'en' || lower === 'en_us' || lower === 'en-us') {
    return 'en-US';
  }
  if (lower === 'zh' || lower === 'zh-cn' || lower === 'zh_cn' || lower === 'cn') {
    return 'zh-CN';
  }
  if (lower === 'zh-tw' || lower === 'zh_tw' || lower === 'tw') {
    return 'zh-TW';
  }
  if (lower === 'ja' || lower === 'ja-jp' || lower === 'ja_jp' || lower === 'jp') {
    return 'ja-JP';
  }
  if (lower === 'ko' || lower === 'ko-kr' || lower === 'ko_kr' || lower === 'kr') {
    return 'ko-KR';
  }
  if (lower === 'vi' || lower === 'vi-vn' || lower === 'vi_vn' || lower === 'vn') {
    return 'vi-VN';
  }
  if (lower === 'th' || lower === 'th-th' || lower === 'th_th') {
    return 'th-TH';
  }
  if (lower === 'ms' || lower === 'ms-my' || lower === 'ms_my' || lower === 'my') {
    return 'ms-MY';
  }
  if (lower === 'tl' || lower === 'tl-ph' || lower === 'tl_ph' || lower === 'ph') {
    return 'tl-PH';
  }
  if (lower === 'es' || lower === 'es-mx' || lower === 'es_mx' || lower === 'es-es') {
    return 'es-MX';
  }
  if (lower === 'pt' || lower === 'pt-pt' || lower === 'pt_pt' || lower === 'pt-br') {
    return 'pt-PT';
  }
  if (lower === 'fr' || lower === 'fr-fr' || lower === 'fr_fr') {
    return 'fr-FR';
  }
  if (lower === 'de' || lower === 'de-de' || lower === 'de_de') {
    return 'de-DE';
  }
  if (lower === 'ru' || lower === 'ru-ru' || lower === 'ru_ru') {
    return 'ru-RU';
  }
  if (lower === 'ar' || lower === 'ar-sa' || lower === 'ar_sa') {
    return 'ar-SA';
  }
  if (lower === 'hi' || lower === 'hi-in' || lower === 'hi_in') {
    return 'hi-IN';
  }
  if (lang.includes('-')) return lang;
  if (country) return `${lower}-${country.toUpperCase()}`;
  return lang;
}

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
  subtitles: SubtitleItem[];
  audioTracks: any[];
  originalAudio: string | null;
  spriteVtt: string | null;
}

let sessionState: {
  deviceId: string;
  authKey: string;
  authSecret: string;
  expireAt: number;
} | null = null;

function md5(str: string): string {
  return crypto.createHash('md5').update(str).digest('hex');
}

function generateDeviceId(): string {
  return crypto.randomBytes(8).toString('hex');
}

export async function getSession(forceNew = false) {
  const now = Date.now();
  if (!forceNew && sessionState && sessionState.expireAt > now) {
    return sessionState;
  }

  const deviceId = sessionState?.deviceId || generateDeviceId();
  const sign = md5(SALT + deviceId);
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'app-name': APP_NAME,
    'app-version': APP_VERSION,
    'device-id': deviceId,
    'device-version': DEVICE_VERSION,
    device: 'android',
    language: DEFAULT_LANG,
    country: DEFAULT_COUNTRY
  };

  const res = await fetch(`${BASE_URL}/anonymous/login`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      device_id: deviceId,
      device_name: '',
      sign
    })
  });

  if (!res.ok) {
    throw new Error(`DramaWave anonymous login failed with HTTP ${res.status}`);
  }

  const body = (await res.json()) as any;
  if (body.code !== 200 || !body.data?.auth_key || !body.data?.auth_secret) {
    throw new Error(`DramaWave anonymous login failed: ${body.message || 'invalid response'}`);
  }

  sessionState = {
    deviceId,
    authKey: body.data.auth_key,
    authSecret: body.data.auth_secret,
    expireAt: now + 3600 * 1000 * 12
  };

  return sessionState;
}

export async function request(path: string, options: any = {}) {
  const { method = 'GET', body, query, signal } = options;
  const session = await getSession();
  const ts = Date.now();
  const signature = md5(`${SALT}&${session.authSecret}`);
  const authHeader = `oauth_signature=${signature},oauth_token=${session.authKey},ts=${ts}`;

  const lang = normalizeLanguage(options.language || DEFAULT_LANG, options.country || DEFAULT_COUNTRY);
  const country = options.country || DEFAULT_COUNTRY;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'app-name': APP_NAME,
    'app-version': APP_VERSION,
    'device-id': session.deviceId,
    'device-version': DEVICE_VERSION,
    device: 'android',
    language: lang,
    country: country,
    Authorization: authHeader
  };

  let url = `${BASE_URL}${path}`;
  if (query && Object.keys(query).length > 0) {
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null && v !== '') qs.set(k, String(v));
    }
    const qStr = qs.toString();
    if (qStr) url += `?${qStr}`;
  }

  const reqInit: RequestInit = {
    method,
    headers,
    signal
  };

  if (body !== undefined && body !== null) {
    reqInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, reqInit);
  if (!res.ok) {
    throw new Error(`DramaWave API ${path} HTTP ${res.status}`);
  }

  const json = (await res.json()) as any;
  if (json.code !== 200) {
    throw new Error(`DramaWave API error ${json.code}: ${json.message || 'unknown error'}`);
  }

  return json.data;
}

function toMediaItem(raw: any = {}): MediaItem {
  const container = raw.container || {};
  const ep = container.episode_info || raw.episode || {};
  const tags = Array.isArray(raw.content_tags)
    ? raw.content_tags
    : Array.isArray(raw.tag)
    ? raw.tag
    : [];

  return {
    id: String(raw.key || raw.id || raw.series_id || ep.series_id || ''),
    title: raw.title || raw.name || ep.name || 'Untitled Drama',
    synopsis: raw.desc || raw.synopsis || ep.desc || '',
    thumbnail: raw.cover || ep.cover || null,
    landscape: ep.cover || raw.cover || null,
    genre: tags.join(', '),
    tags,
    episodeCount: raw.episode_count ?? null,
    followers: raw.follow_count ?? null,
    comments: raw.comment_count ?? null,
    free: Boolean(raw.free),
    latestEpisodeId: ep.id ? String(ep.id) : null,
    episodeIndex: ep.index ?? 1
  };
}

interface CatalogCacheEntry {
  items: MediaItem[];
  timestamp: number;
}

const catalogPoolCache = new Map<string, CatalogCacheEntry>();
const POOL_TTL = 10 * 60 * 1000; // 10 minutes cache

const REGION_POPULAR_KEYWORDS: Record<string, string[]> = {
  'id-ID': [
    'Miliarder',
    'Balas Dendam',
    'Pernikahan',
    'CEO',
    'Terlahir Kembali',
    'Cinta',
    'Keluarga',
    'Bos',
    'Naga',
    'Dokter',
    'Pewaris',
    'Istri',
    'Suami',
    'Presiden',
    'Rahasia',
    'Tuan Muda',
    'Ratu',
    'Selingkuh',
    'Kaya',
    'Gadis',
    'Putri',
    'Takdir',
    'Karma',
    'Sakti',
    'Kultivasi',
    'Kaisar',
    'Jenderal',
    'Warisan'
  ],
  'en-US': [
    'Billionaire',
    'Revenge',
    'Marriage',
    'CEO',
    'Alpha',
    'Mafia',
    'Love',
    'Doctor',
    'Reborn',
    'Secret',
    'Heir',
    'Betrayal',
    'Boss',
    'Hidden',
    'Dragon',
    'President'
  ],
  'zh-CN': ['总裁', '复仇', '神医', '重生', '战神', '豪门', '赘婿', '千金', '修仙', '兵王'],
  'zh-TW': ['總裁', '復仇', '神醫', '重生', '戰神', '豪門', '贅婿', '千金', '修仙', '兵王'],
  'ja-JP': ['社長', '復讐', '令嬢', '転生', '溺愛', '結婚', '富豪', '医者'],
  'ko-KR': ['재벌', '복수', '결혼', '회귀', '황제', '의사', '보스']
};

const inFlightPoolPromises = new Map<string, Promise<MediaItem[]>>();

export async function getHotWords(options: any = {}): Promise<string[]> {
  try {
    const country = options.country || DEFAULT_COUNTRY;
    const normLang = normalizeLanguage(options.language || DEFAULT_LANG, country);
    const res = await request('/search/hot_words', {
      method: 'GET',
      language: normLang,
      country,
      signal: options.signal
    });
    const list = Array.isArray(res?.hot_words) ? res.hot_words : [];
    const words: string[] = [];
    for (const item of list) {
      const w = (typeof item === 'string' ? item : item?.word || '').trim();
      if (w && !words.includes(w)) {
        words.push(w);
      }
    }
    return words;
  } catch (err) {
    console.warn('Failed to fetch hot words:', err);
    return [];
  }
}

export async function buildCatalogPool(language: string, country: string, signal?: AbortSignal): Promise<MediaItem[]> {
  const normLang = normalizeLanguage(language, country);
  const cacheKey = `${normLang}_${country.toUpperCase()}`;
  const now = Date.now();
  const cached = catalogPoolCache.get(cacheKey);

  if (cached && (now - cached.timestamp < POOL_TTL) && cached.items.length > 50) {
    return cached.items;
  }

  if (inFlightPoolPromises.has(cacheKey)) {
    return inFlightPoolPromises.get(cacheKey)!;
  }

  const promise = (async () => {
    const poolMap = new Map<string, MediaItem>();

    // 1. Fetch curated recommendation feed
    try {
      const feedData = await request('/foryou/feed', {
        method: 'GET',
        query: { page: 1, page_size: 20 },
        signal,
        language: normLang,
        country
      });
      const rawFeed = Array.isArray(feedData?.items) ? feedData.items : [];
      for (const raw of rawFeed) {
        const item = toMediaItem(raw);
        if (item.id && !poolMap.has(item.id)) {
          poolMap.set(item.id, item);
        }
      }
    } catch (err) {
      console.warn('Failed to fetch /foryou/feed:', err);
    }

    // 2. Fetch real-time Hot Words from provider (viral Indonesian trending dramas)
    let hotWords: string[] = [];
    try {
      hotWords = await getHotWords({ language: normLang, country, signal });
    } catch {}

    // 3. Query combined real-time hot words and official genre topics
    const baseKeywords = REGION_POPULAR_KEYWORDS[normLang] || REGION_POPULAR_KEYWORDS['id-ID'] || [
      'Balas Dendam',
      'Miliarder',
      'Pernikahan',
      'CEO',
      'Terlahir Kembali'
    ];

    const combinedKeywords = Array.from(new Set([...hotWords, ...baseKeywords]));

    await Promise.allSettled(
      combinedKeywords.slice(0, 24).map(async (kw) => {
        try {
          const searchRes = await search(kw, {
            page: 1,
            count: 30,
            signal,
            language: normLang,
            country
          });
          for (const item of searchRes.items) {
            if (item.id && !poolMap.has(item.id)) {
              poolMap.set(item.id, item);
            }
          }
        } catch (e) {
          // ignore keyword search error
        }
      })
    );

    const finalItems = Array.from(poolMap.values());
    if (finalItems.length > 0) {
      catalogPoolCache.set(cacheKey, {
        items: finalItems,
        timestamp: Date.now()
      });
    }

    inFlightPoolPromises.delete(cacheKey);
    return finalItems;
  })().catch((err) => {
    inFlightPoolPromises.delete(cacheKey);
    throw err;
  });

  inFlightPoolPromises.set(cacheKey, promise);
  return promise;
}

// Dynamically expand the catalog pool when user requests deeper pages
async function expandCatalogPool(
  cacheKey: string,
  normLang: string,
  country: string,
  targetLength: number,
  signal?: AbortSignal
): Promise<MediaItem[]> {
  const cached = catalogPoolCache.get(cacheKey);
  const currentPool = cached ? [...cached.items] : [];
  const poolMap = new Map<string, MediaItem>();
  for (const item of currentPool) {
    if (item.id) poolMap.set(item.id, item);
  }

  let hotWords: string[] = [];
  try {
    hotWords = await getHotWords({ language: normLang, country, signal });
  } catch {}

  const baseKeywords = REGION_POPULAR_KEYWORDS[normLang] || REGION_POPULAR_KEYWORDS['id-ID'] || [
    'Miliarder',
    'Balas Dendam',
    'Pernikahan',
    'CEO'
  ];

  const combinedKeywords = Array.from(new Set([...hotWords, ...baseKeywords]));

  // Try subsequent search pages (pages 2, 3, 4, 5, 6) across keywords
  const startSearchPage = Math.max(2, Math.floor(currentPool.length / 80) + 1);
  const maxSearchPage = startSearchPage + 5;

  for (let searchPage = startSearchPage; searchPage <= maxSearchPage; searchPage++) {
    if (poolMap.size >= targetLength) break;

    const sizeBefore = poolMap.size;
    await Promise.allSettled(
      combinedKeywords.map(async (kw) => {
        try {
          const res = await search(kw, {
            page: searchPage,
            count: 30,
            signal,
            language: normLang,
            country
          });
          for (const item of res.items) {
            if (item.id && !poolMap.has(item.id)) {
              poolMap.set(item.id, item);
            }
          }
        } catch {}
      })
    );

    // If no new items were added in this round, stop
    if (poolMap.size === sizeBefore) {
      break;
    }
  }

  const finalItems = Array.from(poolMap.values());
  catalogPoolCache.set(cacheKey, {
    items: finalItems,
    timestamp: Date.now()
  });
  return finalItems;
}

export async function getCatalog(options: any = {}) {
  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(options.count) || Number(options.pageSize) || 24));
  const normLang = normalizeLanguage(options.language || DEFAULT_LANG, options.country || DEFAULT_COUNTRY);
  const country = options.country || DEFAULT_COUNTRY;
  const cacheKey = `${normLang}_${country.toUpperCase()}`;

  let allItems = await buildCatalogPool(normLang, country, options.signal);

  const startIndex = (page - 1) * pageSize;
  const endIndex = startIndex + pageSize;

  // If user is paginating beyond currently cached items, dynamically expand catalog pool from upstream API!
  if (endIndex > allItems.length) {
    allItems = await expandCatalogPool(cacheKey, normLang, country, endIndex + pageSize * 2, options.signal);
  }

  const items = allItems.slice(startIndex, endIndex);
  const hasMore = endIndex < allItems.length || items.length === pageSize;

  return {
    page,
    count: items.length,
    total: allItems.length,
    hasMore,
    items
  };
}

export async function search(query: string, options: any = {}) {
  if (!query || typeof query !== 'string') {
    throw new Error('Search query is required');
  }

  const page = Math.max(1, Number(options.page) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(options.count) || Number(options.pageSize) || 24));

  const data = await request('/search/drama', {
    method: 'POST',
    body: {
      keyword: query.trim(),
      page,
      page_size: pageSize
    },
    signal: options.signal,
    language: options.language,
    country: options.country
  });

  const rawItems = Array.isArray(data?.items) ? data.items : [];
  const items = rawItems.map(toMediaItem).filter((item: MediaItem) => Boolean(item.id));
  const hasMore = Boolean(data?.page_info?.has_more !== undefined ? data.page_info.has_more : items.length >= pageSize);

  return {
    query: query.trim(),
    page,
    count: items.length,
    hasMore,
    items
  };
}

export async function getSeries(seriesId: string, options: any = {}) {
  if (!seriesId) throw new Error('Series ID is required');
  const targetId = String(seriesId).trim();

  const [infoData, priceData] = await Promise.all([
    request('/drama/info_push_v2', {
      method: 'GET',
      query: { series_id: targetId },
      signal: options.signal,
      language: options.language,
      country: options.country
    }).catch(() => null),
    request('/drama/price', {
      method: 'GET',
      query: { series_id: targetId },
      signal: options.signal,
      language: options.language,
      country: options.country
    })
  ]);

  const info = infoData?.info || {};
  const rawEpisodes = Array.isArray(priceData?.episode_list) ? priceData.episode_list : [];

  const episodes: EpisodeItem[] = rawEpisodes.map((e: any) => ({
    videoId: String(e.id),
    episodeId: String(e.id),
    seriesId: targetId,
    index: e.index,
    episode: e.index,
    title: `${info.name || 'Episode'} - Ep ${e.index}`,
    price: e.episode_price ?? 0,
    isPaid: Boolean(e.episode_price && e.episode_price > 0 && e.index > (info.pay_index || 10000))
  }));

  const category = {
    id: targetId,
    title: info.name || '',
    synopsis: info.desc || '',
    cover: info.cover || null,
    thumbnail: info.cover || null,
    episodeCount: info.episode_count ?? episodes.length,
    followCount: info.follow_count ?? null,
    payIndex: info.pay_index ?? null,
    firstEpisode: info.episode ? {
      id: String(info.episode.id),
      cover: info.episode.cover,
      streamUrl: info.episode.external_audio_h264_m3u8 || info.episode.m3u8_url || null,
      subtitles: info.episode.subtitle_list || [],
      audio: info.episode.audio || []
    } : null
  };

  return {
    seriesId: targetId,
    category,
    total: episodes.length,
    items: episodes
  };
}

export async function getEpisodes(seriesId: string, options: any = {}) {
  const res = await getSeries(seriesId, options);
  return {
    seriesId: res.seriesId,
    total: res.total,
    items: res.items
  };
}

export async function getCategories(options: any = {}) {
  const data = await request('/homepage/v3/tab/list', {
    method: 'GET',
    signal: options.signal,
    language: options.language,
    country: options.country
  });

  const list = Array.isArray(data?.list) ? data.list : [];
  const categories: any[] = [];

  for (const tab of list) {
    const cat: any = {
      name: tab.name || tab.business_name || '',
      tabKey: tab.tab_key,
      tabType: tab.tab_type,
      subTabs: (tab.children || []).map((c: any) => ({
        name: c.name,
        tabKey: c.tab_key,
        businessName: c.business_name
      })),
      filters: []
    };

    if (tab.filter?.filter_item && Array.isArray(tab.filter.filter_item)) {
      cat.filters = tab.filter.filter_item.map((fi: any) => ({
        id: fi.id,
        name: fi.name,
        options: (fi.children || []).map((ch: any) => ({
          id: ch.id,
          name: ch.name
        }))
      }));
    }

    categories.push(cat);
  }

  return {
    total: categories.length,
    items: categories
  };
}

export async function unlockEpisode(seriesId: string, episodeId: string, options: any = {}): Promise<UnlockedEpisode> {
  if (!seriesId || !episodeId) throw new Error('Series ID and Episode ID are required');

  const data = await request('/drama/unlock_episode', {
    method: 'POST',
    body: {
      series_id: String(seriesId).trim(),
      episode_id: String(episodeId).trim()
    },
    signal: options.signal,
    language: options.language,
    country: options.country
  });

  const streamUrl = data.external_audio_h264_m3u8 || data.m3u8_url || data.video_url || null;
  const subtitles: SubtitleItem[] = (data.subtitle_list || []).map((s: any) => ({
    language: s.language,
    displayName: s.display_name,
    vtt: s.vtt || null,
    srt: s.subtitle || null,
    isOriginal: s.type === 'original'
  }));

  return {
    seriesId: String(seriesId),
    episodeId: String(episodeId),
    index: data.index ?? null,
    unlocked: Boolean(data.unlock),
    videoType: data.video_type || 'free',
    duration: data.duration ?? 0,
    url: streamUrl,
    subtitles,
    audioTracks: data.audio || [],
    originalAudio: data.original_audio_language || null,
    spriteVtt: data.sprite_vtt_url || null
  };
}

export async function getDetail(seriesId: string, options: any = {}) {
  if (!seriesId) throw new Error('Series ID is required');
  const targetId = String(seriesId).trim();

  const seriesData = await getSeries(targetId, options);
  const info = seriesData.category || {};
  const episodes = seriesData.items || [];

  let officialCover = info.cover || info.thumbnail || null;
  if (!officialCover && info.title) {
    try {
      const s = await search(info.title, { count: 6, language: options.language, country: options.country });
      const m = s.items.find((i: MediaItem) => i.id === targetId) || s.items[0];
      if (m?.thumbnail) {
        officialCover = m.thumbnail;
      }
    } catch {}
  }

  return {
    id: targetId,
    title: info.title || '',
    synopsis: info.synopsis || '',
    cover: officialCover,
    thumbnail: officialCover,
    totalEpisodes: episodes.length,
    latestEpisode: episodes.length ? episodes[episodes.length - 1].episode : null,
    earliestEpisode: episodes.length ? episodes[0].episode : null,
    payIndex: info.payIndex,
    firstEpisode: info.firstEpisode,
    episodes
  };
}

function parseInputId(input: string) {
  if (!input || typeof input !== 'string') return null;
  const str = input.trim();

  if (/^https?:\/\//i.test(str)) {
    try {
      const url = new URL(str);
      const idParam = url.searchParams.get('id') || url.searchParams.get('series_id') || url.searchParams.get('series_key');
      if (idParam) return idParam;
      const match = url.pathname.match(/\/([a-zA-Z0-9_-]{8,})/);
      if (match) return match[1];
    } catch {}
  }

  if (/^[a-zA-Z0-9_-]{6,32}$/.test(str)) {
    return str;
  }

  return null;
}

export async function download(input: string, options: any = {}) {
  if (!input || typeof input !== 'string') {
    throw new Error('URL, title, or series ID is required');
  }

  let seriesId = parseInputId(input);
  let seriesTitle = '';

  if (!seriesId) {
    const hits = await search(input, { count: 5, signal: options.signal, language: options.language, country: options.country });
    if (!hits.items.length || !hits.items[0].id) {
      throw new Error(`No DramaWave result found for "${input}"`);
    }
    seriesId = hits.items[0].id;
    seriesTitle = hits.items[0].title;
  }

  const validSeriesId = seriesId!;
  const seriesData = await getSeries(validSeriesId, options);
  seriesTitle = seriesTitle || seriesData.category?.title || '';
  const episodes = seriesData.items || [];

  if (!episodes.length) {
    throw new Error(`No episodes found for series "${validSeriesId}"`);
  }

  let chosen = null;
  if (options.episode !== undefined && options.episode !== null && options.episode !== '') {
    const wanted = Number(options.episode);
    if (Number.isFinite(wanted)) {
      chosen = episodes.find((e) => e.episode === wanted);
    } else {
      const wantedStr = String(options.episode).toLowerCase();
      chosen = episodes.find((e) => e.title.toLowerCase().includes(wantedStr) || e.episodeId === options.episode);
    }
  }

  if (!chosen) {
    chosen = episodes[0];
  }

  const unlocked = await unlockEpisode(validSeriesId, chosen.episodeId, options);
  const mediaUrl = unlocked.url;

  if (!mediaUrl) {
    throw new Error(`Failed to resolve stream URL for episode ${chosen.episode}`);
  }

  return {
    title: `${seriesTitle} - Ep ${chosen.episode}`,
    series: seriesTitle,
    episode: chosen.episode,
    seriesId,
    episodeId: chosen.episodeId,
    quality: 'h264',
    url: mediaUrl,
    downloadUrl: mediaUrl,
    subtitles: unlocked.subtitles,
    audioTracks: unlocked.audioTracks,
    duration: unlocked.duration,
    thumbnail: seriesData.category?.firstEpisode?.cover || null,
    synopsis: seriesData.category?.synopsis || ''
  };
}

export const resolve = download;

export default {
  getCatalog,
  buildCatalogPool,
  search,
  getSeries,
  getEpisodes,
  getDetail,
  getCategories,
  unlockEpisode,
  download,
  resolve,
  normalizeLanguage
};
