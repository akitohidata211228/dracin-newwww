import React, { useState } from 'react';
import { Link2, Play, X, Loader2, AlertCircle } from 'lucide-react';
import { resolveDramaLink, fetchSeriesDetail } from '../lib/api.ts';
import { SeriesDetail } from '../types.ts';

interface DirectResolverModalProps {
  onClose: () => void;
  onPlayResolved: (series: SeriesDetail, episodeIndex: number) => void;
}

export const DirectResolverModal: React.FC<DirectResolverModalProps> = ({
  onClose,
  onPlayResolved,
}) => {
  const [inputVal, setInputVal] = useState('');
  const [episodeNum, setEpisodeNum] = useState<number>(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleResolve = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputVal.trim()) return;

    setLoading(true);
    setErrorMsg(null);

    try {
      const resolved = await resolveDramaLink(inputVal.trim(), episodeNum);
      if (!resolved || !resolved.seriesId) {
        throw new Error('Tidak dapat menemukan data drama dari input yang diberikan.');
      }

      // Fetch the full series so the user has the entire playlist
      const fullSeries = await fetchSeriesDetail(resolved.seriesId);
      onPlayResolved(fullSeries, resolved.episode || 1);
      onClose();
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Gagal mengurai link drama.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-white dark:bg-[#16222f] border border-slate-300 dark:border-[#26394c] shadow-2xl p-6 font-sans">
        <div className="flex items-center justify-between mb-4 pb-3 border-slate-200 dark:border-[#26394c]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-50 dark:bg-[#0e151d] border border-blue-200 dark:border-[#26394c] text-blue-600 dark:text-[#38bdf8]">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-mono uppercase tracking-tight">Buka ID / Link Drama</h3>
              <p className="text-xs text-slate-500 dark:text-[#8ba2b8] font-mono">
                Putar langsung drama dari URL atau Series ID
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-[#8ba2b8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f3042] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 uppercase mb-1.5">
              URL Drama / Series ID
            </label>
            <input
              type="text"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              placeholder="Contoh: 1YziNliD46 atau link https://..."
              className="w-full px-3.5 py-2.5 bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#647c94] focus:outline-hidden focus:border-blue-500 dark:focus:border-[#38bdf8] transition-colors font-mono"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-mono font-semibold text-slate-700 dark:text-slate-200 uppercase mb-1.5">
              Mulai dari Episode (Opsional)
            </label>
            <input
              type="number"
              min="1"
              value={episodeNum}
              onChange={(e) => setEpisodeNum(Math.max(1, parseInt(e.target.value) || 1))}
              className="w-28 px-3.5 py-2 bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 dark:focus:border-[#38bdf8] transition-colors font-mono"
            />
          </div>

          {errorMsg && (
            <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-start gap-2.5 text-xs text-red-600 dark:text-red-300 font-mono">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-mono font-medium text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white transition-colors uppercase"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading || !inputVal.trim()}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 dark:bg-[#38bdf8] hover:bg-blue-700 dark:hover:bg-[#60cdff] disabled:opacity-40 text-white dark:text-[#0b1320] text-xs font-mono font-bold uppercase tracking-wider transition-all shadow-xs"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengurai...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Putar Video</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
