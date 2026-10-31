import React, { useEffect, useState } from 'react';
import { Play, Smartphone, Bookmark, BookmarkCheck, X, Share2, Check } from 'lucide-react';
import { MediaItem, SeriesDetail } from '../types.ts';
import { fetchSeriesDetail } from '../lib/api.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';
import { RegionSetting } from '../lib/regionConfig.ts';
import { isDubDrama, getFormattedTitle, getFormattedEpisodeMeta } from '../lib/dramaFormatter.ts';

interface DramaDetailModalProps {
  drama: MediaItem;
  onClose: () => void;
  onPlayEpisode: (series: SeriesDetail, episodeIndex: number) => void;
  onOpenReels: (series: SeriesDetail, episodeIndex: number) => void;
  isBookmarked: boolean;
  onToggleBookmark: (drama: MediaItem) => void;
  region?: RegionSetting;
}

export const DramaDetailModal: React.FC<DramaDetailModalProps> = ({
  drama,
  onClose,
  onPlayEpisode,
  onOpenReels,
  isBookmarked,
  onToggleBookmark,
  region,
}) => {
  const isMobile = useIsMobile();
  const [detail, setDetail] = useState<SeriesDetail | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    let active = true;
    setLoading(true);

    fetchSeriesDetail(drama.id, region?.language, region?.country)
      .then((data) => {
        if (active) {
          setDetail(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        console.error('Error fetching series detail:', err);
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [drama.id]);

  const handleShare = () => {
    navigator.clipboard.writeText(`${window.location.origin}/?id=${drama.id}`).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-white dark:bg-[#16222f] border border-slate-300 dark:border-[#26394c] overflow-hidden shadow-2xl flex flex-col font-sans">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-20 p-2 bg-slate-900/80 hover:bg-slate-950 dark:bg-[#0e151d] dark:hover:bg-black text-white border border-slate-700 dark:border-[#26394c] transition-colors"
          title="Tutup Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Hero Section */}
        <div className="relative p-6 sm:p-8 bg-slate-50 dark:bg-[#121c27] border-b border-slate-200 dark:border-[#26394c]">
          <div className="flex flex-col sm:flex-row gap-6">
            {/* Poster */}
            <div className="w-28 sm:w-36 aspect-[3/4] overflow-hidden bg-slate-200 dark:bg-[#0e151d] shrink-0 border border-slate-300 dark:border-[#26394c] shadow-xs">
              {drama.thumbnail ? (
                <img
                  src={drama.thumbnail}
                  alt={drama.title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-3xl">🎬</div>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col justify-between">
              <div>
                {(() => {
                  const isDub = isDubDrama(drama);
                  const displayTitle = getFormattedTitle(drama.title, isDub);
                  const totalCount = detail ? detail.totalEpisodes : drama.episodeCount;
                  const episodeMeta = getFormattedEpisodeMeta(drama.genre, drama.tags, totalCount);

                  return (
                    <>
                      <div className="flex items-center gap-2 text-xs font-mono font-semibold mb-2">
                        {isDub && (
                          <span className="bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] px-2 py-0.5 text-[11px] font-bold">
                            DUB
                          </span>
                        )}
                        <span className="text-slate-600 dark:text-[#8ba2b8]">
                          {episodeMeta}
                        </span>
                      </div>

                      <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-white mb-2 leading-tight font-mono tracking-tight uppercase">
                        {displayTitle}
                      </h2>
                    </>
                  );
                })()}

                <p className="text-xs sm:text-sm text-slate-600 dark:text-[#8ba2b8] line-clamp-3 leading-relaxed mb-4">
                  {drama.synopsis || (detail && detail.synopsis) || 'Nonton serial drama China pendek terlengkap dengan kualitas HD dan takarir multi-bahasa.'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  onClick={() => detail && onPlayEpisode(detail, 1)}
                  disabled={!detail}
                  className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 dark:bg-[#38bdf8] hover:bg-blue-700 dark:hover:bg-[#60cdff] text-white dark:text-[#0b1320] text-xs font-mono font-bold uppercase tracking-wider transition-all disabled:opacity-50 shadow-xs"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Nonton Ep 1</span>
                </button>

                {!isMobile && (
                  <button
                    onClick={() => detail && onOpenReels(detail, 1)}
                    disabled={!detail}
                    className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1f3042] border border-slate-300 dark:border-[#26394c] text-slate-800 dark:text-slate-200 text-xs font-mono font-semibold uppercase tracking-wider transition-all disabled:opacity-50"
                  >
                    <Smartphone className="w-3.5 h-3.5 text-blue-600 dark:text-[#38bdf8]" />
                    <span>Mode Reels</span>
                  </button>
                )}

                <button
                  onClick={() => onToggleBookmark(drama)}
                  className="p-2.5 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1f3042] border border-slate-300 dark:border-[#26394c] text-slate-700 dark:text-slate-200 transition-all"
                  title={isBookmarked ? 'Hapus dari koleksi' : 'Simpan ke koleksi'}
                >
                  {isBookmarked ? (
                    <BookmarkCheck className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" />
                  ) : (
                    <Bookmark className="w-4 h-4" />
                  )}
                </button>

                <button
                  onClick={handleShare}
                  className="p-2.5 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1f3042] border border-slate-300 dark:border-[#26394c] text-slate-700 dark:text-slate-200 transition-all"
                  title="Salin Link Drama"
                >
                  {copied ? <Check className="w-4 h-4 text-blue-600 dark:text-[#38bdf8]" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Episode Grid Section */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-900 dark:text-white">
              Semua Episode
            </h3>
            <span className="text-xs font-mono text-slate-500 dark:text-[#8ba2b8] tabular-nums">
              {detail ? `${detail.episodes.length} Episode Tersedia` : 'Memuat episode...'}
            </span>
          </div>

          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-[#8ba2b8]">
              <div className="w-8 h-8 border-2 border-blue-600 dark:border-[#38bdf8] border-t-transparent animate-spin mb-2"></div>
              <p className="text-xs font-mono uppercase">Memuat daftar episode...</p>
            </div>
          ) : detail && detail.episodes.length > 0 ? (
            <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
              {detail.episodes.map((ep) => (
                <button
                  key={ep.episodeId}
                  onClick={() => onPlayEpisode(detail, ep.index)}
                  className="h-11 bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] hover:bg-slate-100 dark:hover:bg-[#1b2937] text-slate-800 dark:text-slate-200 text-xs font-mono font-bold flex items-center justify-center transition-all"
                >
                  <span>{ep.index}</span>
                </button>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-500 dark:text-[#8ba2b8] text-xs font-mono">
              Tidak ada episode yang dapat dimuat.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
