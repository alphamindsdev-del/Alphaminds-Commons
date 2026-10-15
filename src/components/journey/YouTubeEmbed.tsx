import { useEffect, useRef, useState } from "react";
import { ExternalLink, Loader2, AlertTriangle } from "lucide-react";
import { extractYouTubeId, journeyLinkHref } from "@/lib/journeyLinks";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: (() => void) | undefined;
  }
}

const YT_STATE_ENDED = 0;

let ytApiPromise: Promise<any> | null = null;

function loadYouTubeApi(): Promise<any> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const timeout = window.setTimeout(() => reject(new Error("YouTube API timed out")), 10000);
      const previous = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        window.clearTimeout(timeout);
        if (previous) previous();
        resolve(window.YT);
      };
      const script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.onerror = () => {
        window.clearTimeout(timeout);
        reject(new Error("YouTube API failed to load"));
      };
      document.head.appendChild(script);
    });
    // Allow a fresh attempt on the next mount if the first load fails.
    ytApiPromise.catch(() => {
      ytApiPromise = null;
    });
  }
  return ytApiPromise;
}

/**
 * Embedded YouTube player for a journey step.
 *
 * Calls `onWatched` only when the member actually reaches the end of the video
 * (or when the player is genuinely unavailable — removed/private video, blocked
 * embed, offline — in which case the parent can offer a manual completion so
 * the journey never becomes incompletable).
 */
export function YouTubeEmbed({
  url,
  activityId,
  onWatched,
  onUnavailable,
}: {
  url: string;
  activityId: string;
  onWatched: () => void;
  onUnavailable: () => void;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<any>(null);
  const [failed, setFailed] = useState(false);
  const callbacks = useRef({ onWatched, onUnavailable });
  callbacks.current = { onWatched, onUnavailable };

  const videoId = extractYouTubeId(url);

  useEffect(() => {
    if (!videoId || !containerRef.current) {
      setFailed(true);
      callbacks.current.onUnavailable();
      return;
    }
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !containerRef.current) return;
        // YT.Player replaces its target element with the <iframe>, so hand it a
        // freshly created child node instead of anything React manages.
        const mount = document.createElement("div");
        mount.style.height = "100%";
        containerRef.current.appendChild(mount);
        playerRef.current = new YT.Player(mount, {
          videoId,
          width: "100%",
          height: "100%",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1 },
          events: {
            onStateChange: (event: any) => {
              if (event.data === YT_STATE_ENDED) callbacks.current.onWatched();
            },
            onError: () => {
              if (cancelled) return;
              setFailed(true);
              callbacks.current.onUnavailable();
            },
          },
        });
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        callbacks.current.onUnavailable();
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy?.();
      } catch {
        // player already gone
      }
      playerRef.current = null;
    };
  }, [videoId]);

  if (!videoId) {
    return (
      <div className="rounded-xl border border-divider bg-bg-card-white p-4 text-sm text-text-secondary">
        <p>
          This video link could not be read. Use the link below to open it, then mark the step
          complete.
        </p>
        <a
          href={journeyLinkHref(url)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent-dark-green hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open video
        </a>
      </div>
    );
  }

  if (failed) {
    return (
      <div className="rounded-xl border border-divider bg-bg-card-white p-4 text-sm text-text-secondary">
        <p className="flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
          The video could not be loaded here (it may be private or embedding may be disabled).
        </p>
        <a
          href={journeyLinkHref(url)}
          target="_blank"
          rel="noreferrer"
          className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-accent-dark-green hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Watch on YouTube
        </a>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-divider bg-black">
        <div ref={containerRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-xs text-text-secondary">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent-dark-green" />
          Watch until the end to unlock “Complete”
        </span>
        <a
          href={journeyLinkHref(url)}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-accent-dark-green hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> Open on YouTube
        </a>
      </div>
      <span className="sr-only" data-yt-activity={activityId} />
    </div>
  );
}
