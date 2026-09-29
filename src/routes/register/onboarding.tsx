import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, ChevronRight } from "lucide-react";
import { HOUSES, HOUSE_MAP, type HouseId } from "@/lib/constants";
import { useRooms } from "@/hooks/useRooms";
import { useAuthStore } from "@/store/authStore";
import { HouseBadge } from "@/components/common/HouseBadge";

export const Route = createFileRoute("/register/onboarding")({
  head: () => ({ meta: [{ title: "Welcome · AlphaMinds Onboarding" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [primary, setPrimary] = useState<HouseId | null>("wellness");
  const [secondary, setSecondary] = useState<HouseId[]>(["becoming"]);
  const [selectedRooms, setSelectedRooms] = useState<string[]>(["beatlift", "alpha-circle"]);
  const { member: authMember } = useAuthStore();
  const { data: roomsData } = useRooms("global");
  const rooms = (roomsData?.data ?? []).map((r: any) => ({
    ...r, house: r.house as HouseId, joined: r.joined ?? false,
    memberCount: r.member_count ?? 0, lastActivity: r.last_activity ?? "",
    lastPostPreview: r.last_post_preview ?? "", unread: r.unread ?? false,
  }));
  const navigate = useNavigate();

  const availableRooms = useMemo(() => {
    if (!primary) return [];
    return rooms.filter((r: any) => r.house === primary || secondary.includes(r.house)).slice(0, 8);
  }, [primary, secondary]);

  function toggleSecondary(h: HouseId) {
    setSecondary((s) => s.includes(h) ? s.filter((x) => x !== h) : s.length < 2 ? [...s, h] : s);
  }
  function toggleRoom(id: string) {
    setSelectedRooms((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="font-black text-primary text-lg">AlphaMinds</div>
        <div className="text-xs font-semibold text-text-secondary">Step {step} of 3</div>
      </header>
      <div className="px-6 pt-4">
        <div className="max-w-3xl mx-auto grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-1.5 rounded-full bg-subtle overflow-hidden">
              <motion.div className="h-full bg-primary" initial={false} animate={{ width: step >= i ? "100%" : "0%" }} transition={{ duration: 0.4 }} />
            </div>
          ))}
        </div>
      </div>

      <main className="flex-1 p-6 sm:p-10">
        <div className="max-w-3xl mx-auto">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div key="s1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Where are you focusing right now?</h1>
                <p className="text-text-secondary mt-2">Choose your Primary House (required), then up to 2 Secondary Houses.</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-4">
                  {HOUSES.map((h) => {
                    const isPrimary = primary === h.id;
                    const isSecondary = secondary.includes(h.id);
                    const selected = isPrimary || isSecondary;
                    return (
                      <button
                        key={h.id}
                        onClick={() => isPrimary ? toggleSecondary(h.id) : primary ? toggleSecondary(h.id) : setPrimary(h.id)}
                        onDoubleClick={() => setPrimary(h.id)}
                        className="relative text-left rounded-2xl border-2 bg-card p-5 transition-all"
                        style={{ borderColor: selected ? h.color : "var(--border)" }}
                      >
                        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: h.color }} />
                        <div className="flex items-start gap-3">
                          <div className="text-4xl" style={{ color: h.color }}><span className="font-black">{h.name[0]}</span></div>
                          <div className="flex-1">
                            <h3 className="font-bold text-lg text-text-primary">{h.fullName}</h3>
                            <p className="text-sm italic text-text-secondary mt-0.5">{h.tagline}</p>
                            <p className="text-sm text-text-primary mt-2">{h.description}</p>
                          </div>
                        </div>
                        <div className="mt-3 flex items-center justify-between">
                          <button
                            onClick={(e) => { e.stopPropagation(); setPrimary(h.id); }}
                            className="text-xs font-bold uppercase tracking-widest rounded-full px-2.5 py-1"
                            style={{ background: isPrimary ? h.color : "transparent", color: isPrimary ? "white" : h.color, border: `1px solid ${h.color}` }}
                          >
                            {isPrimary ? <>Primary <Check className="h-3 w-3 inline" /></> : "Set Primary"}
                          </button>
                          {isSecondary && <span className="text-xs font-bold" style={{ color: h.color }}>Secondary <Check className="h-3 w-3 inline" /></span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex justify-end">
                  <button disabled={!primary} onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-6 py-3 disabled:opacity-50">Continue <ChevronRight className="h-4 w-4" /></button>
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Choose your Rooms</h1>
                <p className="text-text-secondary mt-2">Rooms are where conversations live. Pick at least one.</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-3">
                  {availableRooms.map((r) => {
                    const sel = selectedRooms.includes(r.id);
                    const h = HOUSE_MAP[r.house as HouseId] ?? HOUSE_MAP.wellness;
                    return (
                      <button key={r.id} onClick={() => toggleRoom(r.id)} className="text-left rounded-2xl border-2 bg-card p-4 transition-all" style={{ borderColor: sel ? h.color : "var(--border)" }}>
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="font-bold text-text-primary">{r.name}</h3>
                          {sel && <Check className="h-5 w-5" style={{ color: h.color }} />}
                        </div>
                        <HouseBadge house={r.house} size="sm" />
                        <p className="text-xs text-text-secondary mt-2">{r.memberCount} members</p>
                        <p className="text-sm text-text-primary mt-2">{r.description}</p>
                      </button>
                    );
                  })}
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-sm font-semibold text-text-secondary">← Back</button>
                  <button disabled={selectedRooms.length === 0} onClick={() => setStep(3)} className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-6 py-3 disabled:opacity-50">Continue <ChevronRight className="h-4 w-4" /></button>
                </div>
              </motion.div>
            )}

            {step === 3 && primary && (
              <motion.div key="s3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-center pt-8">
                <div className="text-7xl mb-4" style={{ color: HOUSE_MAP[primary].color }}><span className="font-black">{HOUSE_MAP[primary].name[0]}</span></div>
                <h1 className="font-black text-3xl sm:text-4xl text-text-primary">You're ready, {authMember?.display_name?.split(" ")[0] ?? "you"}!</h1>
                <p className="mt-3 text-lg" style={{ color: HOUSE_MAP[primary].color }}>
                  Welcome to the <strong>{HOUSE_MAP[primary].fullName}</strong>
                </p>
                <p className="mt-2 text-text-secondary max-w-md mx-auto">{HOUSE_MAP[primary].description}</p>
                <div className="mt-6 flex flex-wrap justify-center gap-2">
                  {selectedRooms.map((id) => {
                    const r = rooms.find((x: any) => x.id === id);
                    if (!r) return null;
                    return <HouseBadge key={id} house={r.house} size="md" />;
                  })}
                </div>
                <button onClick={async () => {
                  try {
                    const { apiFetch } = await import("@/lib/api");
                    await apiFetch("/v1/me/houses", {
                      method: "PUT",
                      body: JSON.stringify({ primary_house: primary, secondary_houses: secondary }),
                    });
                    const { useAuthStore } = await import("@/store/authStore");
                    const store = useAuthStore.getState();
                    if (store.member) {
                      useAuthStore.getState().setSession(store.token!, {
                        ...store.member,
                        primary_house: primary,
                        secondary_houses: secondary,
                      });
                    }
                  } catch {}
                  navigate({ to: "/" });
                }} className="mt-10 inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-8 py-4 text-lg">
                  Enter AlphaMinds Commons
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
