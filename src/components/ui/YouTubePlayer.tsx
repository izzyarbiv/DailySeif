import { useEffect, useRef, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';

// Minimal YT types (avoids needing @types/youtube)
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
}

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    YT: any;
    onYouTubeIframeAPIReady?: () => void;
  }
}

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

export default function YouTubePlayer({ url, initialTime, onReady, onTimeUpdate }: Props) {
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const [ready, setReady] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

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
          controls: 0,
          modestbranding: 1,
          rel: 0,
          iv_load_policy: 3,
          origin: window.location.origin,
          enablejsapi: 1,
        },
        events: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onReady: (e: any) => {
            setDuration(e.target.getDuration());
            setReady(true);
            onReady?.();
            if (initialTime && initialTime > 10) {
              e.target.seekTo(initialTime, true);
              setCurrent(initialTime);
            }
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onStateChange: (e: any) => {
            const isPlaying = e.data === 1;
            setPlaying(isPlaying);
            if (isPlaying) {
              // Refresh duration (available once playing)
              const d = playerRef.current?.getDuration() ?? 0;
              if (d > 0) setDuration(d);
              tickRef.current = setInterval(() => {
                const t = playerRef.current?.getCurrentTime() ?? 0;
                setCurrent(t);
                onTimeUpdate?.(t);
              }, 1000);
            } else {
              clearInterval(tickRef.current);
            }
          },
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

  const handleFullscreen = () => {
    playerRef.current?.getIframe()?.requestFullscreen?.();
  };

  const nudgeControls = () => {
    setShowControls(true);
    clearTimeout(hideTimer.current);
    if (playing) {
      hideTimer.current = setTimeout(() => setShowControls(false), 3000);
    }
  };

  return (
    <div
      className="relative w-full bg-black select-none"
      style={{ aspectRatio: '16/9' }}
      onMouseMove={nudgeControls}
      onMouseLeave={() => playing && setShowControls(false)}
    >
      {/* YouTube iframe (no controls) */}
      <div
        ref={mountRef}
        className="absolute inset-0 [&>div]:w-full [&>div]:h-full [&_iframe]:w-full [&_iframe]:h-full pointer-events-none"
      />

      {/* Click overlay */}
      <div className="absolute inset-0 cursor-pointer" style={{ zIndex: 1 }} onClick={togglePlay} />

      {/* Center play button when paused */}
      {!playing && ready && (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ zIndex: 2 }}
          onClick={togglePlay}
        >
          <div className="bg-black/40 backdrop-blur-sm rounded-full p-5 hover:bg-black/60 transition-colors">
            <Play className="h-10 w-10 text-white fill-white" />
          </div>
        </div>
      )}

      {/* Controls bar */}
      <div
        className={`absolute bottom-0 left-0 right-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}
        style={{ zIndex: 3, background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)' }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Seek bar */}
        <div className="px-4 pt-4">
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.5}
            value={current}
            onChange={handleSeek}
            className="w-full h-1 cursor-pointer"
            style={{ accentColor: '#fff' }}
          />
        </div>
        {/* Buttons */}
        <div className="flex items-center gap-3 px-4 pb-3 pt-1.5">
          <button onClick={togglePlay} className="text-white hover:text-gray-300 transition-colors">
            {playing
              ? <Pause className="h-5 w-5" />
              : <Play className="h-5 w-5 fill-white" />}
          </button>
          <button onClick={toggleMute} className="text-white hover:text-gray-300 transition-colors">
            {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          </button>
          <span className="text-white/80 text-xs tabular-nums">
            {fmt(current)}{duration > 0 ? ` / ${fmt(duration)}` : ''}
          </span>
          <div className="flex-1" />
          <button onClick={handleFullscreen} className="text-white hover:text-gray-300 transition-colors">
            <Maximize className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
