import React, { useState, useEffect, useRef } from 'react';
import { Search, X, Loader2, Play } from 'lucide-react';
import { MediaItem } from '../types.ts';
import { searchDramas, fetchHotWords } from '../lib/api.ts';
import { isDubDrama, getFormattedTitle, getFormattedEpisodeMeta } from '../lib/dramaFormatter.ts';

import { RegionSetting } from '../lib/regionConfig.ts';

interface SearchModalProps {
  onClose: () => void;
  onSelectDrama: (drama: MediaItem) => void;
  region?: RegionSetting;
}

const DEFAULT_POPULAR_TAGS = [
  'Miliarder',
  'Balas Dendam',
  'Pernikahan Kontrak',
  'CEO',
  'Terlahir Kembali',
  'Dewa Naga',
  'Dokter Sakti',
  'Istri Kecil'
];

export const SearchModal: React.FC<SearchModalProps> = ({ onClose, onSelectDrama, region }) => {
  const [query, setQuery] = useState('');
  const [hotTags, setHotTags] = useState<string[]>(DEFAULT_POPULAR_TAGS);
  const [results, setResults] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    fetchHotWords(region?.language, region?.country)
      .then((words) => {
        if (words.length > 0) {
          setHotTags(words.slice(0, 10));
        }
      })
      .catch(() => {});
  }, [region?.language, region?.country]);

  const handleSearch = async (searchTerm: string) => {
    if (!searchTerm.trim()) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await searchDramas(searchTerm.trim(), 1, 24, region?.language, region?.country);
      setResults(res.items || []);
    } catch (e) {
      console.error(e);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch(query);
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-16 sm:pt-24 p-4 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#16222f] border border-slate-300 dark:border-[#26394c] shadow-2xl flex flex-col max-h-[80vh] font-sans">
        {/* Search Input Bar */}
        <div className="p-4 border-b border-slate-200 dark:border-[#26394c] flex items-center gap-3">
          <Search className="w-5 h-5 text-slate-400 dark:text-[#8ba2b8] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Cari judul drama, aktor, atau tema (contoh: CEO, Balas Dendam)..."
            className="w-full bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-[#647c94] text-sm focus:outline-hidden font-sans"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setHasSearched(false);
              }}
              className="p-1 text-slate-400 hover:text-slate-700 dark:text-[#8ba2b8] dark:hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={() => handleSearch(query)}
            disabled={!query.trim() || loading}
            className="px-4 py-2 bg-blue-600 dark:bg-[#38bdf8] hover:bg-blue-700 dark:hover:bg-[#60cdff] disabled:opacity-40 text-white dark:text-[#0b1320] text-xs font-mono font-bold uppercase transition-colors"
          >
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Cari'}
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-[#8ba2b8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f3042]"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Real-time Trending Hot Tags */}
        <div className="px-4 py-2.5 bg-slate-50 dark:bg-[#121c27] border-b border-slate-200 dark:border-[#26394c] flex items-center gap-2 overflow-x-auto text-xs scrollbar-none font-mono">
          <span className="text-blue-600 dark:text-[#38bdf8] font-bold text-[11px] whitespace-nowrap">TREN:</span>
          {hotTags.map((tag) => (
            <button
              key={tag}
              onClick={() => {
                setQuery(tag);
                handleSearch(tag);
              }}
              className="px-2.5 py-1 bg-white dark:bg-[#16222f] hover:bg-slate-100 dark:hover:bg-[#1e2f41] text-slate-700 dark:text-[#c4d5e5] hover:text-slate-900 dark:hover:text-white text-[11px] whitespace-nowrap border border-slate-200 dark:border-[#26394c] transition-colors"
            >
              {tag}
            </button>
          ))}
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center text-slate-500 dark:text-[#8ba2b8]">
              <Loader2 className="w-6 h-6 animate-spin text-blue-600 dark:text-[#38bdf8] mb-2" />
              <p className="text-xs font-mono uppercase">Mencari drama...</p>
            </div>
          ) : results.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {results.map((item) => {
                const isDub = isDubDrama(item);
                const displayTitle = getFormattedTitle(item.title, isDub);
                const episodeMeta = getFormattedEpisodeMeta(item.genre, item.tags, item.episodeCount);

                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      onSelectDrama(item);
                      onClose();
                    }}
                    className="flex items-center gap-3 p-2.5 bg-slate-50 dark:bg-[#0e151d] border border-slate-200 dark:border-[#26394c] hover:border-blue-500 dark:hover:border-[#38bdf8] hover:bg-white dark:hover:bg-[#16222f] cursor-pointer transition-all group rounded-lg"
                  >
                    <div className="w-14 aspect-[3/4] bg-slate-200 dark:bg-[#121c27] overflow-hidden shrink-0 relative border border-slate-300 dark:border-[#26394c] rounded-md">
                      {item.thumbnail ? (
                        <img
                          src={item.thumbnail}
                          alt={displayTitle}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-xs">
                          🎬
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="w-4 h-4 fill-white text-white" />
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <h4 className="text-xs font-semibold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-[#38bdf8] transition-colors truncate" title={displayTitle}>
                        {displayTitle}
                      </h4>
                      <div className="text-[11px] font-mono text-slate-500 dark:text-[#8ba2b8] mt-1 truncate">
                        {episodeMeta}
                      </div>
                      {item.synopsis && (
                        <p className="text-[11px] text-slate-400 dark:text-[#647c94] truncate mt-1">
                          {item.synopsis}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : hasSearched ? (
            <div className="py-12 text-center text-slate-500 dark:text-[#8ba2b8]">
              <p className="text-sm font-semibold mb-1 text-slate-800 dark:text-slate-200 font-mono">Tidak ada hasil untuk "{query}"</p>
              <p className="text-xs text-slate-500 dark:text-[#8ba2b8]">
                Coba gunakan kata kunci lain seperti CEO, Reinkarnasi, atau judul bahasa Inggris.
              </p>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-500 dark:text-[#8ba2b8] text-xs font-mono">
              Ketik judul atau pilih salah satu kata kunci populer di atas untuk mulai mencari.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
