import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getMediaUrl } from "@/lib/utils";
import { Sparkles, Play, X, Calendar, ChevronRight } from "lucide-react";
import type { DailyContentResponse } from "@/lib/types";

export const Route = createFileRoute("/alpha-minds-daily")({
  head: () => ({
    meta: [
      { title: "Alpha Minds Daily · AlphaMinds Commons" },
      { name: "description", content: "Daily content from AlphaMinds Commons." },
    ],
  }),
  component: AlphaMindsDaily,
});

interface PreviousItem {
  id: string;
  title: string;
  body: string;
  house: string;
  media_r2_key: string | null;
  scheduled_date: string | null;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function useTodayContent() {
  return useQuery<DailyContentResponse>({
    queryKey: ["daily-content", "today"],
    queryFn: () => apiFetch<DailyContentResponse>("/v1/daily-content/today"),
    staleTime: 1000 * 60,
    refetchOnMount: true,
    retry: 1,
  });
}

function usePreviousContent() {
  return useQuery<{ data: PreviousItem[] }>({
    queryKey: ["daily-content", "previous"],
    queryFn: () => apiFetch<{ data: PreviousItem[] }>("/v1/daily-content/previous"),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}

function AlphaMindsDaily() {
  const { data: todayData, isLoading: todayLoading } = useTodayContent();
  const { data: prevData, isLoading: prevLoading } = usePreviousContent();
  const [mediaOpen, setMediaOpen] = useState(false);
  const [selectedPrev, setSelectedPrev] = useState<PreviousItem | null>(null);

  const content = todayData?.content;
  const c = content ? {
    title: content.title ?? "",
    body: content.body ?? "",
    mediaUrl: content.media_r2_key ? getMediaUrl(content.media_r2_key) : null,
  } : null;
  const isVideo = c?.mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(c.mediaUrl) : false;
  const previous = prevData?.data ?? [];

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  return (
    <div className="min-h-screen pb-16">
      {/* ─── Masthead ─── */}
      <header className="pt-2 pb-8 mb-10 relative">
        <div className="flex items-end justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-[0_20px_40px_-16px_rgba(20,20,18,0.5)]">
              <Sparkles className="h-6 w-6 text-accent" />
            </div>
            <div>
              <p className="eyebrow mb-1">AlphaMinds Publishing</p>
              <h1 className="font-display font-semibold text-3xl sm:text-5xl tracking-tighter text-text-primary leading-none">
                Alpha Minds <span className="text-primary">Daily</span>
              </h1>
            </div>
          </div>
          <p className="hidden sm:block text-right text-xs font-bold uppercase tracking-widest text-text-secondary">
            {dateStr}
          </p>
        </div>
        <div className="mt-6 h-px bg-border relative">
          <span className="absolute left-0 -top-[2px] h-1 w-24 rounded-full bg-accent" />
        </div>
      </header>

      {/* ─── Today's Edition (Hero) ─── */}
      <section className="mb-14">
        <div className="flex items-center gap-3 mb-5">
          <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white" style={{ background: "var(--accent)" }}>
            <span className="h-1.5 w-1.5 rounded-full bg-white/90 animate-pulse" />
            Today's Edition
          </span>
          <span className="text-[11px] font-bold text-text-secondary">{dateStr}</span>
        </div>

        {todayLoading ? (
          <div className="rounded-3xl bg-card border border-border overflow-hidden animate-pulse">
            <div className="aspect-[16/9] sm:aspect-[21/9] bg-subtle" />
            <div className="p-6 sm:p-8 space-y-4">
              <div className="h-3 w-24 bg-subtle rounded-full" />
              <div className="h-7 w-3/4 bg-subtle rounded-lg" />
              <div className="h-4 w-full bg-subtle rounded" />
              <div className="h-4 w-2/3 bg-subtle rounded" />
            </div>
          </div>
        ) : c ? (
          <div className="group relative rounded-3xl overflow-hidden bg-card border border-border card-shadow">
            {/* ─── Media Area ─── */}
            <div
              className="relative aspect-[16/9] sm:aspect-[21/9] cursor-pointer overflow-hidden"
              onClick={() => c.mediaUrl && setMediaOpen(true)}
            >
              {c.mediaUrl ? (
                isVideo ? (
                  <video src={c.mediaUrl} className="w-full h-full object-cover" />
                ) : (
                  <img src={c.mediaUrl} alt={c.title} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-[1.03]" />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 14%, transparent), color-mix(in srgb, var(--accent) 27%, transparent))" }} />
              )}
              {/* Gradient overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              {isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="h-16 w-16 rounded-full bg-white/90 backdrop-blur flex items-center justify-center shadow-xl transition-transform group-hover:scale-110">
                    <Play className="h-7 w-7 text-black ml-0.5" />
                  </div>
                </div>
              )}
            </div>

            {/* ─── Text Content ─── */}
            <div className="p-6 sm:p-8">
              <h2 className="font-black text-2xl sm:text-3xl text-text-primary leading-tight">
                {c.title}
              </h2>
              <p className="mt-4 text-base sm:text-lg text-text-secondary leading-relaxed">
                {c.body}
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
            <Sparkles className="h-8 w-8 mx-auto text-text-secondary/40" />
            <p className="mt-3 text-text-secondary font-semibold">No content published today</p>
            <p className="text-sm text-text-secondary/60 mt-1">Check back tomorrow for a new edition</p>
          </div>
        )}
      </section>

      {/* ─── Previous Editions ─── */}
      {!prevLoading && previous.length > 0 && (
        <section>
          <div className="flex items-center gap-3 mb-5">
            <span className="eyebrow">Archive</span>
            <span className="h-px flex-1 bg-border" />
            <span className="text-[11px] font-bold text-text-secondary">· {previous.length}</span>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {previous.map((item, i) => {
              const mediaUrl = item.media_r2_key ? getMediaUrl(item.media_r2_key) : null;
              const vid = mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(mediaUrl) : false;

              return (
                <button
                  key={item.id}
                  onClick={() => setSelectedPrev(item)}
                  className="group relative text-left rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/20 hover:shadow-lg transition-all duration-300 card-shadow"
                >
                  <div className="aspect-[16/10] relative bg-subtle overflow-hidden">
                    {mediaUrl ? (
                      vid ? (
                        <video src={mediaUrl} className="w-full h-full object-cover" muted />
                      ) : (
                        <img src={mediaUrl} alt={item.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--accent) 9%, transparent), color-mix(in srgb, var(--accent) 19%, transparent))" }}>
                        <Calendar className="h-8 w-8" style={{ color: "var(--accent)" }} />
                      </div>
                    )}
                    {vid && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/20">
                        <div className="h-10 w-10 rounded-full bg-white/80 flex items-center justify-center">
                          <Play className="h-5 w-5 text-black ml-0.5" />
                        </div>
                      </div>
                    )}
                    {/* Date badge */}
                    <div className="absolute top-3 left-3">
                      <span className="text-[10px] font-bold text-white bg-black/50 backdrop-blur rounded-full px-2.5 py-1 leading-none">
                        {i === 0 ? "Yesterday" : item.scheduled_date ? formatDate(item.scheduled_date) : ""}
                      </span>
                    </div>
                  </div>
                  <div className="p-4 space-y-2">
                    <p className="text-sm font-semibold text-text-primary leading-snug line-clamp-2">{item.title}</p>
                    <p className="text-xs text-text-secondary leading-relaxed line-clamp-2">{item.body}</p>
                  </div>
                  <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-4 w-4 text-text-secondary" />
                  </div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ─── Fullscreen Media Modal ─── */}
      {mediaOpen && c?.mediaUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4" onClick={() => setMediaOpen(false)}>
          <div className="relative max-w-5xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setMediaOpen(false)} className="absolute -top-12 right-0 text-white/60 hover:text-white transition-colors">
              <X className="h-7 w-7" />
            </button>
            {isVideo ? (
              <video src={c.mediaUrl} controls autoPlay className="w-full rounded-2xl max-h-[85vh]" />
            ) : (
              <img src={c.mediaUrl} alt={c.title} className="w-full rounded-2xl max-h-[85vh] object-contain" />
            )}
          </div>
        </div>
      )}

      {/* ─── Previous Item Detail Modal ─── */}
      {selectedPrev && (() => {
        const mediaUrl = selectedPrev.media_r2_key ? getMediaUrl(selectedPrev.media_r2_key) : null;
        const vid = mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(mediaUrl) : false;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedPrev(null)}>
            <div className="relative max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => setSelectedPrev(null)} className="fixed top-4 right-4 z-10 h-10 w-10 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white/80 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
              <div className="rounded-2xl bg-card overflow-hidden">
                {mediaUrl && (
                  vid ? (
                    <video src={mediaUrl} controls autoPlay className="w-full max-h-[60vh] object-contain bg-black" />
                  ) : (
                    <img src={mediaUrl} alt={selectedPrev.title} className="w-full max-h-[60vh] object-contain bg-black" />
                  )
                )}
                <div className="p-6 sm:p-8">
                  <div className="flex items-center gap-3 mb-3">
                    {selectedPrev.scheduled_date && (
                      <span className="text-[10px] text-text-secondary">{previous[0]?.id === selectedPrev.id ? "Yesterday" : formatDate(selectedPrev.scheduled_date)}</span>
                    )}
                  </div>
                  <h3 className="font-black text-2xl text-text-primary leading-tight">{selectedPrev.title}</h3>
                  <p className="mt-4 text-base text-text-secondary leading-relaxed">{selectedPrev.body}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
