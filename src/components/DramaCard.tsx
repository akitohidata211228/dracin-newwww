import React from 'react';
import { Play, Smartphone, Bookmark, BookmarkCheck, Flame } from 'lucide-react';
import { MediaItem } from '../types.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';
import {
  isDubDrama,
  getFormattedTitle,
  getFormattedEpisodeMeta,
  getFormattedViews,
} from '../lib/dramaFormatter.ts';

interface DramaCardProps {
  drama: MediaItem;
  onSelect: (drama: MediaItem) => void;
  onPlayDirect: (drama: MediaItem) => void;
  onOpenReels: (drama: MediaItem) => void;
  isBookmarked: boolean;
  onToggleBookmark: (drama: MediaItem) => void;
  lastWatchedEp?: number;
}

export const DramaCard: React.FC<DramaCardProps> = ({
  drama,
  onSelect,
  onPlayDirect,
  onOpenReels,
  isBookmarked,
  onToggleBookmark,
  lastWatchedEp,
}) => {
  const isMobile = useIsMobile();
  const [imageError, setImageError] = React.useState(false);

  const isDub = isDubDrama(drama);
  const displayTitle = getFormattedTitle(drama.title, isDub);
  const episodeMeta = getFormattedEpisodeMeta(drama.genre, drama.tags, drama.episodeCount);
  const viewsText = getFormattedViews(drama.followers, drama.id);

  return (
    <div className="group relative flex flex-col bg-transparent rounded-lg overflow-hidden transition-all duration-200">
      {/* Poster Image Container */}
      <div
        onClick={() => onSelect(drama)}
        className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-slate-900 border border-slate-200/80 dark:border-[#26394c]/80 hover:border-blue-500 dark:hover:border-[#38bdf8] transition-all cursor-pointer shadow-xs"
      >
        {!imageError && drama.thumbnail ? (
          <img
            src={drama.thumbnail}
            alt={displayTitle}
            referrerPolicy="no-referrer"
            onError={() => setImageError(true)}
            className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center p-4 bg-slate-800 text-center">
            <span className="text-3xl mb-2">🎬</span>
            <span className="text-xs text-slate-300 font-medium line-clamp-2">
              {displayTitle}
            </span>
          </div>
        )}

        {/* Gradient Scrim for readable bottom text */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/10 opacity-70 group-hover:opacity-85 transition-opacity" />

        {/* Top-Right: Bookmark Icon / Optional "Baru" Indicator */}
        <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleBookmark(drama);
            }}
            className="p-1.5 rounded-full bg-black/50 text-white hover:text-[#38bdf8] hover:bg-black/80 transition-colors backdrop-blur-xs"
            title={isBookmarked ? 'Hapus favorit' : 'Simpan favorit'}
          >
            {isBookmarked ? (
              <BookmarkCheck className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
            ) : (
              <Bookmark className="w-3.5 h-3.5" />
            )}
          </button>
        </div>

        {/* Bottom-Left View Count */}
        <div className="absolute bottom-2 left-2 flex items-center gap-1 text-[11px] font-bold text-white drop-shadow-md z-10 pointer-events-none select-none">
          <Flame className="w-3.5 h-3.5 fill-red-500 text-red-500 shrink-0" />
          <span>{viewsText}</span>
        </div>

        {/* Last Watched Progress Banner if present */}
        {lastWatchedEp !== undefined && (
          <div className="absolute bottom-0 left-0 right-0 bg-slate-900/95 dark:bg-[#0e151d]/95 border-t border-slate-700 dark:border-[#26394c] px-2 py-0.5 text-[10px] font-mono text-sky-400 flex items-center justify-between z-20">
            <span>Ep {lastWatchedEp}</span>
            <span className="text-[9px] text-slate-400">Tersimpan</span>
          </div>
        )}

        {/* Quick Hover Overlay Actions */}
        <div className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 backdrop-blur-[1px] z-20">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPlayDirect(drama);
            }}
            className="p-2.5 bg-blue-600 hover:bg-blue-500 text-white dark:bg-[#38bdf8] dark:hover:bg-[#60cdff] dark:text-[#0b1320] rounded-full shadow-lg transform transition hover:scale-110 active:scale-95"
            title="Putar Sekarang"
          >
            <Play className="w-4 h-4 fill-current ml-0.5" />
          </button>
          {!isMobile && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onOpenReels(drama);
              }}
              className="p-2.5 bg-white hover:bg-slate-100 dark:bg-[#16222f] dark:hover:bg-[#1e2e3f] border border-slate-300 dark:border-[#26394c] text-blue-600 dark:text-[#38bdf8] rounded-full shadow-lg transform transition hover:scale-110 active:scale-95"
              title="Buka Mode Reels (Vertikal)"
            >
              <Smartphone className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Card Info: Title + (Genre | Episode) */}
      <div className="pt-2 px-1 flex flex-col">
        <h3
          onClick={() => onSelect(drama)}
          className="font-medium text-[13px] sm:text-sm text-slate-900 dark:text-white hover:text-blue-600 dark:hover:text-[#38bdf8] transition-colors line-clamp-2 leading-tight cursor-pointer"
          title={displayTitle}
        >
          {displayTitle}
        </h3>

        {/* Line below title: e.g. "Sultan | 80 episode" */}
        <p className="text-xs text-slate-500 dark:text-neutral-400 mt-1 truncate">
          {episodeMeta}
        </p>
      </div>
    </div>
  );
};
