import { useEffect, useRef, useState } from "react";
import { useDailyContent } from "@/hooks/useDailyContent";
import { useCompleteDaily } from "@/hooks/useCompleteDaily";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP, houseOfToday } from "@/lib/constants";
import { cleanWriteup, getMediaUrl } from "@/lib/utils";
import { ChevronDown, ChevronUp, Play, X, Check, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";

export function VideoOfTheDay() {
  const { member } = useAuthStore();
  const { data: dailyData, isLoading, isError } = useDailyContent();
  const completeDaily = useCompleteDaily(dailyData?.content?.id ?? "");
  const today = houseOfToday();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [done, setDone] = useState(false);
  const [canExpand, setCanExpand] = useState(false);
  const bodyRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (dailyData?.delivery?.completed_at) setDone(true);
  }, [dailyData?.delivery?.completed_at]);

  useEffect(() => {
    const el = bodyRef.current;
    if (!el) return;
    el.style.setProperty("-webkit-line-clamp", "unset");
    const overflows = el.scrollHeight > el.clientHeight + 1;
    el.style.removeProperty("-webkit-line-clamp");
    setCanExpand(overflows);
  }, [dailyData?.content?.body]);

  if (isLoading) {
    return (
      <div className="rounded-3xl bg-[#0C0C0E] border border-white/10 overflow-hidden animate-pulse">
        <div className="aspect-video sm:aspect-[21/9] bg-white/5" />
        <div className="p-6 sm:p-10 space-y-4">
          <div className="h-3 w-28 bg-white/10 rounded" />
          <div className="h-8 w-3/4 bg-white/10 rounded-lg" />
          <div className="h-3 w-full bg-white/5 rounded" />
          <div className="h-12 w-40 bg-white/10 rounded-full" />
        </div>
      </div>
    );
  }

  const c = dailyData?.content ? {
    house: dailyData.content.house ?? "wellness",
    title: dailyData.content.title ?? "",
    body: dailyData.content.body ?? "",
    mediaUrl: dailyData.content.media_r2_key ? getMediaUrl(dailyData.content.media_r2_key) : null,
  } : null;

  const noContent = !!dailyData && !dailyData.content;
  const isVideo = c?.mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(c.mediaUrl) : false;

  const h = c ? (HOUSE_MAP[c.house] ?? HOUSE_MAP.wellness) : HOUSE_MAP[today.id];

  function complete() {
    if (done || completeDaily.isPending) return;
    if (!member) {
      window.location.href = "/login";
      return;
    }
    completeDaily.mutate(undefined, {
      onSuccess: () => {
        setDone(true);
        const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reduced) return;
        confetti({
          particleCount: 80,
          spread: 70,
          origin: { y: 0.7 },
          colors: ["#CCFF3D", "#FFFFFF", h.color],
        });
      },
      onError: (err: any) => {
        setDone(false);
        console.error("Failed to complete daily content:", err);
      },
    });
  }

  return (
    <section className="relative overflow-hidden rounded-3xl bg-[#0C0C0E] text-white border border-white/10 shadow-[0_30px_70px_-30px_rgba(0,0,0,0.55)]">
      <div className="absolute -top-28 right-[-10%] h-72 w-72 rounded-full bg-accent/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-20%] left-[15%] h-56 w-56 rounded-full blur-3xl pointer-events-none" style={{ background: `${h.color}22` }} />
      <div className="absolute right-0 bottom-6 select-none pointer-events-none font-display font-bold text-[18vw] sm:text-[9rem] leading-none text-white/[0.04] tracking-tighter pr-4">
        {c?.title ? "TODAY" : ""}
      </div>

      {mediaOpen && c?.mediaUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setMediaOpen(false)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMediaOpen(false)} className="absolute -top-11 right-0 text-white/80 hover:text-white"><X className="h-6 w-6" /></button>
            {isVideo ? (
              <video src={c.mediaUrl} controls autoPlay className="w-full rounded-2xl max-h-[85vh]" />
            ) : (
              <img src={c.mediaUrl} alt={c.title} className="w-full rounded-2xl max-h-[85vh] object-contain" />
            )}
          </div>
        </div>
      )}

      {c?.mediaUrl && (
        <div className="relative aspect-video sm:aspect-[21/9] group cursor-pointer border-b border-white/10" onClick={() => setMediaOpen(true)}>
          {isVideo ? (
            <video src={c.mediaUrl} className="w-full h-full object-cover" />
          ) : (
            <img src={c.mediaUrl} alt={c.title} className="w-full h-full object-cover" />
          )}
          <div className="absolute inset-0 bg-black/25 flex items-center justify-center transition-colors group-hover:bg-black/10">
            <div className="h-16 w-16 rounded-full btn-accent flex items-center justify-center shadow-2xl transition-transform group-hover:scale-110">
              <Play className="h-7 w-7 ml-0.5" />
            </div>
          </div>
        </div>
      )}

      <div className="relative p-6 sm:p-10 lg:p-12">
        {c ? (
          <>
            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.22em] text-white/70">
                <span className="h-2 w-2 rounded-full" style={{ background: h.color }} />
                {h.name}
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-white/35">Alpha Minds Daily</span>
            </div>

            <h2 className="mt-5 text-display font-semibold text-4xl sm:text-5xl lg:text-6xl tracking-tighter leading-[0.95] max-w-3xl">
              {c.title}
            </h2>

            <p
              ref={bodyRef}
              className={"mt-5 text-white/80 leading-relaxed max-w-2xl" + (expanded ? "" : " line-clamp-2")}
            >
              {cleanWriteup(c.body)}
            </p>
            {canExpand && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="mt-2 text-xs font-bold text-accent uppercase tracking-widest flex items-center gap-1"
              >
                {expanded ? "See less" : "See more"}
                {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              </button>
            )}

            <button
              onClick={complete}
              disabled={done || completeDaily.isPending}
              className="mt-8 inline-flex items-center gap-2 rounded-full btn-accent px-6 py-3 text-sm font-black uppercase tracking-wide transition-transform active:scale-[0.97] disabled:opacity-80"
            >
              {completeDaily.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" /> Completing…
                </>
              ) : done ? (
                <>
                  <Check className="h-4 w-4" /> Marked Complete
                </>
              ) : (
                <>
                  Mark as Complete <span className="opacity-60">· +5</span>
                </>
              )}
            </button>
          </>
        ) : (
          <div className="py-8">
            <p className="text-sm text-white/70">
              {isError ? "Unable to load today's content." : noContent ? "No content available today." : "Sign in to see today's content."}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
