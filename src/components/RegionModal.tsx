import React, { useState } from 'react';
import { Globe, X, Check, RotateCcw, Sparkles } from 'lucide-react';
import {
  RegionSetting,
  REGION_PRESETS,
  AVAILABLE_COUNTRIES,
  AVAILABLE_LANGUAGES,
  DEFAULT_REGION,
  getRegionInfo
} from '../lib/regionConfig.ts';

interface RegionModalProps {
  currentRegion: RegionSetting;
  onClose: () => void;
  onApplyRegion: (newRegion: RegionSetting) => void;
}

export const RegionModal: React.FC<RegionModalProps> = ({
  currentRegion,
  onClose,
  onApplyRegion,
}) => {
  const [selectedCountry, setSelectedCountry] = useState<string>(currentRegion.country);
  const [selectedLanguage, setSelectedLanguage] = useState<string>(currentRegion.language);
  const [mode, setMode] = useState<'presets' | 'custom'>('presets');

  const handleSelectPreset = (country: string, language: string) => {
    setSelectedCountry(country);
    setSelectedLanguage(language);
  };

  const handleResetDefault = () => {
    setSelectedCountry(DEFAULT_REGION.country);
    setSelectedLanguage(DEFAULT_REGION.language);
  };

  const handleApply = () => {
    onApplyRegion({
      country: selectedCountry,
      language: selectedLanguage,
    });
    onClose();
  };

  const activeInfo = getRegionInfo(selectedCountry, selectedLanguage);
  const isDefaultSelected =
    selectedCountry.toUpperCase() === DEFAULT_REGION.country &&
    selectedLanguage.toLowerCase() === DEFAULT_REGION.language;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-xl bg-white dark:bg-[#16222f] border border-slate-300 dark:border-[#26394c] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-[#26394c] flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-50 dark:bg-[#0e151d] border border-blue-200 dark:border-[#26394c] flex items-center justify-center text-blue-600 dark:text-[#38bdf8] shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2 font-mono uppercase tracking-tight">
                Pilih Negara & Bahasa
              </h2>
              <p className="text-xs text-slate-500 dark:text-[#8ba2b8] font-mono">
                Sesuaikan region katalog, takarir (subtitle), dan audio drama
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:text-[#8ba2b8] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-[#1f3042] transition-colors"
            aria-label="Tutup"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Current Active Preview Banner */}
        <div className="px-5 py-3 bg-slate-50 dark:bg-[#121c27] border-b border-slate-200 dark:border-[#26394c] flex items-center justify-between gap-3 text-xs font-mono">
          <div className="flex items-center gap-2.5">
            <span className="text-lg leading-none">{activeInfo.country.flag}</span>
            <div>
              <span className="font-bold text-slate-900 dark:text-white">{activeInfo.country.name} ({activeInfo.country.code})</span>
              <span className="text-slate-400 dark:text-[#385068] mx-1.5">/</span>
              <span className="text-slate-600 dark:text-[#8ba2b8]">{activeInfo.language.name} ({activeInfo.language.code})</span>
            </div>
            {isDefaultSelected && (
              <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-[#0e151d] text-blue-700 dark:text-[#38bdf8] border border-blue-300 dark:border-[#26394c]">
                DEFAULT
              </span>
            )}
          </div>
          {!isDefaultSelected && (
            <button
              onClick={handleResetDefault}
              className="text-xs text-blue-600 dark:text-[#38bdf8] hover:underline flex items-center gap-1 font-bold transition-colors uppercase"
            >
              <RotateCcw className="w-3 h-3" />
              Reset ke Indonesia
            </button>
          )}
        </div>

        {/* Tab Switcher: Pilihan Populer vs Kustom */}
        <div className="p-3 border-b border-slate-200 dark:border-[#26394c] flex gap-2 font-mono text-xs">
          <button
            onClick={() => setMode('presets')}
            className={`flex-1 py-1.5 px-3 uppercase tracking-wider transition-colors border ${
              mode === 'presets'
                ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] border-blue-600 dark:border-[#38bdf8] font-bold'
                : 'bg-white dark:bg-[#16222f] text-slate-600 dark:text-[#8ba2b8] border-slate-200 dark:border-[#26394c] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Pilihan Populer / Cepat
          </button>
          <button
            onClick={() => setMode('custom')}
            className={`flex-1 py-1.5 px-3 uppercase tracking-wider transition-colors border ${
              mode === 'custom'
                ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] border-blue-600 dark:border-[#38bdf8] font-bold'
                : 'bg-white dark:bg-[#16222f] text-slate-600 dark:text-[#8ba2b8] border-slate-200 dark:border-[#26394c] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Kustom (Pilih Terpisah)
          </button>
        </div>

        {/* Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {mode === 'presets' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {REGION_PRESETS.map((preset) => {
                const isSelected =
                  selectedCountry.toUpperCase() === preset.country.toUpperCase() &&
                  selectedLanguage.toLowerCase() === preset.language.toLowerCase();

                return (
                  <button
                    key={preset.id}
                    onClick={() => handleSelectPreset(preset.country, preset.language)}
                    className={`p-3 border text-left transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-[#0e151d] border-blue-500 dark:border-[#38bdf8] text-slate-900 dark:text-white ring-1 ring-blue-500 dark:ring-[#38bdf8]'
                        : 'bg-white dark:bg-[#121c27] border-slate-200 dark:border-[#26394c] hover:border-slate-400 dark:hover:border-[#385068] text-slate-700 dark:text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl leading-none shrink-0">{preset.flag}</span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm truncate font-mono">{preset.name}</span>
                          {preset.isDefault && (
                            <span className="px-1.5 py-0.2 text-[9px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-700 font-mono shrink-0">
                              Utama
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-[#8ba2b8] truncate font-mono">
                          {preset.nativeLang} · <span>{preset.country}-{preset.language}</span>
                        </div>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="w-5 h-5 bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] flex items-center justify-center shrink-0">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4 font-mono">
              {/* Country Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase">
                  Pilih Negara (Country Code)
                </label>
                <select
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 dark:focus:border-[#38bdf8] transition-colors"
                >
                  {AVAILABLE_COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-[#8ba2b8] mt-1">
                  Menentukan server feed katalog dan lisensi tayang Free-Reels.
                </p>
              </div>

              {/* Language Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5 uppercase">
                  Pilih Bahasa (Language / Subtitle & Audio)
                </label>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] text-sm text-slate-900 dark:text-white focus:outline-hidden focus:border-blue-500 dark:focus:border-[#38bdf8] transition-colors"
                >
                  {AVAILABLE_LANGUAGES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name} — {l.nativeName} ({l.code})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500 dark:text-[#8ba2b8] mt-1">
                  Memprioritaskan bahasa takarir dan teks sinopsis drama.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-200 dark:border-[#26394c] bg-slate-50 dark:bg-[#121c27] flex items-center justify-between gap-3 font-mono">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white transition-colors uppercase"
          >
            Batal
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-5 py-2 text-xs font-bold bg-blue-600 dark:bg-[#38bdf8] hover:bg-blue-700 dark:hover:bg-[#60cdff] text-white dark:text-[#0b1320] uppercase tracking-wider transition-colors shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Terapkan ({selectedCountry} / {selectedLanguage})
          </button>
        </div>
      </div>
    </div>
  );
};
