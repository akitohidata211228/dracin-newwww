import React from 'react';
import { Play, Trash2, Clock, Bookmark, BookmarkCheck } from 'lucide-react';
import { WatchHistoryItem, BookmarkItem, MediaItem } from '../types.ts';
import { removeWatchHistory, clearAllWatchHistory } from '../lib/storage.ts';
import { isDubDrama, getFormattedTitle, getFormattedEpisodeMeta } from '../lib/dramaFormatter.ts';

interface LibraryViewProps {
  history: WatchHistoryItem[];
  bookmarks: BookmarkItem[];
  onPlayHistory: (item: WatchHistoryItem) => void;
  onSelectBookmark: (seriesId: string) => void;
  onRefresh: () => void;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  history,
  bookmarks,
  onPlayHistory,
  onSelectBookmark,
  onRefresh,
}) => {
  const [activeTab, setActiveTab] = React.useState<'history' | 'bookmarks'>('history');

  const handleRemoveHistory = (seriesId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    removeWatchHistory(seriesId);
    onRefresh();
  };

  const handleClearHistory = () => {
    if (confirm('Bersihkan semua riwayat tontonan?')) {
      clearAllWatchHistory();
      onRefresh();
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 pb-4 border-b border-slate-200 dark:border-[#26394c]">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white font-mono uppercase tracking-tight">
            Koleksi Saya
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-[#8ba2b8] mt-1 font-mono">
            Riwayat tontonan dan daftar drama yang Anda simpan
          </p>
        </div>

        {/* Segmented Tab Filter */}
        <div className="flex items-center gap-1 p-1 bg-white dark:bg-[#121c27] border border-slate-300 dark:border-[#26394c]">
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'history'
                ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-bold shadow-xs'
                : 'text-slate-600 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Riwayat ({history.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('bookmarks')}
            className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-mono uppercase tracking-wider transition-all ${
              activeTab === 'bookmarks'
                ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-bold shadow-xs'
                : 'text-slate-600 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Disimpan ({bookmarks.length})</span>
          </button>
        </div>
      </div>

      {activeTab === 'history' ? (
        <div>
          {history.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                onClick={handleClearHistory}
                className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] hover:text-red-500 dark:hover:text-red-400 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Bersihkan Riwayat</span>
              </button>
            </div>
          )}

          {history.length === 0 ? (
            <div className="py-20 text-center text-slate-500 dark:text-[#8ba2b8]">
              <Clock className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 font-mono">
                Belum ada riwayat tontonan
              </p>
              <p className="text-xs text-slate-500 dark:text-[#8ba2b8]">
                Drama yang Anda tonton akan otomatis tersimpan di sini agar mudah dilanjutkan.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {history.map((item) => {
                const isDub = isDubDrama({ title: item.seriesTitle, genre: item.genre });
                const displayTitle = getFormattedTitle(item.seriesTitle, isDub);
                const episodeMeta = getFormattedEpisodeMeta(item.genre, [], item.totalEpisodes);

                return (
                  <div
                    key={item.seriesId}
                    onClick={() => onPlayHistory(item)}
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
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      <div className="absolute bottom-2 left-2 right-2 bg-slate-900/95 dark:bg-[#121c27]/95 border border-slate-700 dark:border-[#26394c] px-2 py-1 text-[11px] text-white flex items-center justify-between font-mono">
                        <span className="font-semibold text-sky-400 dark:text-[#38bdf8]">Lanjut Ep {item.lastEpisodeIndex}</span>
                        <span className="tabular-nums text-slate-300">/ {item.totalEpisodes}</span>
                      </div>

                      <button
                        onClick={(e) => handleRemoveHistory(item.seriesId, e)}
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-950/80 text-slate-300 hover:text-white transition-colors rounded-full"
                        title="Hapus dari riwayat"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2" title={displayTitle}>
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
          )}
        </div>
      ) : (
        <div>
          {bookmarks.length === 0 ? (
            <div className="py-20 text-center text-slate-500 dark:text-[#8ba2b8]">
              <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30 text-slate-400" />
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1 font-mono">
                Belum ada drama yang disimpan
              </p>
              <p className="text-xs text-slate-500 dark:text-[#8ba2b8]">
                Klik ikon bookmark pada drama favorit Anda untuk menyimpannya di sini.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
              {bookmarks.map((item) => {
                const isDub = isDubDrama({ title: item.seriesTitle, genre: item.genre });
                const displayTitle = getFormattedTitle(item.seriesTitle, isDub);
                const episodeMeta = getFormattedEpisodeMeta(item.genre, [], item.totalEpisodes);

                return (
                  <div
                    key={item.seriesId}
                    onClick={() => onSelectBookmark(item.seriesId)}
                    className="group relative flex flex-col bg-white dark:bg-[#16222f] rounded-lg overflow-hidden border border-slate-200 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] transition-all cursor-pointer shadow-xs"
                  >
                    <div className="relative aspect-[3/4] w-full bg-slate-100 dark:bg-[#0e151d] overflow-hidden">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={displayTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                      <div className="absolute top-2 right-2 p-1.5 bg-black/60 text-sky-400 dark:text-[#38bdf8] rounded-full">
                        <BookmarkCheck className="w-3.5 h-3.5" />
                      </div>

                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                        <div className="p-3 bg-blue-600 dark:bg-[#38bdf8] shadow-lg rounded-full">
                          <Play className="w-4 h-4 fill-white dark:fill-[#0b1320] text-white dark:text-[#0b1320] ml-0.5" />
                        </div>
                      </div>
                    </div>

                    <div className="p-2.5">
                      <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-[#38bdf8] transition-colors line-clamp-2" title={displayTitle}>
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
          )}
        </div>
      )}
    </div>
  );
};
