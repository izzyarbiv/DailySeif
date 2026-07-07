import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, Captions, CaptionsOff, Settings } from 'lucide-react';

interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  mute(): void;
  unMute(): void;
  getIframe(): HTMLIFrameElement;
  destroy(): void;
  setPlaybackQuality(q: string): void;
  getPlaybackQuality(): string;
  getAvailableQualityLevels(): string[];
  loadModule(m: string): void;
  unloadModule(m: string): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setOption(module: string, option: string, value: any): void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getOption(module: string, option: string): any;
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const QUALITY_LABELS: Record<string, string> = {
  hd1080: '1080p', hd720: '720p', large: '480p', medium: '360p', small: '240p', tiny: '144p',
};

const ytReadyCallbacks: (() => void)[] = [];
let ytLoading = false;

function loadYTApi(cb: () => void) {
  if (window.YT?.Player) { cb(); return; }
  ytReadyCallbacks.push(cb);
  if (!ytLoading) {
    ytLoading = true;
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      ytReadyCallbacks.forEach(fn => fn());
      ytReadyCallbacks.length = 0;
    };
    const s = document.createElement('script');
    s.src = 'https://www.youtube.com/iframe_api';
    document.head.appendChild(s);
  }
}

function extractVideoId(url: string): string | null {
  const m =
    url.match(/[?&]v=([^&#]+)/) ||
    url.match(/youtu\.be\/([^?#]+)/) ||
    url.match(/youtube\.com\/embed\/([^?#]+)/);
  return m ? m[1] : null;
}

function fmt(s: number) {
  const m = Math.floor(s / 60);
  return `${m}:${Math.floor(s % 60).toString().padStart(2, '0')}`;
}

interface Props {
  url: string;
  initialTime?: number;
  onReady?: () => void;
  onTimeUpdate?: (seconds: number) => void;
}

export default function YouTubePlayer({ url, initialTime, onTimeUpdate }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [showControls, setShowControls] = useState(true);

  // Captions
  const [ccOn, setCcOn] = useState(false);
  const [hasCaptions, setHasCaptions] = useState(false);

  // Quality
  const [quality, setQuality] = useState('');
  const [availableQualities, setAvailableQualities] = useState<string[]>([]);
  const [showQuality, setShowQuality] = useState(false);

  const videoId = extractVideoId(url);

  useEffect(() => {
    if (!videoId || !mountRef.current) return;
    const el = document.createElement('div');
    mountRef.current.appendChild(el);

    loadYTApi(() => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      playerRef.current = new window.YT.Player(el, {
        videoId,
        playerVars: {
          controls: 0, modestbranding: 1, rel: 0, iv_load_policy: 3,
          cc_load_policy: 0, origin: window.location.origin, enablejsapi: 1,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            setDuration(e.target.getDuration());
            setReady(true);
            if (initialTime && initialTime > 10) {
              e.target.seekTo(initialTime, true);
              setCurrent(initialTime);
            }
            // Check for captions
            try {
              const tracks = e.target.getOption('captions', 'tracklist') ?? [];
              setHasCaptions(Array.isArray(tracks) && tracks.length > 0);
            } catch {}
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            const isPlaying = e.data === 1;
            setPlaying(isPlaying);
            if (isPlaying) {
              const d = playerRef.current?.getDuration() ?? 0;
              if (d > 0) setDuration(d);
              // Fetch available qualities once playing
              const q = playerRef.current?.getAvailableQualityLevels() ?? [];
              setAvailableQualities(q.filter((x: string) => x !== 'auto' && x !== 'default'));
              setQuality(playerRef.current?.getPlaybackQuality() ?? '');
              tickRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime() ?? 0;
                setCurrent(t);
                onTimeUpdate?.(t);
              }, 1000);
            } else {
              clearInterval(tickRef.current);
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onPlaybackQualityChange: (e: any) => setQuality(e.data),
        },
      }) as YTPlayer;
    });

    return () => {
      clearInterval(tickRef.current);
      clearTimeout(hideTimer.current);
      playerRef.current?.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId]);

  const togglePlay = () => {
    if (playing) playerRef.current?.pauseVideo();
    else playerRef.current?.playVideo();
    nudgeControls();
  };

  const toggleMute = () => {
    if (muted) { playerRef.current?.unMute(); setMuted(false); }
    else { playerRef.current?.mute(); setMuted(true); }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const t = parseFloat(e.target.value);
    setCurrent(t);
    playerRef.current?.seekTo(t, true);
  };

  const toggleCaptions = () => {
    const p = playerRef.current;
    if (!p) return;
    if (ccOn) {
      try { p.unloadModule('captions'); } catch {}
      setCcOn(false);
    } else {
      try {
        p.loadModule('captions');
        const tracks = p.getOption('captions', 'tracklist') ?? [];
        if (tracks.length > 0) p.setOption('captions', 'track', tracks[0]);
        setHasCaptions(tracks.length > 0);
      } catch {}
      setCcOn(true);
    }
  };

  const changeQuality = (q: string) => {
    playerRef.current?.setPlaybackQuality(q);
    setQuality(q);
    setShowQuality(false);
  };

  const handleFullscreen = () => {
    playerRef.current?.getIframe()?.requestFullscreen?.();
  };

  const nudgeControls = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) hideTimer.current = setTimeout(() => setShowControls(false), 3000);
  };

  return (
    <div
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={nudgeControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* YouTube iframe */}
      <div
        ref={mountRef}
        className="absolute inset-0 [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full pointer-events-none"
      />

      {/* Click overlay */}
      <div className="absolute inset-0 cursor-pointer" style={{ zIndex: 1 }} onClick={togglePlay} />

      {/* Center play button */}
      {!playing && ready && (
        <div className="absolute inset-0 flex items-center justify-center" style={{ zIndex: 2 }} onClick={togglePlay}>
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-5 hover:bg-black/60 transition-colors">
            <Play className="h-10 w-10 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 3, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <div className="px-4 pt-4">
          <input
            type="range" min={0} max={duration || 100} step={0.5} value={current}
            onChange={handleSeek}
            className="w-full h-1 cursor-pointer" style={{ accentColor: '#fff' }}
          />
        </div>

        {/* Buttons row */}
        <div className="flex items-center gap-2 px-4 pb-3 pt-1.5">
          <button onClick={togglePlay} className="text-white hover:text-gray-300 transition-colors">
            {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5 fill-white" />}
          </button>
          <button onClick={toggleMute} className="text-white hover:text-gray-300 transition-colors">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="text-white/80 text-xs tabular-nums">
            {fmt(current)}{duration > 0 ? ` / ${fmt(duration)}` : ''}
          </span>

          <div className="flex-1" />

          {/* CC toggle */}
          <button
            onClick={toggleCaptions}
            title={hasCaptions ? (ccOn ? 'Hide subtitles' : 'Show subtitles') : 'No subtitles available'}
            className={`transition-colors ${hasCaptions ? 'text-white hover:text-gray-300' : 'text-white/30 cursor-default'} ${ccOn ? 'text-yellow-300 hover:text-yellow-200' : ''}`}
          >
            {ccOn ? <Captions className="h-4 w-4" /> : <CaptionsOff className="h-4 w-4" />}
          </button>

          {/* Quality selector */}
          {availableQualities.length > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowQuality(v => !v)}
                className="text-white hover:text-gray-300 transition-colors flex items-center gap-1"
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs">{QUALITY_LABELS[quality] ?? 'Auto'}</span>
              </button>
              {showQuality && (
                <div className="absolute bottom-8 right-0 bg-black/90 rounded-lg overflow-hidden py-1 min-w-[80px]">
                  {availableQualities
                    .filter(q => QUALITY_LABELS[q])
                    .map(q => (
                      <button
                        key={q}
                        onClick={() => changeQuality(q)}
                        className={`w-full px-4 py-1.5 text-xs text-left transition-colors ${quality === q ? 'text-yellow-300 bg-white/10' : 'text-white hover:bg-white/10'}`}
                      >
                        {QUALITY_LABELS[q]}
                      </button>
                    ))}
                </div>
              )}
            </div>
          )}

          <button onClick={handleFullscreen} className="text-white hover:text-gray-300 transition-colors">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
