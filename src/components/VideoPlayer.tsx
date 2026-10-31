import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  SkipForward,
  SkipBack,
  Settings,
  ListVideo,
  Captions,
  Smartphone,
  ChevronRight,
  X,
  FastForward,
  Clock
} from 'lucide-react';
import { EpisodeItem, SubtitleItem, SeriesDetail } from '../types.ts';
import { unlockEpisode } from '../lib/api.ts';
import {
  saveWatchProgress,
  saveEpisodePlaybackPosition,
  getEpisodePlaybackPosition
} from '../lib/storage.ts';
import { parseSubtitles, getActiveSubtitleText, SubtitleCue } from '../lib/subtitleParser.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';
import { isDubDrama, getFormattedTitle } from '../lib/dramaFormatter.ts';

interface VideoPlayerProps {
  series: SeriesDetail;
  initialEpisodeIndex?: number;
  coverImage?: string | null;
  onClose: () => void;
  onOpenReels: (episodeIndex: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  series,
  initialEpisodeIndex = 1,
  coverImage,
  onClose,
  onOpenReels,
}) => {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [currentEpIndex, setCurrentEpIndex] = useState<number>(initialEpisodeIndex);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<number>(1);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showControls, setShowControls] = useState<boolean>(true);
  const [autoNext, setAutoNext] = useState<boolean>(true);

  // Hover preview timestamp for seek bar
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState<number>(0);

  // Hold-to-speed-up (2X) on right half of video screen
  const [isSpeedingUp, setIsSpeedingUp] = useState<boolean>(false);
  const speedUpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedUpActiveRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const savedSpeedRef = useRef<number>(1);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  // Resume playback position from last watched
  const targetResumeTimeRef = useRef<number>(0);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // Performance throttling refs for smooth mobile playback (prevents 10x/sec re-render loops)
  const lastTimeUpdateRef = useRef<number>(0);
  const lastActiveSubtitleRef = useRef<string>('');

  // Subtitles & Settings
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [selectedSubLang, setSelectedSubLang] = useState<string>('id-ID'); // default to Indonesian
  const [currentSubtitleText, setCurrentSubtitleText] = useState<string>('');
  const [activeMenu, setActiveMenu] = useState<'sub' | 'speed' | null>(null);
  const [showEpisodeDrawer, setShowEpisodeDrawer] = useState<boolean>(false);
  const [aspectMode, setAspectMode] = useState<'contain' | 'cover'>('contain');

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Parsed subtitle cues for active subtitle track
  const cuesRef = useRef<SubtitleCue[]>([]);

  const currentEpisode = series.episodes.find((e) => e.index === currentEpIndex) || series.episodes[0];

  const saveCurrentEpProgress = (finished = false) => {
    const video = videoRef.current;
    if (video && currentEpisode) {
      const t = video.currentTime;
      const d = video.duration || 0;
      saveEpisodePlaybackPosition(series.id, currentEpIndex, t, d, finished);
    }
  };

  const applyResumeIfAvailable = () => {
    const video = videoRef.current;
    const resumeTime = targetResumeTimeRef.current;
    if (video && resumeTime > 2) {
      try {
        video.currentTime = resumeTime;
        setCurrentTime(resumeTime);
        setResumeToast(`Melanjutkan menit ${formatTime(resumeTime)}`);
        setTimeout(() => setResumeToast(null), 2500);
      } catch (err) {
        console.warn('Could not seek to resume time in VideoPlayer:', err);
      }
      targetResumeTimeRef.current = 0;
    }
  };

  // Load and unlock episode stream
  useEffect(() => {
    let active = true;
    setLoading(true);
    setErrorMsg(null);
    setCurrentSubtitleText('');
    cuesRef.current = [];

    const loadStream = async () => {
      try {
        if (!currentEpisode) throw new Error('Episode tidak ditemukan');

        // Check if there is saved progress for this episode
        const savedProgress = getEpisodePlaybackPosition(series.id, currentEpisode.index);
        if (savedProgress && !savedProgress.finished && savedProgress.currentTime > 2) {
          targetResumeTimeRef.current = savedProgress.currentTime;
          setCurrentTime(savedProgress.currentTime);
          if (savedProgress.duration > 0) {
            setDuration(savedProgress.duration);
          }
        } else {
          targetResumeTimeRef.current = 0;
          setCurrentTime(0);
        }

        const unlocked = await unlockEpisode(series.id, currentEpisode.episodeId);
        if (!active) return;

        setSubtitles(unlocked.subtitles || []);

        // Pick preferred subtitle (Indonesian first, then English, or first available)
        const hasIndo = (unlocked.subtitles || []).find((s) => {
          const l = s.language.toLowerCase();
          const d = (s.displayName || '').toLowerCase();
          return l.includes('id') || l.includes('ind') || l.startsWith('in') || d.includes('indonesia');
        });
        const defaultSub = hasIndo
          ? hasIndo.language
          : (unlocked.subtitles || []).find((s) => s.language.toLowerCase().includes('en'))?.language ||
            unlocked.subtitles?.[0]?.language ||
            'none';
        setSelectedSubLang(defaultSub);

        const streamUrl = unlocked.proxiedUrl || unlocked.url;
        if (!streamUrl) throw new Error('URL video tidak tersedia');

        setupHls(streamUrl);

        // Record history with the authentic drama poster/cover banner
        const authenticPoster = coverImage || series.thumbnail || series.cover || series.firstEpisode?.cover || null;
        saveWatchProgress({
          seriesId: series.id,
          seriesTitle: series.title,
          thumbnail: authenticPoster,
          lastEpisodeIndex: currentEpisode.index,
          lastEpisodeId: currentEpisode.episodeId,
          totalEpisodes: series.totalEpisodes || series.episodes.length,
        });
      } catch (err: any) {
        if (active) {
          console.error('Failed to load video:', err);
          setErrorMsg(err.message || 'Gagal memuat video episode');
          setLoading(false);
        }
      }
    };

    loadStream();

    return () => {
      active = false;
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [currentEpIndex, series.id]);

  // Setup Hls.js
  const setupHls = (streamUrl: string) => {
    const video = videoRef.current;
    if (!video) return;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false, // Disabling lowLatencyMode prevents aggressive segment polling and buffer underruns on mobile
        capLevelToPlayerSize: true, // Prevents decoding excessive 1080p/2K video variants on phone displays
        maxBufferLength: isMobile ? 15 : 25,
        maxMaxBufferLength: isMobile ? 30 : 50,
        maxBufferSize: isMobile ? 25 * 1000 * 1000 : 50 * 1000 * 1000,
        backBufferLength: isMobile ? 10 : 20,
        startFragPrefetch: true,
        autoStartLoad: true,
        maxBufferHole: 0.5,
        nudgeOffset: 0.2,
        nudgeMaxRetry: 5,
      });
      hlsRef.current = hls;

      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        applyResumeIfAvailable();
        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              console.warn('HLS Network error, attempting recovery...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.warn('HLS Media error, attempting recovery...');
              hls.recoverMediaError();
              break;
            default:
              console.error('Fatal HLS error:', data);
              setErrorMsg('Terjadi kendala jaringan saat memutar video.');
              setLoading(false);
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Native Safari
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        applyResumeIfAvailable();
        video.play().catch(() => setIsPlaying(false));
      });
    } else {
      setErrorMsg('Browser Anda tidak mendukung pemutar video ini.');
      setLoading(false);
    }
  };

  // Fetch and parse subtitle cues
  useEffect(() => {
    if (selectedSubLang === 'none' || !subtitles.length) {
      cuesRef.current = [];
      setCurrentSubtitleText('');
      return;
    }

    const sub = subtitles.find((s) => {
      const sLang = s.language.toLowerCase();
      const target = selectedSubLang.toLowerCase();
      return (
        sLang === target ||
        sLang.split('-')[0] === target.split('-')[0] ||
        sLang.includes(target) ||
        target.includes(sLang)
      );
    });
    if (!sub || (!sub.vtt && !sub.srt)) {
      cuesRef.current = [];
      setCurrentSubtitleText('');
      return;
    }

    const urlsToTry = [sub.vtt, sub.srt].filter(Boolean) as string[];
    let isSubActive = true;

    const fetchSub = async () => {
      for (const targetUrl of urlsToTry) {
        try {
          const res = await fetch(`/api/proxy-subtitle?url=${encodeURIComponent(targetUrl)}`);
          if (!res.ok) continue;
          const text = await res.text();
          if (!text || text.length < 10) continue;
          const parsed = parseSubtitles(text);
          if (parsed.length > 0 && isSubActive) {
            cuesRef.current = parsed;
            return;
          }
        } catch (err) {
          console.warn('Gagal memuat subtitle dari URL:', targetUrl, err);
        }
      }
      if (isSubActive) {
        cuesRef.current = [];
        setCurrentSubtitleText('');
      }
    };

    fetchSub();

    return () => {
      isSubActive = false;
    };
  }, [selectedSubLang, subtitles]);

  // Video event handlers
  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    const t = video.currentTime;
    const d = video.duration || 0;
    if (d && (!duration || duration !== d)) {
      setDuration(d);
    }

    // Throttle React state re-renders to ~250ms during active playback
    // Drastically reduces mobile main-thread CPU load and prevents playback stutter
    const delta = Math.abs(t - lastTimeUpdateRef.current);
    if (delta >= 0.25) {
      lastTimeUpdateRef.current = t;
      setCurrentTime(t);
    }

    // Save progress periodically to remember position when switching episodes
    if (Math.abs(t - lastSavedTimeRef.current) >= 2.0) {
      lastSavedTimeRef.current = t;
      saveEpisodePlaybackPosition(series.id, currentEpIndex, t, d, false);
    }

    // Only update subtitle state when text actually changes
    if (cuesRef.current.length > 0) {
      const activeText = getActiveSubtitleText(cuesRef.current, t);
      if (activeText !== lastActiveSubtitleRef.current) {
        lastActiveSubtitleRef.current = activeText;
        setCurrentSubtitleText(activeText);
      }
    } else if (lastActiveSubtitleRef.current !== '') {
      lastActiveSubtitleRef.current = '';
      setCurrentSubtitleText('');
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      setDuration(video.duration || 0);
      setLoading(false);
      applyResumeIfAvailable();
    }
  };

  // Controls auto-hide timers & lifecycle
  const triggerShowAndAutoHide = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    setShowControls(true);
    controlsTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
      controlsTimeoutRef.current = null;
    }, 2000);
  };

  const cancelAutoHideAndShow = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = null;
    }
    setShowControls(true);
  };

  const handlePlay = () => {
    setIsPlaying(true);
    triggerShowAndAutoHide();
  };

  const handlePause = () => {
    setIsPlaying(false);
    cancelAutoHideAndShow();
  };

  const handleEnded = () => {
    setIsPlaying(false);
    cancelAutoHideAndShow();
    // Watched full to end: mark finished so next time it starts from 00:00
    saveCurrentEpProgress(true);
    if (autoNext) {
      handleNextEpisode();
    }
  };

  const togglePlay = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      triggerShowAndAutoHide();
    } else {
      video.pause();
      cancelAutoHideAndShow();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const target = parseFloat(e.target.value);
    const video = videoRef.current;
    if (video) {
      video.currentTime = target;
      setCurrentTime(target);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val;
      videoRef.current.muted = val === 0;
      setIsMuted(val === 0);
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const nextMuted = !isMuted;
      videoRef.current.muted = nextMuted;
      setIsMuted(nextMuted);
    }
  };

  const handleSpeedChange = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setActiveMenu(null);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  const handleNextEpisode = () => {
    saveCurrentEpProgress(false);
    const nextEp = series.episodes.find((e) => e.index === currentEpIndex + 1);
    if (nextEp) {
      setCurrentEpIndex(nextEp.index);
    }
  };

  const handlePrevEpisode = () => {
    saveCurrentEpProgress(false);
    const prevEp = series.episodes.find((e) => e.index === currentEpIndex - 1);
    if (prevEp) {
      setCurrentEpIndex(prevEp.index);
    }
  };

  // Save progress on unmount / episode change
  useEffect(() => {
    return () => {
      saveCurrentEpProgress(false);
    };
  }, [currentEpIndex, series.id]);

  // Cleanup auto-hide & speedup timers on unmount
  useEffect(() => {
    return () => {
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (speedUpTimerRef.current) {
        clearTimeout(speedUpTimerRef.current);
      }
    };
  }, []);

  // Hold-to-speed-up (2X) on right half of video screen (from middle to right corner, top to bottom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;

    // Check if right half: from center to right edge (50% - 100%)
    if (xRatio >= 0.5) {
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

      if (speedUpTimerRef.current) {
        clearTimeout(speedUpTimerRef.current);
      }

      speedUpTimerRef.current = setTimeout(() => {
        const video = videoRef.current;
        if (video) {
          savedSpeedRef.current = video.playbackRate;
          video.playbackRate = 2.0;
        }
        speedUpActiveRef.current = true;
        setIsSpeedingUp(true);

        try {
          if (navigator.vibrate) navigator.vibrate(25);
        } catch {}
      }, 180);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartPosRef.current && !speedUpActiveRef.current) {
      const dist = Math.hypot(
        e.clientX - pointerStartPosRef.current.x,
        e.clientY - pointerStartPosRef.current.y
      );
      if (dist > 18 && speedUpTimerRef.current) {
        clearTimeout(speedUpTimerRef.current);
        speedUpTimerRef.current = null;
      }
    }
  };

  const handlePointerUpOrCancel = () => {
    if (speedUpTimerRef.current) {
      clearTimeout(speedUpTimerRef.current);
      speedUpTimerRef.current = null;
    }

    if (speedUpActiveRef.current) {
      const video = videoRef.current;
      if (video) {
        video.playbackRate = savedSpeedRef.current || playbackSpeed || 1.0;
      }
      speedUpActiveRef.current = false;
      setIsSpeedingUp(false);

      suppressClickRef.current = true;
      setTimeout(() => {
        suppressClickRef.current = false;
      }, 250);
    }

    pointerStartPosRef.current = null;
  };

  const handleMouseMove = () => {
    const video = videoRef.current;
    if (video && !video.paused) {
      triggerShowAndAutoHide();
    } else {
      cancelAutoHideAndShow();
    }
  };

  const handleVideoClick = () => {
    if (suppressClickRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    if (!video.paused) {
      video.pause();
      cancelAutoHideAndShow();
    } else {
      video.play().catch(() => {});
      triggerShowAndAutoHide();
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs)) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const hasNext = series.episodes.some((e) => e.index === currentEpIndex + 1);
  const hasPrev = series.episodes.some((e) => e.index === currentEpIndex - 1);

  return (
    <div className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center backdrop-blur-md">
      {/* Player Frame */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        className="relative w-full h-full max-w-6xl max-h-screen bg-black flex flex-col md:flex-row overflow-hidden shadow-2xl"
      >
        {/* Main Video Viewport */}
        <div 
          className="relative flex-1 bg-black flex items-center justify-center overflow-hidden cursor-pointer select-none"
          onClick={handleVideoClick}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUpOrCancel}
          onPointerCancel={handlePointerUpOrCancel}
          onPointerLeave={handlePointerUpOrCancel}
        >
          <video
            ref={videoRef}
            playsInline
            preload="auto"
            onPlay={handlePlay}
            onPause={handlePause}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onEnded={handleEnded}
            onDoubleClick={toggleFullscreen}
            className={`w-full h-full [transform:translateZ(0)] transition-all ${
              aspectMode === 'cover' ? 'object-cover' : 'object-contain'
            }`}
          />

          {/* 2X Speed Up Floating Badge Overlay */}
          {isSpeedingUp && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-4 py-2 bg-neutral-950/95 rounded-full border border-sky-400 dark:border-[#38bdf8] shadow-[0_0_20px_rgba(56,189,248,0.35)] pointer-events-none animate-in fade-in zoom-in duration-150">
              <FastForward className="w-4 h-4 text-sky-400 dark:text-[#38bdf8] animate-pulse" />
              <span className="text-xs font-mono font-bold tracking-wider text-sky-400 dark:text-[#38bdf8]">
                2X KECEPATAN »»
              </span>
            </div>
          )}

          {/* Right-Side Hold Visual Highlight Glow */}
          {isSpeedingUp && (
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-gradient-to-l from-sky-500/20 via-sky-500/5 to-transparent pointer-events-none z-10 border-r-2 border-sky-400/60" />
          )}

          {/* Resume Playback Toast Notification */}
          {resumeToast && !isSpeedingUp && (
            <div className="absolute top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1.5 px-3.5 py-1.5 bg-neutral-950/95 rounded-full border border-sky-400 dark:border-[#38bdf8] text-sky-400 dark:text-[#38bdf8] text-xs font-mono font-medium shadow-xl pointer-events-none animate-in fade-in slide-in-from-top-2 duration-200">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{resumeToast}</span>
            </div>
          )}

          {/* Centered Pause Indicator Badge when paused */}
          {!isPlaying && !loading && !errorMsg && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="p-4 rounded-full bg-black/75 text-white/90 shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200">
                <Play className="w-12 h-12 fill-white translate-x-0.5" />
              </div>
            </div>
          )}

          {/* Subtitle Overlay (Custom Outlined Render with dynamic placement in clean mode) */}
          {currentSubtitleText && (
            <div
              className={`absolute left-4 right-4 text-center pointer-events-none z-20 flex justify-center transition-all duration-300 ${
                showControls ? 'bottom-20' : 'bottom-8'
              }`}
            >
              <span className="inline-block px-4 py-1.5 bg-black/90 text-amber-200 sm:text-lg font-semibold rounded-lg text-balance shadow-2xl [text-shadow:_0_2px_4px_rgb(0_0_0_/_95%),_0_0_2px_rgb(0_0_0_/_100%)] leading-snug tracking-wide whitespace-pre-line border border-black/50 max-w-2xl">
                {currentSubtitleText}
              </span>
            </div>
          )}

          {/* Buffering/Loading State */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-30 pointer-events-none">
              <div className="w-12 h-12 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-sm font-medium text-white tracking-wide">
                Membuka Episode {currentEpIndex}...
              </p>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 p-6 z-30 text-center">
              <p className="text-rose-400 font-semibold mb-2 text-base">{errorMsg}</p>
              <p className="text-xs text-neutral-400 mb-4 max-w-md">
                Gagal memuat video stream. Anda dapat mencoba memuat ulang atau memilih episode lain.
              </p>
              <button
                onClick={() => setCurrentEpIndex(currentEpIndex)}
                className="flex items-center gap-2 px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white text-xs font-medium rounded-lg transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Coba Lagi</span>
              </button>
            </div>
          )}

          {/* Top Bar inside Video */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute top-0 left-0 right-0 p-4 bg-gradient-to-b from-black/80 via-black/40 to-transparent flex items-center justify-between z-30 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="p-2 rounded-full bg-black/50 hover:bg-neutral-800 text-white transition-colors"
                title="Tutup Player"
              >
                <X className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-sm sm:text-base font-bold text-white line-clamp-1 font-mono uppercase tracking-tight">
                  {getFormattedTitle(series.title, isDubDrama(series))}
                </h2>
                <div className="flex items-center gap-2 text-xs font-mono text-neutral-300">
                  <span className="text-[#38bdf8] font-semibold">Ep {currentEpIndex}</span>
                  <span aria-hidden="true">/</span>
                  <span className="tabular-nums">Total {series.totalEpisodes} Episode</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {!isMobile && (
                <button
                  onClick={() => onOpenReels(currentEpIndex)}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-neutral-900/80 hover:bg-neutral-800 border border-neutral-700 text-xs font-mono font-medium text-[#38bdf8] transition-colors"
                  title="Pindah ke Mode Reels Vertikal"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Mode Reels</span>
                </button>
              )}
              <button
                onClick={() => setShowEpisodeDrawer(!showEpisodeDrawer)}
                className={`p-2 transition-colors ${
                  showEpisodeDrawer
                    ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320]'
                    : 'bg-black/50 hover:bg-neutral-800 text-neutral-300'
                }`}
                title="Daftar Episode"
              >
                <ListVideo className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Bottom Controls Bar */}
          <div
            onClick={(e) => e.stopPropagation()}
            className={`absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent z-30 transition-opacity duration-300 ${
              showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {/* Seek Bar with Hover Preview & Dynamic Progress */}
            <div 
              className="relative w-full flex items-center mb-2.5 py-1.5 group cursor-pointer"
              onMouseMove={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
                setHoverPos(pos * 100);
                setHoverTime(pos * (duration || 0));
              }}
              onMouseLeave={() => setHoverTime(null)}
            >
              {/* Hover Timestamp Tooltip */}
              {hoverTime !== null && duration > 0 && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-black/95 border border-sky-400 dark:border-[#38bdf8] text-sky-400 dark:text-[#38bdf8] text-[11px] font-mono font-bold rounded shadow-lg pointer-events-none"
                  style={{ left: `${hoverPos}%` }}
                >
                  {formatTime(hoverTime)}
                </div>
              )}

              {/* Visual Progress Track */}
              <div className="w-full h-1.5 group-hover:h-2 bg-neutral-700/80 rounded-full overflow-hidden relative transition-all">
                <div
                  className="h-full bg-sky-400 dark:bg-[#38bdf8] transition-[width] duration-75 shadow-[0_0_8px_rgba(56,189,248,0.5)]"
                  style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                />
              </div>

              {/* Native Range Input for seamless scrubbing */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={currentTime}
                onChange={handleSeek}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Geser ke menit tertentu"
              />
            </div>

            {/* Controls Row */}
            <div className="flex items-center justify-between text-white">
              {/* Left: Play, Skip, Time, Volume */}
              <div className="flex items-center gap-3">
                <button
                  onClick={togglePlay}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                  {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
                </button>

                <button
                  onClick={handlePrevEpisode}
                  disabled={!hasPrev}
                  className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Episode Sebelumnya"
                >
                  <SkipBack className="w-4 h-4" />
                </button>

                <button
                  onClick={handleNextEpisode}
                  disabled={!hasNext}
                  className="p-1.5 hover:bg-white/10 rounded-full disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                  title="Episode Berikutnya"
                >
                  <SkipForward className="w-4 h-4" />
                </button>

                {/* Minute & Second Display (Current / Total / Remaining) */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-neutral-300 tabular-nums ml-1">
                  <span className="text-sky-400 dark:text-[#38bdf8] font-semibold">{formatTime(currentTime)}</span>
                  <span className="text-neutral-500">/</span>
                  <span>{formatTime(duration)}</span>
                  {duration > 0 && (
                    <span className="hidden sm:inline text-[10px] text-neutral-400 ml-0.5">
                      (-{formatTime(Math.max(0, duration - currentTime))})
                    </span>
                  )}
                </div>

                {/* Volume control */}
                <div className="hidden sm:flex items-center gap-1.5 ml-2 group">
                  <button onClick={toggleMute} className="p-1 hover:text-rose-400 transition-colors">
                    {isMuted || volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-16 h-1 bg-neutral-700 rounded-lg appearance-none cursor-pointer accent-white"
                  />
                </div>
              </div>

              {/* Right: Subtitles, Speed, Aspect, Fullscreen */}
              <div className="flex items-center gap-2 sm:gap-3 text-xs">
                {/* Auto Next toggle */}
                <button
                  onClick={() => setAutoNext(!autoNext)}
                  className={`hidden sm:inline-flex px-2 py-1 rounded text-[11px] font-medium transition-colors ${
                    autoNext ? 'bg-rose-950/80 text-rose-300 border border-rose-800/80' : 'text-neutral-400'
                  }`}
                  title="Otomatis putar episode berikutnya"
                >
                  Auto-Next
                </button>

                {/* Subtitle Selector */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'sub' ? null : 'sub')}
                    className={`flex items-center gap-1 p-1.5 rounded hover:bg-white/10 transition-colors ${
                      selectedSubLang !== 'none' ? 'text-amber-400' : 'text-neutral-400'
                    }`}
                    title="Pilih Subtitle"
                  >
                    <Captions className="w-4 h-4" />
                    <span className="hidden sm:inline text-[11px] uppercase">
                      {selectedSubLang.split('-')[0]}
                    </span>
                  </button>

                  {activeMenu === 'sub' && (
                    <div className="absolute bottom-full right-0 mb-2 w-52 max-h-64 overflow-y-auto bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-2xl z-40">
                      <div className="text-[11px] font-semibold text-neutral-400 px-3 py-1.5 border-b border-neutral-800">
                        Takarir / Subtitle
                      </div>
                      <button
                        onClick={() => {
                          setSelectedSubLang('none');
                          setActiveMenu(null);
                        }}
                        className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          selectedSubLang === 'none' ? 'bg-rose-600 text-white font-medium' : 'text-neutral-300 hover:bg-neutral-800'
                        }`}
                      >
                        Matikan Subtitle
                      </button>
                      {subtitles.map((s) => (
                        <button
                          key={s.language}
                          onClick={() => {
                            setSelectedSubLang(s.language);
                            setActiveMenu(null);
                          }}
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between ${
                            selectedSubLang === s.language
                              ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-bold'
                              : 'text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          <span>{s.displayName || s.language}</span>
                          {s.language.includes('id') && (
                            <span className="text-[10px] bg-[#0e151d] text-[#38bdf8] px-1 border border-[#26394c] font-mono">
                              Sub Indo
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Speed Dropdown */}
                <div className="relative">
                  <button
                    onClick={() => setActiveMenu(activeMenu === 'speed' ? null : 'speed')}
                    className="p-1.5 rounded hover:bg-white/10 text-neutral-300 hover:text-white transition-colors tabular-nums font-mono text-[11px]"
                    title="Kecepatan Putar"
                  >
                    {playbackSpeed}x
                  </button>

                  {activeMenu === 'speed' && (
                    <div className="absolute bottom-full right-0 mb-2 w-32 bg-neutral-900 border border-neutral-800 rounded-xl p-1 shadow-2xl z-40">
                      <div className="text-[11px] font-semibold text-neutral-400 px-3 py-1.5 border-b border-neutral-800">
                        Kecepatan
                      </div>
                      {[0.75, 1, 1.25, 1.5, 2].map((sp) => (
                        <button
                          key={sp}
                          onClick={() => handleSpeedChange(sp)}
                          className={`w-full text-left px-3 py-1.5 text-xs rounded-lg transition-colors ${
                            playbackSpeed === sp ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-bold' : 'text-neutral-300 hover:bg-neutral-800'
                          }`}
                        >
                          {sp}x {sp === 1 && '(Normal)'}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Aspect Toggle (Fit vs Fill) */}
                <button
                  onClick={() => setAspectMode(aspectMode === 'contain' ? 'cover' : 'contain')}
                  className="hidden sm:inline-flex px-2 py-1 rounded text-[11px] text-neutral-300 hover:bg-white/10 transition-colors"
                  title="Ubah Rasio Layar"
                >
                  {aspectMode === 'contain' ? 'Fit' : 'Fill'}
                </button>

                {/* Fullscreen */}
                <button
                  onClick={toggleFullscreen}
                  className="p-1.5 hover:bg-white/10 rounded transition-colors"
                  title={isFullscreen ? 'Keluar Fullscreen' : 'Layar Penuh'}
                >
                  {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Side Episode Drawer */}
        {showEpisodeDrawer && (
          <aside className="w-full md:w-80 h-72 md:h-full bg-neutral-950 border-t md:border-t-0 md:border-l border-neutral-800 flex flex-col z-40">
            <div className="p-4 border-b border-neutral-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-white">Daftar Episode</h3>
                <p className="text-xs text-neutral-400 tabular-nums">
                  Pilih episode (Total {series.totalEpisodes})
                </p>
              </div>
              <button
                onClick={() => setShowEpisodeDrawer(false)}
                className="p-1 text-neutral-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-3 grid grid-cols-4 sm:grid-cols-5 md:grid-cols-4 gap-2">
              {series.episodes.map((ep) => {
                const isActive = ep.index === currentEpIndex;
                return (
                  <button
                    key={ep.episodeId}
                    onClick={() => {
                      saveCurrentEpProgress(false);
                      setCurrentEpIndex(ep.index);
                    }}
                    className={`h-11 rounded-lg text-xs font-semibold flex items-center justify-center transition-all ${
                      isActive
                        ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320] font-bold shadow-md'
                        : 'bg-neutral-900 border border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:text-white'
                    }`}
                  >
                    Ep {ep.index}
                  </button>
                );
              })}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
