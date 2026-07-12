import { motion } from "framer-motion";
import { Check, Sparkles } from "lucide-react";
import { useState } from "react";
import confetti from "canvas-confetti";
import { useDailyContent } from "@/hooks/useDailyContent";
import { HOUSE_MAP } from "@/lib/constants";
import { cleanWriteup } from "@/lib/utils";

export function DailyContentCard() {
  const { data: dailyData, isLoading } = useDailyContent();
  const c = dailyData?.content ? {
    day: dailyData.content.day_of_week ?? "Monday",
    house: dailyData.content.house ?? "wellness",
    badge: dailyData.content.content_type ?? "Daily Practice",
    title: dailyData.content.title ?? "",
    body: dailyData.content.body ?? "",
  } : null;
  const h = c ? HOUSE_MAP[c.house] : HOUSE_MAP["wellness"];
  const [done, setDone] = useState(false);

  if (isLoading || !c) return (
    <div className="relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white animate-pulse" style={{ background: "radial-gradient(120% 100% at 0% 0%, #28555e 0%, #28555edd 40%, #1e3f47 100%)" }}>
      <div className="space-y-4">
        <div className="h-6 w-48 bg-white/20 rounded-full" />
        <div className="h-10 w-3/4 bg-white/20 rounded-lg" />
        <div className="h-4 w-full bg-white/10 rounded-lg" />
        <div className="h-4 w-2/3 bg-white/10 rounded-lg" />
        <div className="h-12 w-36 bg-white/20 rounded-xl" />
      </div>
    </div>
  );

  function complete() {
    if (done) return;
    setDone(true);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) return;
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 },
      colors: [h.color, "#4ECDC4", "#28555e", "#ffffff"],
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white"
      style={{
        background: `radial-gradient(120% 100% at 0% 0%, ${h.color} 0%, ${h.color}dd 40%, #1e3f47 100%)`,
      }}
    >
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: h.color }} />
      <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full opacity-20 blur-3xl bg-white" />

      <div className="relative">
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 backdrop-blur px-3 py-1 text-xs font-bold uppercase tracking-widest">
            <span className="text-base">{h.emoji}</span> {c.day} · {h.name}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-white/25 backdrop-blur px-3 py-1 text-xs font-bold uppercase tracking-widest">
            <Sparkles className="h-3 w-3" /> {c.badge}
          </span>
        </div>

        <h2 className="font-black text-3xl sm:text-4xl lg:text-5xl leading-tight mb-4 max-w-2xl">
          {c.title}
        </h2>
        <p className="text-base sm:text-lg text-white/90 leading-relaxed max-w-2xl mb-8">
          {cleanWriteup(c.body)}
        </p>

        <button
          onClick={complete}
          disabled={done}
          className="inline-flex items-center gap-2 rounded-xl bg-white text-primary-dark px-5 py-3 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-90"
        >
          {done ? (
            <>
              <Check className="h-4 w-4" /> Marked Complete · +10 pts
            </>
          ) : (
            <>
              Mark as Complete <Check className="h-4 w-4" />
            </>
          )}
        </button>
      </div>
    </motion.article>
  );
}
