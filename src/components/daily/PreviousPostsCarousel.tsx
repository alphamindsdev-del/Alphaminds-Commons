import { useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { usePreviousDailyContent, type PreviousDailyItem } from "@/hooks/usePreviousDailyContent";
import { getMediaUrl } from "@/lib/utils";
import { HOUSE_MAP, type HouseId } from "@/lib/constants";
import { X, ChevronDown, ChevronRight, Play, Calendar } from "lucide-react";

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function Card({ item, index, onSelect }: { item: PreviousDailyItem; index: number; onSelect: (item: PreviousDailyItem) => void }) {
  const h = HOUSE_MAP[item.house as HouseId] ?? HOUSE_MAP.wellness;
  const mediaUrl = item.media_r2_key ? getMediaUrl(item.media_r2_key) : null;
  const isVideo = mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(mediaUrl) : false;

  return (
    <button
      onClick={() => onSelect(item)}
      className="flex-shrink-0 w-44 sm:w-48 rounded-xl border border-border bg-card overflow-hidden text-left hover:border-primary/30 transition-colors group"
    >
      <div className="aspect-video relative bg-subtle overflow-hidden">
        {mediaUrl ? (
          isVideo ? (
            <video src={mediaUrl} className="w-full h-full object-cover" muted />
          ) : (
            <img src={mediaUrl} alt={item.title} className="w-full h-full object-cover" />
          )
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: `linear-gradient(135deg, ${h.color}22, ${h.color}44)` }}>
            <Calendar className="h-6 w-6" style={{ color: h.color }} />
          </div>
        )}
        {isVideo && (
          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30">
            <div className="h-8 w-8 rounded-full bg-white/80 flex items-center justify-center">
              <Play className="h-4 w-4 text-text-primary ml-0.5" />
            </div>
          </div>
        )}
      </div>
      <div className="p-2.5 space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: h.color }}>
          {h.name}
        </p>
        <p className="text-xs font-semibold text-text-primary leading-snug line-clamp-2">
          {item.title}
        </p>
        <p className="text-[10px] text-text-secondary">
          {index === 0 ? "Yesterday" : formatDate(item.scheduled_date)}
        </p>
      </div>
    </button>
  );
}

export function PreviousPostsCarousel() {
  const { data, isLoading, isError } = usePreviousDailyContent();
  const [emblaRef] = useEmblaCarousel({ align: "start", dragFree: true });
  const [collapsed, setCollapsed] = useState(false);
  const [selectedItem, setSelectedItem] = useState<PreviousDailyItem | null>(null);

  const items = data?.data ?? [];
  const hasSeedOnly = items.length > 0 && items.every((i) => !i.scheduled_date);

  if (isLoading || isError || items.length === 0) return null;

  return (
    <section>
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary transition-colors"
      >
        {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        Previous Posts ({items.length})
      </button>

      {!collapsed && (
        <div className="mt-3 overflow-hidden" ref={emblaRef}>
          <div className="flex gap-3">
            {items.map((item, i) => (
              <Card key={item.id} item={item} index={i} onSelect={setSelectedItem} />
            ))}
          </div>
        </div>
      )}

      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setSelectedItem(null)}>
          <div className="relative max-w-4xl w-full max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            <button onClick={() => setSelectedItem(null)} className="absolute -top-10 right-0 text-white/80 hover:text-white">
              <X className="h-6 w-6" />
            </button>
            <div className="rounded-2xl bg-card overflow-hidden">
              {(() => {
                const mediaUrl = selectedItem.media_r2_key ? getMediaUrl(selectedItem.media_r2_key) : null;
                const isVideo = mediaUrl ? /\.(mp4|webm|mov|avi|mkv|ogv|ogg|3gp|3gpp|mpeg|mpg)$/i.test(mediaUrl) : false;
                return mediaUrl ? (
                  isVideo ? (
                    <video src={mediaUrl} controls autoPlay className="w-full max-h-[70vh] object-contain bg-black" />
                  ) : (
                    <img src={mediaUrl} alt={selectedItem.title} className="w-full max-h-[70vh] object-contain bg-black" />
                  )
                ) : null;
              })()}
              <div className="p-5">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: HOUSE_MAP[selectedItem.house as HouseId]?.color ?? "#10B981" }}>
                    {HOUSE_MAP[selectedItem.house as HouseId]?.name ?? selectedItem.house}
                  </span>
                  {selectedItem.scheduled_date && (
                    <span className="text-[10px] text-text-secondary">· {items[0]?.id === selectedItem.id ? "Yesterday" : formatDate(selectedItem.scheduled_date)}</span>
                  )}
                </div>
                <h3 className="font-bold text-lg text-text-primary">{selectedItem.title}</h3>
                <p className="mt-2 text-sm text-text-secondary leading-relaxed">{selectedItem.body}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
