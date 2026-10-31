import React, { useState, useEffect, useRef } from 'react';
import { Loader2, RefreshCw, Globe, Search, X, Flame } from 'lucide-react';
import { MediaItem } from '../types.ts';
import { fetchFeed, searchDramas, fetchHotWords } from '../lib/api.ts';
import { syncHistoryThumbnails } from '../lib/storage.ts';
import { DramaCard } from './DramaCard.tsx';
import { RegionSetting, getRegionInfo } from '../lib/regionConfig.ts';

interface BrowseViewProps {
  onSelectDrama: (drama: MediaItem) => void;
  onPlayDirect: (drama: MediaItem) => void;
  onOpenReels: (drama: MediaItem) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (drama: MediaItem) => void;
  getWatchedEp: (id: string) => number | undefined;
  region: RegionSetting;
  onOpenRegion?: () => void;
}

const CATEGORIES = [
  { id: 'all', label: 'Semua Drama', query: '' },
  { id: 'ceo', label: 'CEO & Miliarder', query: 'Miliarder' },
  { id: 'revenge', label: 'Balas Dendam', query: 'Balas Dendam' },
  { id: 'marriage', label: 'Pernikahan Kontrak', query: 'Pernikahan' },
  { id: 'reborn', label: 'Terlahir Kembali', query: 'Terlahir Kembali' },
  { id: 'dragon', label: 'Dewa Perang & Naga', query: 'Naga' },
  { id: 'doctor', label: 'Tabib Sakti / Dokter', query: 'Dokter' },
  { id: 'love', label: 'Romantis & Cinta', query: 'Cinta' },
  { id: 'boss', label: 'Bos & Pewaris', query: 'Pewaris' },
  { id: 'family', label: 'Konflik Keluarga', query: 'Keluarga' },
  { id: 'secret', label: 'Rahasia Identitas', query: 'Rahasia' },
  { id: 'youngmaster', label: 'Tuan Muda Sakti', query: 'Tuan' },
  { id: 'queen', label: 'Ratu & Gadis Kuat', query: 'Ratu' },
  { id: 'cheating', label: 'Selingkuh & Karma', query: 'Selingkuh' },
  { id: 'rich', label: 'Konglomerat & Warisan', query: 'Warisan' },
  { id: 'latest', label: 'Rilis Terbaru', query: '2025' },
];

export const BrowseView: React.FC<BrowseViewProps> = ({
  onSelectDrama,
  onPlayDirect,
  onOpenReels,
  isBookmarked,
  onToggleBookmark,
  getWatchedEp,
  region,
  onOpenRegion,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [debouncedQuery, setDebouncedQuery] = useState<string>('');
  const [hotWords, setHotWords] = useState<string[]>([]);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);
  const regionInfo = getRegionInfo(region.country, region.language);

  // Fetch real-time hot trending search words
  useEffect(() => {
    fetchHotWords(region.language, region.country)
      .then((words) => setHotWords(words))
      .catch(() => setHotWords([]));
  }, [region.language, region.country]);

  // Debounce search input by 400ms
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(searchQuery.trim());
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load items based on active category, search query, and region
  useEffect(() => {
    let active = true;
    setLoading(true);
    setPage(1);

    const loadData = async () => {
      try {
        const cat = CATEGORIES.find((c) => c.id === activeCategory);
        const queryToUse = debouncedQuery || (cat && cat.query ? cat.query : '');

        let res;
        if (!queryToUse) {
          res = await fetchFeed(1, 24, region.language, region.country);
        } else {
          res = await searchDramas(queryToUse, 1, 24, region.language, region.country);
        }

        if (active) {
          const loaded = res.items || [];
          setItems(loaded);
          setHasMore(Boolean(res.hasMore !== undefined ? res.hasMore : loaded.length >= 20));
          setLoading(false);
          syncHistoryThumbnails(loaded);
        }
      } catch (err) {
        console.error('Error loading browse items:', err);
        if (active) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      active = false;
    };
  }, [activeCategory, debouncedQuery, region.country, region.language]);

  const handleLoadMore = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;

    try {
      const cat = CATEGORIES.find((c) => c.id === activeCategory);
      const queryToUse = debouncedQuery || (cat && cat.query ? cat.query : '');

      let res;
      if (!queryToUse) {
        res = await fetchFeed(nextPage, 24, region.language, region.country);
      } else {
        res = await searchDramas(queryToUse, nextPage, 24, region.language, region.country);
      }

      const newItems = res.items || [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const trulyNew = newItems.filter((i) => !seen.has(i.id));
          return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
        });

        syncHistoryThumbnails(newItems);
        setPage(nextPage);
        // Continue loading as long as upstream API indicates hasMore or returned full page
        setHasMore(Boolean(res.hasMore !== undefined ? res.hasMore : newItems.length >= 20));
      }
    } catch (e) {
      console.error('Error loading more in browse:', e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Auto infinite scroll when scrolling near bottom
  useEffect(() => {
    if (!hasMore || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          handleLoadMore();
        }
      },
      { rootMargin: '600px 0px' }
    );

    const el = loadMoreTriggerRef.current;
    if (el) observer.observe(el);

    const handleWindowScroll = () => {
      if (loadingMore || !hasMore) return;
      const scrollPos = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 800;
      if (scrollPos >= threshold) {
        handleLoadMore();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      if (el) observer.unobserve(el);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [hasMore, loadingMore, page, loading, activeCategory, debouncedQuery]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      {/* Header with Search and Region info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono uppercase tracking-tight mb-1.5">
            Jelajah Katalog Drama China
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8ba2b8]">
            Akses ratusan drama pendek vertikal resmi tanpa batas dengan alur cerita seru dan takarir multi-bahasa.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {onOpenRegion && (
            <button
              onClick={onOpenRegion}
              className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-[#16222f] border border-slate-200 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] text-slate-700 dark:text-[#c4d5e5] hover:text-slate-900 dark:hover:text-white transition-colors text-xs shrink-0 font-mono"
              title="Ubah Negara & Bahasa"
            >
              <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-[#38bdf8]" />
              <span>{regionInfo.country.flag} {region.country} ({region.language})</span>
            </button>
          )}
        </div>
      </div>

      {/* Direct Search Input inside Browse */}
      <div className="relative mb-6">
        <div className="relative flex items-center">
          <Search className="w-4 h-4 text-slate-400 dark:text-[#8ba2b8] absolute left-3.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul drama, tema, karakter (contoh: Miliarder, CEO, Balas Dendam, Istri)..."
            className="w-full bg-white dark:bg-[#16222f] border border-slate-300 dark:border-[#26394c] pl-10 pr-10 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#647c94] focus:outline-hidden focus:border-blue-500 dark:focus:border-[#38bdf8] transition-colors shadow-2xs font-sans"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 p-1 rounded-none text-slate-400 hover:text-slate-700 dark:text-[#8ba2b8] dark:hover:text-white transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Real-time Trending Hot Words */}
      {hotWords.length > 0 && (
        <div className="mb-5">
          <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-blue-600 dark:text-[#38bdf8] mb-2.5">
            <Flame className="w-3.5 h-3.5 fill-blue-600 dark:fill-[#38bdf8] text-blue-600 dark:text-[#38bdf8]" />
            <span>Pencarian Tren Hari Ini (Hot Words):</span>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {hotWords.map((word) => {
              const isSelected = searchQuery.trim().toLowerCase() === word.toLowerCase();
              return (
                <button
                  key={word}
                  onClick={() => {
                    setSearchQuery(word);
                    setActiveCategory('all');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono whitespace-nowrap transition-all border ${
                    isSelected
                      ? 'bg-blue-600 dark:bg-[#38bdf8] border-blue-600 dark:border-[#38bdf8] text-white dark:text-[#0b1320] font-bold'
                      : 'bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1e2f41] border-slate-200 dark:border-[#26394c] text-slate-700 dark:text-[#c4d5e5] hover:text-slate-900 dark:hover:text-white'
                  }`}
                  title={`Cari drama viral: ${word}`}
                >
                  <span>{word}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Category Pills / Filter Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-6 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const isActive = activeCategory === cat.id && !debouncedQuery;
          return (
            <button
              key={cat.id}
              onClick={() => {
                setSearchQuery('');
                setActiveCategory(cat.id);
              }}
              className={`px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider whitespace-nowrap transition-all border ${
                isActive
                  ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] border-blue-600 dark:border-[#38bdf8] font-bold'
                  : 'bg-white dark:bg-[#16222f] border-slate-200 dark:border-[#26394c] text-slate-700 dark:text-[#c4d5e5] hover:border-slate-400 dark:hover:border-[#385068] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          );
        })}
      </div>

      {/* Results Count & Active Category Indicator */}
      <div className="flex items-center justify-between text-xs font-mono text-slate-500 dark:text-[#8ba2b8] mb-6 pb-3 border-b border-slate-200 dark:border-[#26394c]">
        <div>
          {debouncedQuery ? (
            <span>Hasil pencarian untuk "<strong className="text-slate-900 dark:text-white">{debouncedQuery}</strong>":</span>
          ) : (
            <span>Kategori: <strong className="text-slate-900 dark:text-white">{CATEGORIES.find((c) => c.id === activeCategory)?.label}</strong></span>
          )}
        </div>
        <div className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
          Menampilkan {items.length} drama
        </div>
      </div>

      {/* Grid of Dramas */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-[#8ba2b8]">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 dark:text-[#38bdf8] mb-3" />
          <p className="text-xs font-mono uppercase tracking-wide">Memuat katalog drama dari server...</p>
        </div>
      ) : items.length > 0 ? (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5 mb-10">
            {items.map((drama) => (
              <DramaCard
                key={drama.id}
                drama={drama}
                onSelect={onSelectDrama}
                onPlayDirect={onPlayDirect}
                onOpenReels={onOpenReels}
                isBookmarked={isBookmarked(drama.id)}
                onToggleBookmark={onToggleBookmark}
                lastWatchedEp={getWatchedEp(drama.id)}
              />
            ))}
          </div>

          {/* Load More & Infinite Scroll Section */}
          <div ref={loadMoreTriggerRef} className="py-6 flex flex-col items-center justify-center gap-4">
            {hasMore && (
              <button
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="flex items-center gap-2.5 px-6 py-2.5 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1e2f41] border border-slate-300 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] text-slate-800 dark:text-slate-200 font-mono font-medium text-xs transition-all shadow-xs disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-[#38bdf8]" />
                    <span>Mengambil Drama Tambahan dari API...</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                    <span>Muat Lebih Banyak Drama (Halaman {page + 1})</span>
                  </>
                )}
              </button>
            )}

            {!hasMore && items.length > 0 && (
              <p className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] py-3 text-center">
                Semua drama dari server untuk kategori ini telah selesai dimuat ({items.length} drama ditemukan).
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="py-20 text-center text-slate-500 dark:text-[#8ba2b8]">
          <p className="text-base font-semibold text-slate-800 dark:text-slate-200 mb-1">Tidak ada drama yang cocok</p>
          <p className="text-xs text-slate-500 dark:text-[#8ba2b8] mb-4">
            Coba gunakan kata kunci pencarian lain atau pilih kategori di atas.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setActiveCategory('all');
            }}
            className="px-4 py-2 bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-mono text-xs font-bold transition-colors"
          >
            Kembali ke Semua Drama
          </button>
        </div>
      )}
    </div>
  );
};
