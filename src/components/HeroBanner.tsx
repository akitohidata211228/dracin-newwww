import React, { useState, useEffect, useRef } from 'react';
import { Play, Smartphone, Bookmark, BookmarkCheck, Info, ChevronLeft, ChevronRight, Flame } from 'lucide-react';
import { MediaItem } from '../types.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';
import {
  isDubDrama,
  getFormattedTitle,
  getFormattedEpisodeMeta,
  getFormattedViews,
} from '../lib/dramaFormatter.ts';

interface HeroBannerProps {
  drama?: MediaItem;
  dramas?: MediaItem[];
  onPlay: (drama: MediaItem) => void;
  onOpenReels: (drama: MediaItem) => void;
  onOpenDetail: (drama: MediaItem) => void;
  isBookmarked: (id: string) => boolean;
  onToggleBookmark: (drama: MediaItem) => void;
}

export const HeroBanner: React.FC<HeroBannerProps> = ({
  drama,
  dramas = [],
  onPlay,
  onOpenReels,
  onOpenDetail,
  isBookmarked,
  onToggleBookmark,
}) => {
  const isMobile = useIsMobile();
  const items = dramas.length > 0 ? dramas : drama ? [drama] : [];
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [imgLoaded, setImgLoaded] = useState<boolean>(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const activeDrama = items[currentIndex] || drama;

  useEffect(() => {
    if (items.length <= 1 || isPaused) return;

    timerRef.current = setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
      setImgLoaded(false);
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, items.length, isPaused]);

  if (!activeDrama) return null;

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
    setImgLoaded(false);
  };

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentIndex((prev) => (prev + 1) % items.length);
    setImgLoaded(false);
  };

  const hasMultiple = items.length > 1;
  const bookmarked = isBookmarked(activeDrama.id);
  const isDub = isDubDrama(activeDrama);
  const displayTitle = getFormattedTitle(activeDrama.title, isDub);
  const episodeMeta = getFormattedEpisodeMeta(activeDrama.genre, activeDrama.tags, activeDrama.episodeCount);
  const viewsText = getFormattedViews(activeDrama.followers, activeDrama.id);

  return (
    <div
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className="relative w-full rounded-xl overflow-hidden bg-white dark:bg-[#16222f] border border-slate-200 dark:border-[#26394c] shadow-lg mb-10 transition-colors group"
    >
      {/* Background ambient lighting */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none opacity-20 dark:opacity-25">
        {activeDrama.thumbnail && (
          <img
            src={activeDrama.thumbnail}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover filter blur-3xl scale-125"
          />
        )}
      </div>

      {/* Main Grid: Left Details + Right Sharp Poster Showcase */}
      <div className="relative z-10 p-6 sm:p-8 lg:p-10 flex flex-col-reverse md:flex-row items-center gap-6 lg:gap-10">
        {/* Left Column: Editorial Information */}
        <div className="flex-1 min-w-0 flex flex-col justify-center">
          {/* Brutalist Label Kicker */}
          <div className="flex items-center gap-2 mb-3">
            <span className="flex items-center gap-1.5 text-xs font-mono font-bold text-blue-600 dark:text-[#38bdf8] uppercase tracking-wider">
              <Flame className="w-3.5 h-3.5 fill-blue-600 dark:fill-[#38bdf8]" />
              <span>Drama Pilihan #{currentIndex + 1}</span>
            </span>
            {/* Format tag removed on Android / mobile as requested */}
            {!isMobile && (
              <>
                <span aria-hidden="true" className="text-slate-300 dark:text-[#32495f] hidden sm:inline">·</span>
                <span className="text-xs font-mono font-semibold text-blue-600 dark:text-[#38bdf8] hidden sm:inline">
                  {isDub ? '(Dub) Audio' : 'HD 1080p'}
                </span>
              </>
            )}
          </div>

          {/* Title */}
          <h1
            onClick={() => onOpenDetail(activeDrama)}
            className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white font-display tracking-tight leading-snug line-clamp-2 cursor-pointer hover:text-blue-600 dark:hover:text-[#38bdf8] transition-colors mb-2"
            title={displayTitle}
          >
            {displayTitle}
          </h1>

          {/* Clean Unboxed Metadata: Genre | Count episode */}
          <div className="flex items-center gap-2 text-xs font-mono text-slate-500 dark:text-neutral-400 mb-4 font-medium">
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {episodeMeta}
            </span>
            <span aria-hidden="true" className="text-slate-300 dark:text-[#32495f]">·</span>
            <span className="text-blue-600 dark:text-[#38bdf8] font-semibold">Gratis Tonton</span>
          </div>

          {/* Synopsis */}
          <p className="text-sm text-slate-600 dark:text-[#9bb3c7] line-clamp-2 sm:line-clamp-3 leading-relaxed mb-6 max-w-2xl">
            {activeDrama.synopsis ||
              'Nonton mini series dan drama China pendek terpopuler dengan alur cerita cepat, romansa mendalam, dan resolusi cerita yang memuaskan.'}
          </p>

          {/* Brutalist Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onPlay(activeDrama)}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white dark:bg-[#38bdf8] dark:hover:bg-[#60cdff] dark:text-[#0b1320] font-bold text-sm rounded-md transition-all shadow-md active:translate-y-0.5"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Nonton Sekarang</span>
            </button>

            {!isMobile && (
              <button
                onClick={() => onOpenReels(activeDrama)}
                className="flex items-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e2e3f] dark:hover:bg-[#25394d] border border-slate-300 dark:border-[#26394c] text-slate-800 dark:text-[#c4d5e5] text-sm font-semibold rounded-md transition-all"
                title="Buka dalam mode Reels vertikal penuh"
              >
                <Smartphone className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                <span>Mode Reels</span>
              </button>
            )}

            <button
              onClick={() => onOpenDetail(activeDrama)}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-[#1e2e3f] dark:hover:bg-[#25394d] border border-slate-300 dark:border-[#26394c] text-slate-700 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white text-sm font-semibold rounded-md transition-all"
              title="Lihat daftar episode dan ringkasan lengkap"
            >
              <Info className="w-4 h-4" />
              <span className="hidden sm:inline">Episode</span>
            </button>

            <button
              onClick={() => onToggleBookmark(activeDrama)}
              className={`p-2.5 rounded-md border transition-all ${
                bookmarked
                  ? 'bg-amber-50 border-amber-300 text-amber-600 dark:bg-amber-950/40 dark:border-amber-600/50 dark:text-amber-400'
                  : 'bg-slate-100 dark:bg-[#1e2e3f] border-slate-300 dark:border-[#26394c] text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
              }`}
              title={bookmarked ? 'Hapus dari koleksi tersimpan' : 'Simpan ke koleksi drama saya'}
            >
              {bookmarked ? (
                <BookmarkCheck className="w-4 h-4 text-amber-500" />
              ) : (
                <Bookmark className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>

        {/* Right Column: Sharp Authentic Poster Card Showcase */}
        <div
          onClick={() => onPlay(activeDrama)}
          className="relative w-36 sm:w-44 md:w-52 lg:w-60 aspect-[3/4] shrink-0 rounded-lg overflow-hidden bg-slate-950 border border-slate-300 dark:border-[#26394c] shadow-xl cursor-pointer group/poster transition-all duration-300 hover:border-blue-500 dark:hover:border-[#38bdf8]"
        >
          {activeDrama.thumbnail ? (
            <img
              src={activeDrama.thumbnail}
              alt={activeDrama.title}
              referrerPolicy="no-referrer"
              onLoad={() => setImgLoaded(true)}
              className="w-full h-full object-cover group-hover/poster:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-900 text-center">
              <span className="text-3xl mb-2">🎬</span>
              <span className="text-xs text-slate-300 font-semibold line-clamp-2">
                {activeDrama.title}
              </span>
            </div>
          )}

          {/* Bottom-Left View Count matching photo */}
          <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 text-xs font-bold text-white drop-shadow-md z-10 pointer-events-none select-none">
            <Flame className="w-4 h-4 fill-red-500 text-red-500 shrink-0" />
            <span>{viewsText}</span>
          </div>

          {/* Quick Play Hover Scrim */}
          <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-[2px] opacity-0 group-hover/poster:opacity-100 transition-opacity flex items-center justify-center">
            <div className="p-3 bg-blue-600 text-white dark:bg-[#38bdf8] dark:text-[#0b1320] rounded-full shadow-lg">
              <Play className="w-5 h-5 fill-current ml-0.5" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Carousel Controls (Brutalist style) */}
      {hasMultiple && (
        <div className="px-6 sm:px-8 py-3 bg-slate-50 dark:bg-[#121c27] border-t border-slate-200 dark:border-[#26394c] flex items-center justify-between">
          {/* Dots Indicator */}
          <div className="flex items-center gap-1.5">
            {items.map((it, idx) => (
              <button
                key={it.id || idx}
                onClick={() => {
                  setCurrentIndex(idx);
                  setImgLoaded(false);
                }}
                className={`h-1.5 transition-all rounded-full ${
                  idx === currentIndex
                    ? 'w-6 bg-blue-600 dark:bg-[#38bdf8]'
                    : 'w-1.5 bg-slate-300 dark:bg-[#2b4054] hover:bg-slate-400 dark:hover:bg-[#3d5a75]'
                }`}
                title={`Pindah ke drama #${idx + 1}`}
              />
            ))}
          </div>

          {/* Navigation Prev/Next */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrev}
              className="p-1 rounded-md text-slate-600 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1e2e3f] transition-colors"
              title="Sebelumnya"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-[11px] font-mono text-slate-500 dark:text-[#8ba2b8]">
              {currentIndex + 1} / {items.length}
            </span>
            <button
              onClick={handleNext}
              className="p-1 rounded-md text-slate-600 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-[#1e2e3f] transition-colors"
              title="Berikutnya"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
