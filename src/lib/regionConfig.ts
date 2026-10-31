export interface RegionSetting {
  country: string; // ISO 3166-1 alpha-2, e.g. ID, US, CN
  language: string; // ISO 639-1 or locale, e.g. id, en, zh
}

export interface RegionPreset {
  id: string;
  country: string;
  language: string;
  name: string;
  flag: string;
  nativeLang: string;
  isDefault?: boolean;
}

export const REGION_PRESETS: RegionPreset[] = [
  {
    id: 'id',
    country: 'ID',
    language: 'id-ID',
    name: 'Indonesia',
    flag: '🇮🇩',
    nativeLang: 'Bahasa Indonesia',
    isDefault: true,
  },
  {
    id: 'us',
    country: 'US',
    language: 'en-US',
    name: 'Amerika Serikat / Global',
    flag: '🇺🇸',
    nativeLang: 'English',
  },
  {
    id: 'cn',
    country: 'CN',
    language: 'zh-CN',
    name: 'Tiongkok',
    flag: '🇨🇳',
    nativeLang: '简体中文',
  },
  {
    id: 'tw',
    country: 'TW',
    language: 'zh-TW',
    name: 'Taiwan',
    flag: '🇹🇼',
    nativeLang: '繁體中文',
  },
  {
    id: 'jp',
    country: 'JP',
    language: 'ja-JP',
    name: 'Jepang',
    flag: '🇯🇵',
    nativeLang: '日本語',
  },
  {
    id: 'kr',
    country: 'KR',
    language: 'ko-KR',
    name: 'Korea Selatan',
    flag: '🇰🇷',
    nativeLang: '한국어',
  },
  {
    id: 'vn',
    country: 'VN',
    language: 'vi-VN',
    name: 'Vietnam',
    flag: '🇻🇳',
    nativeLang: 'Tiếng Việt',
  },
  {
    id: 'th',
    country: 'TH',
    language: 'th-TH',
    name: 'Thailand',
    flag: '🇹🇭',
    nativeLang: 'ไทย',
  },
  {
    id: 'my',
    country: 'MY',
    language: 'ms-MY',
    name: 'Malaysia',
    flag: '🇲🇾',
    nativeLang: 'Bahasa Melayu',
  },
  {
    id: 'ph',
    country: 'PH',
    language: 'tl-PH',
    name: 'Filipina',
    flag: '🇵🇭',
    nativeLang: 'Filipino / Tagalog',
  },
  {
    id: 'es',
    country: 'ES',
    language: 'es-MX',
    name: 'Spanyol / LatAm',
    flag: '🇪🇸',
    nativeLang: 'Español',
  },
  {
    id: 'br',
    country: 'BR',
    language: 'pt-PT',
    name: 'Brasil',
    flag: '🇧🇷',
    nativeLang: 'Português',
  },
  {
    id: 'fr',
    country: 'FR',
    language: 'fr-FR',
    name: 'Prancis',
    flag: '🇫🇷',
    nativeLang: 'Français',
  },
  {
    id: 'de',
    country: 'DE',
    language: 'de-DE',
    name: 'Jerman',
    flag: '🇩🇪',
    nativeLang: 'Deutsch',
  },
  {
    id: 'ru',
    country: 'RU',
    language: 'ru-RU',
    name: 'Rusia',
    flag: '🇷🇺',
    nativeLang: 'Русский',
  },
  {
    id: 'sa',
    country: 'SA',
    language: 'ar-SA',
    name: 'Arab Saudi',
    flag: '🇸🇦',
    nativeLang: 'العربية',
  },
];

export const AVAILABLE_COUNTRIES = [
  { code: 'ID', name: 'Indonesia', flag: '🇮🇩' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'CN', name: 'China', flag: '🇨🇳' },
  { code: 'TW', name: 'Taiwan', flag: '🇹🇼' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
  { code: 'KR', name: 'South Korea', flag: '🇰🇷' },
  { code: 'VN', name: 'Vietnam', flag: '🇻🇳' },
  { code: 'TH', name: 'Thailand', flag: '🇹🇭' },
  { code: 'MY', name: 'Malaysia', flag: '🇲🇾' },
  { code: 'PH', name: 'Philippines', flag: '🇵🇭' },
  { code: 'SG', name: 'Singapore', flag: '🇸🇬' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'MX', name: 'Mexico', flag: '🇲🇽' },
  { code: 'BR', name: 'Brazil', flag: '🇧🇷' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'RU', name: 'Russia', flag: '🇷🇺' },
  { code: 'SA', name: 'Saudi Arabia', flag: '🇸🇦' },
  { code: 'IN', name: 'India', flag: '🇮🇳' },
];

export const AVAILABLE_LANGUAGES = [
  { code: 'id-ID', name: 'Bahasa Indonesia', nativeName: 'Indonesia' },
  { code: 'en-US', name: 'English', nativeName: 'English' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', nativeName: '简体中文' },
  { code: 'zh-TW', name: 'Chinese (Traditional)', nativeName: '繁體中文' },
  { code: 'ja-JP', name: 'Japanese', nativeName: '日本語' },
  { code: 'ko-KR', name: 'Korean', nativeName: '한국어' },
  { code: 'vi-VN', name: 'Vietnamese', nativeName: 'Tiếng Việt' },
  { code: 'th-TH', name: 'Thai', nativeName: 'ไทย' },
  { code: 'ms-MY', name: 'Malay', nativeName: 'Bahasa Melayu' },
  { code: 'tl-PH', name: 'Tagalog / Filipino', nativeName: 'Filipino' },
  { code: 'es-MX', name: 'Spanish', nativeName: 'Español' },
  { code: 'pt-PT', name: 'Portuguese', nativeName: 'Português' },
  { code: 'fr-FR', name: 'French', nativeName: 'Français' },
  { code: 'de-DE', name: 'German', nativeName: 'Deutsch' },
  { code: 'ru-RU', name: 'Russian', nativeName: 'Русский' },
  { code: 'ar-SA', name: 'Arabic', nativeName: 'العربية' },
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी' },
];

const STORAGE_KEY = 'dracinhub_region_v1';

// Default is Indonesia (ID / id-ID) for full Indonesian metadata & subtitles
export const DEFAULT_REGION: RegionSetting = {
  country: 'ID',
  language: 'id-ID',
};

export function getStoredRegion(): RegionSetting {
  if (typeof window === 'undefined') return DEFAULT_REGION;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_REGION;
    const parsed = JSON.parse(raw);
    let lang = parsed.language || DEFAULT_REGION.language;
    // Auto-migrate legacy 2-letter codes or legacy defaults to proper FreeReels BCP-47 locale tags
    if (lang === 'id' || lang === 'in' || lang === 'ind') {
      lang = 'id-ID';
    } else if (lang === 'en') {
      lang = 'en-US';
    } else if (lang === 'zh') {
      lang = 'zh-CN';
    }
    return {
      country: parsed.country || DEFAULT_REGION.country,
      language: lang,
    };
  } catch {
    return DEFAULT_REGION;
  }
}

export function saveStoredRegion(region: RegionSetting): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(region));
  } catch (e) {
    console.error('Failed to save region setting', e);
  }
}

export function getRegionInfo(countryCode: string, langCode: string) {
  const country = AVAILABLE_COUNTRIES.find((c) => c.code.toUpperCase() === countryCode.toUpperCase()) || {
    code: countryCode,
    name: countryCode,
    flag: '🌐',
  };

  const cleanLang = (langCode || 'id-ID').toLowerCase();
  const language = AVAILABLE_LANGUAGES.find((l) => {
    const c = l.code.toLowerCase();
    return c === cleanLang || c.startsWith(cleanLang) || cleanLang.startsWith(c.split('-')[0]);
  }) || {
    code: langCode,
    name: langCode,
    nativeName: langCode,
  };

  return { country, language };
}
