import React from 'react';
import { Search, Globe, Sun, Moon } from 'lucide-react';
import { RegionSetting, getRegionInfo } from '../lib/regionConfig.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';

interface NavbarProps {
  currentTab: 'home' | 'browse' | 'reels' | 'library';
  onSelectTab: (tab: 'home' | 'browse' | 'reels' | 'library') => void;
  onOpenSearch: () => void;
  onOpenResolver: () => void;
  bookmarksCount: number;
  region: RegionSetting;
  onOpenRegion: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenSearch,
  onOpenResolver,
  bookmarksCount,
  region,
  onOpenRegion,
  theme,
  onToggleTheme,
}) => {
  const isMobile = useIsMobile();
  const regionInfo = getRegionInfo(region.country, region.language);

  return (
    <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#0e151d]/95 backdrop-blur-md border-b border-slate-200 dark:border-[#223344] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-6">
        {/* Zone 1: Brand Wordmark with Himmel Chibi Mascot */}
        <button
          onClick={() => onSelectTab('home')}
          className="relative flex items-center justify-center shrink-0 hover:opacity-95 transition-all select-none group pr-1"
          title="HiDracin - Beranda"
        >
          <div className="relative flex flex-col items-center">
            {/* Himmel Chibi Mascot behind */}
            <img
              src="/assets/aistudio/himmel_chibi_96091b4e.png"
              alt="HiDracin Mascot"
              className="h-12 w-auto object-contain filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.35)] transition-transform duration-200 group-hover:scale-105"
            />
            {/* Overlapping Text directly over feet in front */}
            <span className="absolute -bottom-1 z-10 font-display font-black text-[11px] sm:text-xs tracking-tight text-blue-600 dark:text-[#38bdf8] uppercase bg-white/95 dark:bg-[#0e151d]/90 px-1.5 py-0.5 rounded-xs border border-blue-400/40 dark:border-[#38bdf8]/40 shadow-sm leading-none whitespace-nowrap">
              hidracin
            </span>
          </div>
        </button>

        {/* Zone 2: Navigation Links (Brutalist Tab Underline like reference image) */}
        <nav className="hidden md:flex items-center gap-1 sm:gap-2 text-xs uppercase font-mono font-semibold">
          <button
            onClick={() => onSelectTab('home')}
            className={`px-3 py-2 transition-all relative ${
              currentTab === 'home'
                ? 'text-slate-900 dark:text-[#f1f5f9] font-bold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-blue-600 dark:after:bg-[#38bdf8]'
                : 'text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Beranda
          </button>
          <button
            onClick={() => onSelectTab('browse')}
            className={`px-3 py-2 transition-all relative ${
              currentTab === 'browse'
                ? 'text-slate-900 dark:text-[#f1f5f9] font-bold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-blue-600 dark:after:bg-[#38bdf8]'
                : 'text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Jelajah
          </button>
          {!isMobile && (
            <button
              onClick={() => onSelectTab('reels')}
              className={`px-3 py-2 transition-all relative flex items-center gap-1.5 ${
                currentTab === 'reels'
                  ? 'text-blue-600 dark:text-[#38bdf8] font-bold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-blue-600 dark:after:bg-[#38bdf8]'
                  : 'text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 dark:bg-[#38bdf8]"></span>
              Mode Reels
            </button>
          )}
          <button
            onClick={() => onSelectTab('library')}
            className={`px-3 py-2 transition-all relative flex items-center gap-1.5 ${
              currentTab === 'library'
                ? 'text-slate-900 dark:text-[#f1f5f9] font-bold after:absolute after:bottom-0 after:left-2 after:right-2 after:h-[2px] after:bg-blue-600 dark:after:bg-[#38bdf8]'
                : 'text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Koleksi
            {bookmarksCount > 0 && (
              <span className="text-[10px] text-sky-700 bg-sky-100 dark:text-[#38bdf8] dark:bg-[#38bdf8]/10 px-1 py-0.2 rounded font-mono">
                {bookmarksCount}
              </span>
            )}
          </button>
          <button
            onClick={onOpenResolver}
            className="px-3 py-2 text-slate-500 dark:text-[#8ba2b8] hover:text-slate-900 dark:hover:text-white transition-colors"
          >
            Input Link
          </button>
        </nav>

        {/* Zone 3: Actions (Theme Toggle, Region & Search) */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          {/* Light / Dark Mode Toggle */}
          <button
            onClick={onToggleTheme}
            className="p-2 text-slate-600 dark:text-[#8ba2b8] bg-slate-100 hover:bg-slate-200 dark:bg-[#16222f] dark:hover:bg-[#1e2e3f] border border-slate-300 dark:border-[#26394c] rounded-md transition-all group"
            title={theme === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
          >
            {theme === 'dark' ? (
              <Sun className="w-4 h-4 text-[#38bdf8] group-hover:rotate-45 transition-transform" />
            ) : (
              <Moon className="w-4 h-4 text-blue-600 group-hover:-rotate-12 transition-transform" />
            )}
          </button>

          {/* Region selector */}
          <button
            onClick={onOpenRegion}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-mono font-medium text-slate-700 dark:text-[#c4d5e5] bg-slate-100 hover:bg-slate-200 dark:bg-[#16222f] dark:hover:bg-[#1e2e3f] border border-slate-300 dark:border-[#26394c] rounded-md transition-all whitespace-nowrap shrink-0 group"
            title="Ubah Negara & Bahasa"
          >
            <Globe className="w-3.5 h-3.5 text-blue-600 dark:text-[#38bdf8] group-hover:rotate-12 transition-transform" />
            <span className="text-xs leading-none">{regionInfo.country.flag}</span>
            <span className="font-semibold text-xs text-slate-900 dark:text-white">{region.country}</span>
            <span className="text-[10px] text-slate-400 dark:text-[#8ba2b8] uppercase hidden sm:inline">{region.language}</span>
          </button>

          {/* Search bar */}
          <button
            onClick={onOpenSearch}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-[#c4d5e5] bg-slate-100 hover:bg-slate-200 dark:bg-[#16222f] dark:hover:bg-[#1e2e3f] border border-slate-300 dark:border-[#26394c] rounded-md transition-all whitespace-nowrap shrink-0"
            title="Cari drama (Ctrl+K)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500 dark:text-[#8ba2b8]" />
            <span className="hidden sm:inline">Cari Drama</span>
            <kbd className="hidden sm:inline text-[10px] bg-white dark:bg-[#0e151d] border border-slate-300 dark:border-[#26394c] text-slate-500 dark:text-[#8ba2b8] px-1 py-0.2 rounded font-mono">
              /
            </kbd>
          </button>
        </div>
      </div>
    </header>
  );
};
