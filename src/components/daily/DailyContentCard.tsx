import { motion } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import confetti from "canvas-confetti";
import { useDailyContent } from "@/hooks/useDailyContent";
import { HOUSE_MAP } from "@/lib/constants";
import { cleanWriteup } from "@/lib/utils";

export function DailyContentCard() {
  const { data: dailyData, isLoading } = useDailyContent();
  const c = dailyData?.content ? {
    house: dailyData.content.house ?? "wellness",
    title: dailyData.content.title ?? "",
    body: dailyData.content.body ?? "",
  } : null;
  const h = c ? (HOUSE_MAP[c.house] ?? HOUSE_MAP.wellness) : HOUSE_MAP.wellness;
  const [done, setDone] = useState(false);

  if (isLoading || !c) return (
    <div className="relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white animate-pulse" style={{ background: "radial-gradient(120% 100% at 0% 0%, var(--primary) 0%, color-mix(in srgb, var(--primary) 87%, transparent) 40%, var(--primary-dark) 100%)" }}>
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
      colors: [h.color, "var(--accent)", "var(--primary)", "#ffffff"],
    });
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative overflow-hidden rounded-3xl p-7 sm:p-10 text-white"
      style={{
        background: `radial-gradient(120% 100% at 0% 0%, ${h.color} 0%, ${h.color}dd 40%, var(--primary-dark) 100%)`,
      }}
    >
      <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full opacity-30 blur-3xl" style={{ background: h.color }} />
      <div className="absolute -bottom-32 -left-10 h-72 w-72 rounded-full opacity-20 blur-3xl bg-white" />

      <div className="relative">
        <div className="mb-3">
          <span className="text-sm font-semibold text-white/80">{h.name}</span>
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
          className="inline-flex items-center gap-2 rounded-xl bg-white text-[#141412] px-5 py-3 text-sm font-bold transition-transform active:scale-[0.97] disabled:opacity-90"
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
