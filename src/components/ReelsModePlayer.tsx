import React, { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';
import {
  Heart,
  Bookmark,
  BookmarkCheck,
  List,
  Volume2,
  VolumeX,
  X,
  Play,
  Pause,
  Captions,
  Tv,
  FastForward,
  Clock,
  RotateCcw
} from 'lucide-react';
import { EpisodeItem, SeriesDetail, SubtitleItem } from '../types.ts';
import { unlockEpisode } from '../lib/api.ts';
import {
  isBookmarked,
  toggleBookmark,
  saveWatchProgress,
  saveEpisodePlaybackPosition,
  getEpisodePlaybackPosition
} from '../lib/storage.ts';
import { parseSubtitles, getActiveSubtitleText, SubtitleCue } from '../lib/subtitleParser.ts';
import { useIsMobile } from '../lib/useIsMobile.ts';
import { isDubDrama, getFormattedTitle } from '../lib/dramaFormatter.ts';

interface ReelsModePlayerProps {
  series: SeriesDetail;
  initialEpisodeIndex?: number;
  coverImage?: string | null;
  onClose: () => void;
  onSwitchToTheater: (episodeIndex: number) => void;
}

export const ReelsModePlayer: React.FC<ReelsModePlayerProps> = ({
  series,
  initialEpisodeIndex = 1,
  coverImage,
  onClose,
  onSwitchToTheater,
}) => {
  const isMobile = useIsMobile();
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  const [currentEpIndex, setCurrentEpIndex] = useState<number>(initialEpisodeIndex);
  const [loading, setLoading] = useState<boolean>(true);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [progress, setProgress] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState<boolean>(false);
  const [scrubTime, setScrubTime] = useState<number>(0);

  // Resume playback position from last watched
  const targetResumeTimeRef = useRef<number>(0);
  const [resumeToast, setResumeToast] = useState<string | null>(null);
  const lastSavedTimeRef = useRef<number>(0);

  // Performance throttling refs for smooth mobile playback (prevents 10x/sec re-render loops)
  const lastTimeUpdateRef = useRef<number>(0);
  const lastActiveSubtitleRef = useRef<string>('');

  // Hold-to-speed-up (2X) on right half of video screen
  const [isSpeedingUp, setIsSpeedingUp] = useState<boolean>(false);
  const speedUpTimerRef = useRef<NodeJS.Timeout | null>(null);
  const speedUpActiveRef = useRef<boolean>(false);
  const suppressClickRef = useRef<boolean>(false);
  const pointerStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const [showHeartAnim, setShowHeartAnim] = useState<boolean>(false);
  const [liked, setLiked] = useState<boolean>(false);
  const [bookmarked, setBookmarked] = useState<boolean>(isBookmarked(series.id));
  const [showEpisodeSheet, setShowEpisodeSheet] = useState<boolean>(false);
  const [showUi, setShowUi] = useState<boolean>(true);
  const tapTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoHideTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Subtitles
  const [subtitles, setSubtitles] = useState<SubtitleItem[]>([]);
  const [selectedSubLang, setSelectedSubLang] = useState<string>('id-ID');
  const [subtitleText, setSubtitleText] = useState<string>('');
  const cuesRef = useRef<SubtitleCue[]>([]);

  const currentEpisode = series.episodes.find((e) => e.index === currentEpIndex) || series.episodes[0];

  // Touch & Wheel tracking for reels navigation
  const touchStartY = useRef<number>(0);
  const isScrollingRef = useRef<boolean>(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

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
        if (video.duration) {
          setProgress((resumeTime / video.duration) * 100);
        }
        setResumeToast(`Melanjutkan menit ${formatTime(resumeTime)}`);
        setTimeout(() => setResumeToast(null), 2500);
      } catch (err) {
        console.warn('Could not seek to resume time yet:', err);
      }
      targetResumeTimeRef.current = 0;
    }
  };

  // Load stream
  useEffect(() => {
    let active = true;
    setLoading(true);
    setSubtitleText('');
    cuesRef.current = [];

    const loadStream = async () => {
      try {
        if (!currentEpisode) return;

        // Check if there is saved progress for this episode
        const savedProgress = getEpisodePlaybackPosition(series.id, currentEpisode.index);
        if (savedProgress && !savedProgress.finished && savedProgress.currentTime > 2) {
          targetResumeTimeRef.current = savedProgress.currentTime;
          setCurrentTime(savedProgress.currentTime);
          if (savedProgress.duration > 0) {
            setDuration(savedProgress.duration);
            setProgress((savedProgress.currentTime / savedProgress.duration) * 100);
          }
        } else {
          targetResumeTimeRef.current = 0;
          setCurrentTime(0);
          setDuration(0);
          setProgress(0);
        }

        setIsScrubbing(false);
        setIsSpeedingUp(false);
        speedUpActiveRef.current = false;
        const unlocked = await unlockEpisode(series.id, currentEpisode.episodeId);
        if (!active) return;

        setSubtitles(unlocked.subtitles || []);
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
        if (!streamUrl) return;

        setupHls(streamUrl);

        // Record history with authentic drama poster/cover banner
        const authenticPoster = coverImage || series.thumbnail || series.cover || series.firstEpisode?.cover || null;
        saveWatchProgress({
          seriesId: series.id,
          seriesTitle: series.title,
          thumbnail: authenticPoster,
          lastEpisodeIndex: currentEpisode.index,
          lastEpisodeId: currentEpisode.episodeId,
          totalEpisodes: series.totalEpisodes || series.episodes.length,
        });
      } catch (e) {
        console.error('Reels load error:', e);
        setLoading(false);
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
        lowLatencyMode: false, // Critical: lowLatencyMode causes buffer underruns and micro-stutters on mobile VOD
        capLevelToPlayerSize: true, // Prevents decoding heavy 1080p/2K video variants on mobile screens
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
        video.play().catch(() => setIsPlaying(false));
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              break;
          }
        }
      });
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = streamUrl;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        applyResumeIfAvailable();
        video.play().catch(() => setIsPlaying(false));
      });
    }
  };

  // Subtitle sync
  useEffect(() => {
    if (selectedSubLang === 'none' || !subtitles.length) {
      cuesRef.current = [];
      setSubtitleText('');
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
      setSubtitleText('');
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
          console.warn('Gagal memuat subtitle di Reels:', targetUrl, err);
        }
      }
      if (isSubActive) {
        cuesRef.current = [];
        setSubtitleText('');
      }
    };

    fetchSub();

    return () => {
      isSubActive = false;
    };
  }, [selectedSubLang, subtitles]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        goToNext();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        goToPrev();
      } else if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'm' || e.key === 'M') {
        toggleMute();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  const goToNext = () => {
    saveCurrentEpProgress(false);
    const nextEp = series.episodes.find((e) => e.index === currentEpIndex + 1);
    if (nextEp) {
      setCurrentEpIndex(nextEp.index);
    }
  };

  const goToPrev = () => {
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

  // Controls auto-hide timers & lifecycle
  const triggerShowAndAutoHide = () => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    setShowUi(true);
    autoHideTimeoutRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowUi(false);
      }
      autoHideTimeoutRef.current = null;
    }, 2000);
  };

  const cancelAutoHideAndShow = () => {
    if (autoHideTimeoutRef.current) {
      clearTimeout(autoHideTimeoutRef.current);
      autoHideTimeoutRef.current = null;
    }
    setShowUi(true);
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
    // Finished full to end: mark finished: true so next time it starts from 00:00
    saveCurrentEpProgress(true);
    goToNext();
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

  const toggleMute = () => {
    const video = videoRef.current;
    if (video) {
      video.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };

  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (video) {
      if (video.duration) {
        setDuration(video.duration);
      }
      applyResumeIfAvailable();
    }
  };

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
    if (delta >= 0.25 || isScrubbing) {
      lastTimeUpdateRef.current = t;
      setCurrentTime(t);
      if (!isScrubbing && d > 0) {
        setProgress((t / d) * 100);
      }
    }

    // Save progress periodically to remember position when switching episodes
    if (Math.abs(t - lastSavedTimeRef.current) >= 2.0) {
      lastSavedTimeRef.current = t;
      saveEpisodePlaybackPosition(series.id, currentEpIndex, t, d, false);
    }

    // Only update subtitle state when text actually changes
    if (cuesRef.current.length) {
      const activeText = getActiveSubtitleText(cuesRef.current, t);
      if (activeText !== lastActiveSubtitleRef.current) {
        lastActiveSubtitleRef.current = activeText;
        setSubtitleText(activeText);
      }
    } else if (lastActiveSubtitleRef.current !== '') {
      lastActiveSubtitleRef.current = '';
      setSubtitleText('');
    }
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setScrubTime(val);
    if (duration > 0) {
      setProgress((val / duration) * 100);
    }
  };

  const handleSeekCommit = () => {
    const video = videoRef.current;
    if (video && !isNaN(scrubTime)) {
      video.currentTime = scrubTime;
      setCurrentTime(scrubTime);
      if (duration > 0) {
        setProgress((scrubTime / duration) * 100);
      }
    }
    setIsScrubbing(false);
  };

  // Hold-to-speed-up (2X) on right half of video screen (from middle to right corner, top to bottom)
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const xRatio = (e.clientX - rect.left) / rect.width;

    // Check if right half of screen: from center towards right edge (50% - 100%)
    if (xRatio >= 0.5) {
      pointerStartPosRef.current = { x: e.clientX, y: e.clientY };

      if (speedUpTimerRef.current) {
        clearTimeout(speedUpTimerRef.current);
      }

      speedUpTimerRef.current = setTimeout(() => {
        const video = videoRef.current;
        if (video) {
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
        video.playbackRate = 1.0;
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

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (autoHideTimeoutRef.current) {
        clearTimeout(autoHideTimeoutRef.current);
      }
      if (tapTimerRef.current) {
        clearTimeout(tapTimerRef.current);
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (speedUpTimerRef.current) {
        clearTimeout(speedUpTimerRef.current);
      }
    };
  }, []);

  const handleDoubleTap = () => {
    setLiked(true);
    setShowHeartAnim(true);
    setTimeout(() => setShowHeartAnim(false), 900);
  };

  const handleScreenClick = () => {
    if (suppressClickRef.current) {
      return;
    }

    if (tapTimerRef.current) {
      clearTimeout(tapTimerRef.current);
      tapTimerRef.current = null;
      handleDoubleTap();
      return;
    }

    tapTimerRef.current = setTimeout(() => {
      tapTimerRef.current = null;
      const video = videoRef.current;
      if (!video) return;

      if (!video.paused) {
        // Video was playing: Pause it and immediately bring back panels
        video.pause();
        cancelAutoHideAndShow();
      } else {
        // Video was paused: Play it, show UI, and auto-hide panels after 2 seconds
        video.play().catch(() => {});
        triggerShowAndAutoHide();
      }
    }, 220);
  };

  const handleWheel = (e: React.WheelEvent) => {
    // If episode list drawer is open, let user scroll drawer without changing episodes
    if (showEpisodeSheet) return;
    if (isScrollingRef.current) return;
    if (Math.abs(e.deltaY) < 30) return;

    if (e.deltaY > 0) {
      // Scroll down -> next episode (like Reels / TikTok)
      goToNext();
    } else {
      // Scroll up -> previous episode (like Reels / TikTok)
      goToPrev();
    }

    isScrollingRef.current = true;
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(() => {
      isScrollingRef.current = false;
    }, 550);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (showEpisodeSheet || isScrollingRef.current || speedUpActiveRef.current || suppressClickRef.current) return;
    const deltaY = touchStartY.current - e.changedTouches[0].clientY;
    if (deltaY > 50) {
      // Swipe up (scroll down) -> next episode
      goToNext();
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    } else if (deltaY < -50) {
      // Swipe down (scroll up) -> prev episode
      goToPrev();
      isScrollingRef.current = true;
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        isScrollingRef.current = false;
      }, 500);
    }
  };

  const handleBookmarkToggle = () => {
    const res = toggleBookmark({
      seriesId: series.id,
      seriesTitle: series.title,
      thumbnail: series.firstEpisode?.cover || null,
      genre: '',
      totalEpisodes: series.totalEpisodes || series.episodes.length,
    });
    setBookmarked(res);
  };

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-50 bg-neutral-950 flex items-center justify-center select-none"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onWheel={handleWheel}
    >
      {/* 9:16 Vertical Phone Card on Desktop, Fullscreen on Mobile */}
      <div className="relative w-full h-full max-w-[430px] max-h-[920px] bg-black sm:rounded-2xl overflow-hidden shadow-2xl flex flex-col justify-between sm:border sm:border-neutral-800">
        {/* Video Element */}
        <div
          className="absolute inset-0 z-0 bg-neutral-950 cursor-pointer select-none"
          onClick={handleScreenClick}
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
            className="w-full h-full object-cover [transform:translateZ(0)]"
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

          {/* Right-Side Hold Visual Glow Feedback */}
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

          {/* Subtitle text overlay - remains visible in Clean Mode with dynamic placement */}
          {subtitleText && (
            <div
              className={`absolute left-4 right-4 text-center pointer-events-none z-20 flex justify-center transition-all duration-300 ${
                showUi ? 'bottom-24 sm:right-16' : 'bottom-8'
              }`}
            >
              <span className="inline-block px-3.5 py-1.5 bg-black/90 text-amber-200 text-sm font-semibold rounded-lg [text-shadow:_0_1px_3px_rgb(0_0_0_/_95%),_0_0_2px_rgb(0_0_0_/_100%)] leading-snug whitespace-pre-line shadow-2xl border border-black/50 max-w-sm">
                {subtitleText}
              </span>
            </div>
          )}

          {/* Double Tap Heart Animation */}
          {showHeartAnim && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30 animate-ping">
              <Heart className="w-24 h-24 text-rose-500 fill-rose-500 drop-shadow-xl" />
            </div>
          )}

          {/* Loading Indicator */}
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 z-20 pointer-events-none">
              <div className="w-10 h-10 border-3 border-rose-500 border-t-transparent rounded-full animate-spin mb-2"></div>
              <p className="text-xs text-white font-medium">Memuat Episode {currentEpIndex}...</p>
            </div>
          )}

          {/* Centered Pause Indicator Badge when paused */}
          {!isPlaying && !loading && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
              <div className="p-4 rounded-full bg-black/75 text-white/90 shadow-xl border border-white/10 animate-in fade-in zoom-in duration-200">
                <Play className="w-12 h-12 fill-white translate-x-0.5" />
              </div>
            </div>
          )}
        </div>

        {/* Top Header Overlay */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative z-20 p-4 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/30 to-transparent transition-all duration-300 ${
            showUi ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
          }`}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/50 text-white hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <span className="text-xs font-semibold text-rose-400 bg-rose-950/80 px-2 py-0.5 rounded border border-rose-800/80">
              Ep {currentEpIndex} / {series.totalEpisodes}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!isMobile && (
              <button
                onClick={() => onSwitchToTheater(currentEpIndex)}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-neutral-800 transition-colors"
                title="Pindah ke Mode Teater (Layar Penuh Standar)"
              >
                <Tv className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={toggleMute}
              className="p-2 rounded-full bg-black/50 text-white hover:bg-neutral-800 transition-colors"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Floating Right Action Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute right-3 bottom-24 z-20 flex flex-col items-center gap-4 transition-all duration-300 ${
            showUi ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8 pointer-events-none'
          }`}
        >
          {/* Like Button */}
          <button
            onClick={() => setLiked(!liked)}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
          >
            <div className={`p-3 rounded-full ${liked ? 'bg-rose-600/90' : 'bg-neutral-900/80 border border-white/10'}`}>
              <Heart className={`w-5 h-5 ${liked ? 'fill-white text-white' : 'text-white'}`} />
            </div>
            <span className="text-[11px] font-medium drop-shadow-md">
              {liked ? 'Disukai' : 'Suka'}
            </span>
          </button>

          {/* Bookmark Button */}
          <button
            onClick={handleBookmarkToggle}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
          >
            <div className={`p-3 rounded-full ${bookmarked ? 'bg-amber-600/90' : 'bg-neutral-900/80 border border-white/10'}`}>
              {bookmarked ? (
                <BookmarkCheck className="w-5 h-5 text-white" />
              ) : (
                <Bookmark className="w-5 h-5 text-white" />
              )}
            </div>
            <span className="text-[11px] font-medium drop-shadow-md">Koleksi</span>
          </button>

          {/* Episode List Trigger */}
          <button
            onClick={() => setShowEpisodeSheet(true)}
            className="flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
          >
            <div className="p-3 rounded-full bg-neutral-900/80 border border-white/10 hover:bg-neutral-800">
              <List className="w-5 h-5 text-white" />
            </div>
            <span className="text-[11px] font-medium drop-shadow-md">Episode</span>
          </button>

          {/* Subtitle toggle */}
          {subtitles.length > 0 && (
            <button
              onClick={() => {
                const next = selectedSubLang === 'none' ? 'id-ID' : 'none';
                setSelectedSubLang(next);
              }}
              className="flex flex-col items-center gap-1 text-white hover:scale-110 active:scale-90 transition-transform"
            >
              <div className={`p-3 rounded-full ${selectedSubLang !== 'none' ? 'bg-[#16222f] border border-[#38bdf8] text-[#38bdf8]' : 'bg-neutral-900/80 border border-white/10 text-white'}`}>
                <Captions className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-mono font-medium drop-shadow-md">
                {selectedSubLang !== 'none' ? 'Sub On' : 'Sub Off'}
              </span>
            </button>
          )}
        </div>

        {/* Bottom Details Overlay & Progress Bar */}
        <div
          onClick={(e) => e.stopPropagation()}
          className={`relative z-20 p-4 bg-gradient-to-t from-black/95 via-black/60 to-transparent pr-16 transition-all duration-300 ${
            showUi ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
          }`}
        >
          <h2 className="text-sm font-bold text-white mb-1 line-clamp-1 font-mono uppercase tracking-tight">
            {getFormattedTitle(series.title, isDubDrama(series))}
          </h2>
          <p className="text-xs text-neutral-300 line-clamp-2 leading-relaxed mb-3">
            {series.synopsis || 'Nonton drama china pendek viral dengan alur cerita adiktif.'}
          </p>

          {/* Interactive Seek Bar & Detailed Minutes/Seconds Display */}
          <div className="w-full flex flex-col gap-1.5 select-none pt-1">
            {/* Timestamp Display */}
            <div className="flex items-center justify-between text-xs font-mono font-medium text-white/95 px-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-sky-400 dark:text-[#38bdf8] font-bold tabular-nums">
                  {formatTime(isScrubbing ? scrubTime : currentTime)}
                </span>
                <span className="text-white/40">/</span>
                <span className="text-white/70 tabular-nums">
                  {formatTime(duration)}
                </span>
                {duration > 0 && (
                  <span className="text-[10px] text-white/40 tabular-nums hidden xs:inline">
                    (-{formatTime(Math.max(0, duration - (isScrubbing ? scrubTime : currentTime)))})
                  </span>
                )}
              </div>
              <span className="text-[10px] text-white/50 font-sans tracking-tight">
                {isScrubbing ? 'Lepas untuk memutar' : 'Geser untuk pilih menit'}
              </span>
            </div>

            {/* Interactive Scrubber Bar */}
            <div
              className="relative w-full py-2 flex items-center cursor-pointer group"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onTouchStart={(e) => e.stopPropagation()}
            >
              {/* Visual Track */}
              <div className="w-full h-1.5 group-hover:h-2.5 bg-white/25 rounded-full overflow-hidden transition-all relative">
                <div
                  className="h-full bg-sky-400 dark:bg-[#38bdf8] rounded-full transition-[width] duration-75 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
                  style={{
                    width: `${duration > 0 ? ((isScrubbing ? scrubTime : currentTime) / duration) * 100 : 0}%`,
                  }}
                />
              </div>

              {/* Native range input for accessible, smooth touch/mouse scrubbing */}
              <input
                type="range"
                min="0"
                max={duration || 100}
                step="0.1"
                value={isScrubbing ? scrubTime : currentTime}
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsScrubbing(true);
                  setScrubTime(currentTime);
                }}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  setIsScrubbing(true);
                  setScrubTime(currentTime);
                }}
                onChange={handleSeekChange}
                onMouseUp={(e) => {
                  e.stopPropagation();
                  handleSeekCommit();
                }}
                onTouchEnd={(e) => {
                  e.stopPropagation();
                  handleSeekCommit();
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                title="Geser ke menit tertentu"
              />

              {/* Floating Tooltip Bubble while scrubbing */}
              {isScrubbing && (
                <div
                  className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 bg-black/90 border border-sky-400 dark:border-[#38bdf8] text-sky-400 dark:text-[#38bdf8] text-[11px] font-mono font-bold rounded shadow-lg pointer-events-none"
                  style={{
                    left: `${duration > 0 ? Math.min(90, Math.max(10, (scrubTime / duration) * 100)) : 0}%`,
                  }}
                >
                  {formatTime(scrubTime)}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Minimalist interactive progress bar when UI is hidden (Clean Mode) */}
        {!showUi && (
          <div
            className="absolute bottom-0 left-0 right-0 z-20 cursor-pointer group"
            onClick={(e) => {
              e.stopPropagation();
              triggerShowAndAutoHide();
            }}
          >
            <div className="w-full h-1 group-hover:h-2 bg-black/50 backdrop-blur-xs transition-all flex items-center">
              <div
                className="h-full bg-sky-400 dark:bg-[#38bdf8] transition-[width] duration-150"
                style={{
                  width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Episode Sheet Modal */}
        {showEpisodeSheet && (
          <div className="absolute inset-0 z-40 bg-[#0e151d]/95 p-4 flex flex-col backdrop-blur-md animate-in fade-in border border-[#26394c]">
            <div className="flex items-center justify-between pb-3 border-b border-[#26394c] mb-3">
              <div>
                <h3 className="text-sm font-mono font-bold uppercase text-white">Daftar Episode</h3>
                <p className="text-xs font-mono text-[#8ba2b8]">Total {series.totalEpisodes} Episode</p>
              </div>
              <button
                onClick={() => setShowEpisodeSheet(false)}
                className="p-1.5 rounded-none bg-[#16222f] border border-[#26394c] text-neutral-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto grid grid-cols-5 gap-2 pr-1">
              {series.episodes.map((ep) => (
                <button
                  key={ep.episodeId}
                  onClick={() => {
                    saveCurrentEpProgress(false);
                    setCurrentEpIndex(ep.index);
                    setShowEpisodeSheet(false);
                  }}
                  className={`h-11 text-xs font-mono font-bold flex items-center justify-center transition-all ${
                    ep.index === currentEpIndex
                      ? 'bg-blue-600 dark:bg-[#38bdf8] text-white dark:text-[#0b1320]'
                      : 'bg-[#16222f] border border-[#26394c] text-neutral-200 hover:border-[#38bdf8] hover:text-white'
                  }`}
                >
                  {ep.index}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
