import React, { useEffect, useState, useRef } from 'react';
import {
  Flame,
  Clock,
  Sparkles,
  Smartphone,
  ChevronRight,
  Loader2,
  RefreshCw,
  Globe
} from 'lucide-react';
import { MediaItem, SeriesDetail, WatchHistoryItem, BookmarkItem } from './types.ts';
import { fetchFeed, fetchSeriesDetail } from './lib/api.ts';
import {
  getWatchHistory,
  getBookmarks,
  isBookmarked,
  toggleBookmark,
  syncHistoryThumbnails,
} from './lib/storage.ts';
import {
  RegionSetting,
  getStoredRegion,
  saveStoredRegion,
  getRegionInfo
} from './lib/regionConfig.ts';
import { useIsMobile, isMobileDevice } from './lib/useIsMobile.ts';
import { useTheme } from './lib/theme.ts';
import { isDubDrama, getFormattedTitle, getFormattedEpisodeMeta } from './lib/dramaFormatter.ts';

// Components
import { Navbar } from './components/Navbar.tsx';
import { HeroBanner } from './components/HeroBanner.tsx';
import { DramaCard } from './components/DramaCard.tsx';
import { VideoPlayer } from './components/VideoPlayer.tsx';
import { ReelsModePlayer } from './components/ReelsModePlayer.tsx';
import { DramaDetailModal } from './components/DramaDetailModal.tsx';
import { SearchModal } from './components/SearchModal.tsx';
import { DirectResolverModal } from './components/DirectResolverModal.tsx';
import { BrowseView } from './components/BrowseView.tsx';
import { LibraryView } from './components/LibraryView.tsx';
import { RegionModal } from './components/RegionModal.tsx';

export default function App() {
  const isMobile = useIsMobile();
  const [theme, toggleTheme] = useTheme();
  const [currentTab, setCurrentTab] = useState<'home' | 'browse' | 'reels' | 'library'>('home');

  // Country & Language Region State (Default Indonesia ID / id)
  const [region, setRegion] = useState<RegionSetting>(() => getStoredRegion());
  const [showRegionModal, setShowRegionModal] = useState<boolean>(false);

  // Main data states
  const [feedItems, setFeedItems] = useState<MediaItem[]>([]);
  const [loadingFeed, setLoadingFeed] = useState<boolean>(true);
  const [page, setPage] = useState<number>(1);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [loadingMore, setLoadingMore] = useState<boolean>(false);
  const loadMoreTriggerRef = useRef<HTMLDivElement>(null);

  // User storage states
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>([]);

  // Active viewing and modal states
  const [selectedDrama, setSelectedDrama] = useState<MediaItem | null>(null);
  const [activeTheaterSeries, setActiveTheaterSeries] = useState<{
    series: SeriesDetail;
    episodeIndex: number;
    coverImage?: string | null;
  } | null>(null);
  const [activeReelsSeries, setActiveReelsSeries] = useState<{
    series: SeriesDetail;
    episodeIndex: number;
    coverImage?: string | null;
  } | null>(null);

  // Modals
  const [showSearchModal, setShowSearchModal] = useState<boolean>(false);
  const [showResolverModal, setShowResolverModal] = useState<boolean>(false);

  // Load initial feed and storage
  useEffect(() => {
    refreshStorageData();

    let active = true;
    setLoadingFeed(true);

    fetchFeed(1, 20, region.language, region.country)
      .then((data) => {
        if (active) {
          const items = data.items || [];
          setFeedItems(items);
          setHasMore(data.hasMore);
          setLoadingFeed(false);
          // Sync any history items with the authentic dashboard posters
          syncHistoryThumbnails(items);
          refreshStorageData();
        }
      })
      .catch((err) => {
        console.error('Error loading initial feed:', err);
        if (active) setLoadingFeed(false);
      });

    // Check URL parameters for direct deep-link (e.g. ?id=1YziNliD46)
    const params = new URLSearchParams(window.location.search);
    const deepId = params.get('id') || params.get('series_id');
    if (deepId) {
      fetchSeriesDetail(deepId, region.language, region.country)
        .then((detail) => {
          if (active && detail) {
            const cover = detail.thumbnail || detail.cover || null;
            if (isMobileDevice()) {
              setActiveReelsSeries({
                series: detail,
                episodeIndex: 1,
                coverImage: cover,
              });
            } else {
              setActiveTheaterSeries({
                series: detail,
                episodeIndex: 1,
                coverImage: cover,
              });
            }
          }
        })
        .catch((e) => console.warn('Deep link error:', e));
    }

    // Keyboard shortcut for search (Ctrl+K or /)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === 'k' && (e.ctrlKey || e.metaKey)) || (e.key === '/' && document.activeElement?.tagName !== 'INPUT')) {
        e.preventDefault();
        setShowSearchModal(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      active = false;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const refreshStorageData = () => {
    setHistory(getWatchHistory());
    setBookmarks(getBookmarks());
  };

  const handleApplyRegion = (newRegion: RegionSetting) => {
    setRegion(newRegion);
    saveStoredRegion(newRegion);
    setLoadingFeed(true);
    setPage(1);

    fetchFeed(1, 20, newRegion.language, newRegion.country)
      .then((data) => {
        const items = data.items || [];
        setFeedItems(items);
        setHasMore(data.hasMore);
        setLoadingFeed(false);
        syncHistoryThumbnails(items);
        refreshStorageData();
      })
      .catch((err) => {
        console.error('Error reloading feed for new region:', err);
        setLoadingFeed(false);
      });
  };

  const handleToggleBookmark = (drama: MediaItem) => {
    toggleBookmark({
      seriesId: drama.id,
      seriesTitle: drama.title,
      thumbnail: drama.thumbnail,
      genre: drama.genre,
      totalEpisodes: drama.episodeCount,
    });
    refreshStorageData();
  };

  // Launch Drama (Reels Mode if on mobile, Theater Mode if on desktop)
  const handlePlayDrama = async (drama: MediaItem, startEp = 1) => {
    try {
      const detail = await fetchSeriesDetail(drama.id, region.language, region.country);
      const cover = drama.thumbnail || detail.thumbnail || detail.cover || null;
      if (isMobile) {
        setActiveReelsSeries({ series: detail, episodeIndex: startEp, coverImage: cover });
      } else {
        setActiveTheaterSeries({ series: detail, episodeIndex: startEp, coverImage: cover });
      }
      setSelectedDrama(null);
    } catch (e) {
      console.error('Failed to open drama for playback:', e);
    }
  };

  // Launch Drama in Reels Mode
  const handleOpenReels = async (drama: MediaItem, startEp = 1) => {
    try {
      const detail = await fetchSeriesDetail(drama.id, region.language, region.country);
      const cover = drama.thumbnail || detail.thumbnail || detail.cover || null;
      setActiveReelsSeries({ series: detail, episodeIndex: startEp, coverImage: cover });
      setSelectedDrama(null);
    } catch (e) {
      console.error('Failed to open reels for playback:', e);
    }
  };

  // Switch between Theater and Reels
  const handleSwitchReelsToTheater = (episodeIndex: number) => {
    if (!activeReelsSeries) return;
    setActiveTheaterSeries({
      series: activeReelsSeries.series,
      episodeIndex,
      coverImage: activeReelsSeries.coverImage || activeReelsSeries.series.thumbnail || null,
    });
    setActiveReelsSeries(null);
  };

  const handleSwitchTheaterToReels = (episodeIndex: number) => {
    if (!activeTheaterSeries) return;
    setActiveReelsSeries({
      series: activeTheaterSeries.series,
      episodeIndex,
      coverImage: activeTheaterSeries.coverImage || activeTheaterSeries.series.thumbnail || null,
    });
    setActiveTheaterSeries(null);
  };

  // Resume from Watch History (Reels Mode if on mobile, Theater Mode if on desktop)
  const handlePlayHistory = async (item: WatchHistoryItem) => {
    try {
      const detail = await fetchSeriesDetail(item.seriesId, region.language, region.country);
      const cover = item.thumbnail || detail.thumbnail || detail.cover || null;
      if (isMobile) {
        setActiveReelsSeries({ series: detail, episodeIndex: item.lastEpisodeIndex || 1, coverImage: cover });
      } else {
        setActiveTheaterSeries({ series: detail, episodeIndex: item.lastEpisodeIndex || 1, coverImage: cover });
      }
    } catch (e) {
      console.error('Failed to resume history drama:', e);
    }
  };

  // Load More Feed with strict deduplication
  const handleLoadMoreFeed = async () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    const nextPage = page + 1;
    try {
      const res = await fetchFeed(nextPage, 16, region.language, region.country);
      const newItems = res.items || [];
      if (newItems.length === 0) {
        setHasMore(false);
      } else {
        setFeedItems((prev) => {
          const seen = new Set(prev.map((i) => i.id));
          const trulyNew = newItems.filter((i) => !seen.has(i.id));
          return trulyNew.length > 0 ? [...prev, ...trulyNew] : prev;
        });

        syncHistoryThumbnails(newItems);
        refreshStorageData();
        setPage(nextPage);
        setHasMore(Boolean(res.hasMore !== undefined ? res.hasMore : newItems.length >= 16));
      }
    } catch (e) {
      console.error(e);
      setHasMore(false);
    } finally {
      setLoadingMore(false);
    }
  };

  // Auto-load more dramas on scroll (Infinite Scroll)
  useEffect(() => {
    if (currentTab !== 'home' || !hasMore || loadingFeed) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loadingMore && hasMore) {
          handleLoadMoreFeed();
        }
      },
      { rootMargin: '500px 0px' }
    );

    const el = loadMoreTriggerRef.current;
    if (el) observer.observe(el);

    const handleWindowScroll = () => {
      if (loadingMore || !hasMore) return;
      const scrollPos = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 700;
      if (scrollPos >= threshold) {
        handleLoadMoreFeed();
      }
    };

    window.addEventListener('scroll', handleWindowScroll, { passive: true });

    return () => {
      if (el) observer.unobserve(el);
      window.removeEventListener('scroll', handleWindowScroll);
    };
  }, [currentTab, hasMore, loadingMore, page, loadingFeed]);

  const getWatchedEpisodeIndex = (seriesId: string) => {
    const found = history.find((h) => h.seriesId === seriesId);
    return found ? found.lastEpisodeIndex : undefined;
  };

  const featuredDrama = feedItems[0];
  const trendingList = feedItems.slice(1, 7);
  const remainingList = feedItems.slice(7);
  const activeRegionInfo = getRegionInfo(region.country, region.language);

  return (
    <div className="min-h-screen bg-[#f4f6f9] dark:bg-[#0e151d] text-slate-900 dark:text-slate-100 flex flex-col font-sans transition-colors duration-200">
      {/* Navbar with Brutalist 3-Zone Architecture */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'reels') {
            if (featuredDrama) {
              handleOpenReels(featuredDrama, 1);
            }
          } else {
            setCurrentTab(tab);
          }
        }}
        onOpenSearch={() => setShowSearchModal(true)}
        onOpenResolver={() => setShowResolverModal(true)}
        bookmarksCount={bookmarks.length}
        region={region}
        onOpenRegion={() => setShowRegionModal(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      {/* Main Content Areas */}
      <main className="flex-1">
        {currentTab === 'home' && (
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {/* Loading Skeleton */}
            {loadingFeed ? (
              <div className="py-24 flex flex-col items-center justify-center text-slate-500 dark:text-[#8ba2b8]">
                <Loader2 className="w-9 h-9 animate-spin text-blue-600 dark:text-[#38bdf8] mb-3" />
                <p className="text-xs font-mono tracking-wide uppercase">Menghubungkan ke Drama Server...</p>
              </div>
            ) : (
              <>
                {/* Hero Showcase Banner */}
                {feedItems.length > 0 && (
                  <HeroBanner
                    drama={featuredDrama}
                    dramas={feedItems.slice(0, 5)}
                    onPlay={(d) => handlePlayDrama(d, 1)}
                    onOpenReels={(d) => handleOpenReels(d, 1)}
                    onOpenDetail={(d) => setSelectedDrama(d)}
                    isBookmarked={(id) => isBookmarked(id)}
                    onToggleBookmark={handleToggleBookmark}
                  />
                )}

                {/* Recently Watched Row (if history exists) */}
                {history.length > 0 && (
                  <section className="mb-10">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase font-mono">
                          Lanjutkan Menonton
                        </h2>
                      </div>
                      <button
                        onClick={() => setCurrentTab('library')}
                        className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] hover:text-blue-600 dark:hover:text-[#38bdf8] flex items-center gap-1 transition-colors"
                      >
                        <span>Lihat Semua</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
                      {history.slice(0, 6).map((item) => {
                        const isDub = isDubDrama({ title: item.seriesTitle, genre: item.genre });
                        const displayTitle = getFormattedTitle(item.seriesTitle, isDub);
                        const episodeMeta = getFormattedEpisodeMeta(item.genre, [], item.totalEpisodes);

                        return (
                          <div
                            key={item.seriesId}
                            onClick={() => handlePlayHistory(item)}
                            className="group relative flex flex-col bg-white dark:bg-[#16222f] rounded-lg overflow-hidden border border-slate-200 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] transition-all cursor-pointer shadow-xs"
                          >
                            <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-[#0e151d] overflow-hidden">
                              {item.thumbnail ? (
                                <img
                                  src={item.thumbnail}
                                  alt={displayTitle}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-xl">
                                  🎬
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                              <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 dark:bg-[#121c27]/95 border border-slate-700 dark:border-[#26394c] px-2 py-1 text-[11px] text-white flex items-center justify-between font-mono">
                                <span className="font-semibold text-sky-400 dark:text-[#38bdf8]">Lanjut Ep {item.lastEpisodeIndex}</span>
                                <span className="tabular-nums text-slate-300">/ {item.totalEpisodes}</span>
                              </div>
                            </div>
                            <div className="p-2.5">
                              <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-[#38bdf8] transition-colors line-clamp-1" title={displayTitle}>
                                {displayTitle}
                              </h4>
                              <p className="text-[11px] text-slate-500 dark:text-neutral-400 mt-1 truncate">
                                {episodeMeta}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </section>
                )}

                {/* Trending / Populer Section */}
                {trendingList.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-[#26394c]">
                      <div className="flex items-center gap-2">
                        <Flame className="w-4 h-4 text-blue-600 dark:text-[#38bdf8] fill-blue-600 dark:fill-[#38bdf8]" />
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase font-mono">
                          Sedang Populer & Viral
                        </h2>
                      </div>
                      <span className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8]">Paling banyak ditonton</span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5">
                      {trendingList.map((drama) => (
                        <DramaCard
                          key={drama.id}
                          drama={drama}
                          onSelect={(d) => setSelectedDrama(d)}
                          onPlayDirect={(d) => handlePlayDrama(d, 1)}
                          onOpenReels={(d) => handleOpenReels(d, 1)}
                          isBookmarked={isBookmarked(drama.id)}
                          onToggleBookmark={handleToggleBookmark}
                          lastWatchedEp={getWatchedEpisodeIndex(drama.id)}
                        />
                      ))}
                    </div>
                  </section>
                )}

                {/* For You / Feed Section */}
                {remainingList.length > 0 && (
                  <section className="mb-12">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-200 dark:border-[#26394c]">
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                        <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight uppercase font-mono">
                          Rekomendasi Pilihan untuk Anda
                        </h2>
                      </div>
                      <button
                        onClick={() => setCurrentTab('browse')}
                        className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] hover:text-blue-600 dark:hover:text-[#38bdf8] flex items-center gap-1 transition-colors"
                      >
                        <span>Katalog Lengkap</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-5 mb-8">
                      {remainingList.map((drama) => (
                        <DramaCard
                          key={drama.id}
                          drama={drama}
                          onSelect={(d) => setSelectedDrama(d)}
                          onPlayDirect={(d) => handlePlayDrama(d, 1)}
                          onOpenReels={(d) => handleOpenReels(d, 1)}
                          isBookmarked={isBookmarked(drama.id)}
                          onToggleBookmark={handleToggleBookmark}
                          lastWatchedEp={getWatchedEpisodeIndex(drama.id)}
                        />
                      ))}
                    </div>

                    {/* Infinite Scroll & Manual Load More */}
                    <div ref={loadMoreTriggerRef} className="py-6 flex flex-col items-center justify-center gap-4">
                      {hasMore && (
                        <button
                          onClick={handleLoadMoreFeed}
                          disabled={loadingMore}
                          className="flex items-center gap-2.5 px-6 py-2.5 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1e2f41] border border-slate-300 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] text-xs font-mono font-medium text-slate-800 dark:text-slate-200 transition-all shadow-xs disabled:opacity-50"
                        >
                          {loadingMore ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-blue-600 dark:text-[#38bdf8]" />
                              <span>Memuat Drama Tambahan...</span>
                            </>
                          ) : (
                            <>
                              <RefreshCw className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                              <span>Muat Lebih Banyak Drama (Halaman {page + 1})</span>
                            </>
                          )}
                        </button>
                      )}

                      {!hasMore && feedItems.length > 0 && (
                        <p className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] py-3 text-center">
                          Semua rekomendasi drama telah dimuat ({feedItems.length} drama)
                        </p>
                      )}
                    </div>
                  </section>
                )}
              </>
            )}
          </div>
        )}

        {currentTab === 'browse' && (
          <BrowseView
            region={region}
            onOpenRegion={() => setShowRegionModal(true)}
            onSelectDrama={(d) => setSelectedDrama(d)}
            onPlayDirect={(d) => handlePlayDrama(d, 1)}
            onOpenReels={(d) => handleOpenReels(d, 1)}
            isBookmarked={isBookmarked}
            onToggleBookmark={handleToggleBookmark}
            getWatchedEp={getWatchedEpisodeIndex}
          />
        )}

        {currentTab === 'library' && (
          <LibraryView
            history={history}
            bookmarks={bookmarks}
            onPlayHistory={handlePlayHistory}
            onSelectBookmark={async (id) => {
              try {
                const detail = await fetchSeriesDetail(id, region.language, region.country);
                const cover = detail.thumbnail || detail.cover || null;
                if (isMobile) {
                  setActiveReelsSeries({ series: detail, episodeIndex: 1, coverImage: cover });
                } else {
                  setActiveTheaterSeries({ series: detail, episodeIndex: 1, coverImage: cover });
                }
              } catch (e) {
                console.error(e);
              }
            }}
            onRefresh={refreshStorageData}
          />
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white dark:bg-[#121c27] border-t border-slate-200 dark:border-[#26394c] py-8 mt-12 text-slate-500 dark:text-[#8ba2b8] text-xs font-mono">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-900 dark:text-white">HIDRACIN</span>
            <span>/</span>
            <span>Platform Streaming Drama China Pendek & Mini Series</span>
          </div>
          <div className="flex items-center gap-4 text-slate-500 dark:text-[#8ba2b8]">
            <span>AUDIO DUB & MULTI-BAHASA</span>
            <span>·</span>
            <span>HLS HD STREAM</span>
            <span>·</span>
            <span>REELS MODE</span>
          </div>
        </div>
      </footer>

      {/* Modals & Fullscreen Overlays */}
      {selectedDrama && (
        <DramaDetailModal
          drama={selectedDrama}
          onClose={() => setSelectedDrama(null)}
          onPlayEpisode={(series, epIndex) => {
            const cover = selectedDrama.thumbnail || series.thumbnail || series.cover || null;
            if (isMobile) {
              setActiveReelsSeries({
                series,
                episodeIndex: epIndex,
                coverImage: cover,
              });
            } else {
              setActiveTheaterSeries({
                series,
                episodeIndex: epIndex,
                coverImage: cover,
              });
            }
            setSelectedDrama(null);
          }}
          onOpenReels={(series, epIndex) => {
            setActiveReelsSeries({
              series,
              episodeIndex: epIndex,
              coverImage: selectedDrama.thumbnail || series.thumbnail || series.cover || null,
            });
            setSelectedDrama(null);
          }}
          isBookmarked={isBookmarked(selectedDrama.id)}
          onToggleBookmark={handleToggleBookmark}
          region={region}
        />
      )}

      {/* Full Cinema / Theater Video Player */}
      {activeTheaterSeries && (
        <VideoPlayer
          series={activeTheaterSeries.series}
          initialEpisodeIndex={activeTheaterSeries.episodeIndex}
          coverImage={activeTheaterSeries.coverImage || activeTheaterSeries.series.thumbnail || activeTheaterSeries.series.cover}
          onClose={() => {
            setActiveTheaterSeries(null);
            refreshStorageData();
          }}
          onOpenReels={(epIndex) => handleSwitchTheaterToReels(epIndex)}
        />
      )}

      {/* Vertical TikTok/Shorts Reels Mode */}
      {activeReelsSeries && (
        <ReelsModePlayer
          series={activeReelsSeries.series}
          initialEpisodeIndex={activeReelsSeries.episodeIndex}
          coverImage={activeReelsSeries.coverImage || activeReelsSeries.series.thumbnail || activeReelsSeries.series.cover}
          onClose={() => {
            setActiveReelsSeries(null);
            refreshStorageData();
          }}
          onSwitchToTheater={(epIndex) => handleSwitchReelsToTheater(epIndex)}
        />
      )}

      {/* Search Modal */}
      {showSearchModal && (
        <SearchModal
          region={region}
          onClose={() => setShowSearchModal(false)}
          onSelectDrama={(d) => {
            setSelectedDrama(d);
            setShowSearchModal(false);
          }}
        />
      )}

      {/* Direct Link / ID Resolver Modal */}
      {showResolverModal && (
        <DirectResolverModal
          onClose={() => setShowResolverModal(false)}
          onPlayResolved={(series, episodeIndex) => {
            const cover = series.thumbnail || series.cover || null;
            if (isMobile) {
              setActiveReelsSeries({
                series,
                episodeIndex,
                coverImage: cover,
              });
            } else {
              setActiveTheaterSeries({
                series,
                episodeIndex,
                coverImage: cover,
              });
            }
          }}
        />
      )}

      {/* Region & Language Selector Modal with Globe Icon */}
      {showRegionModal && (
        <RegionModal
          currentRegion={region}
          onClose={() => setShowRegionModal(false)}
          onApplyRegion={handleApplyRegion}
        />
      )}
    </div>
  );
}
