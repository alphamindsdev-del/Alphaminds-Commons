import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useRooms } from "@/hooks/useRooms";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/register/onboarding")({
  head: () => ({ meta: [{ title: "Welcome · AlphaMinds Onboarding" }] }),
  component: OnboardingPage,
});

function OnboardingPage() {
  const [step, setStep] = useState(1);
  const [selectedRooms, setSelectedRooms] = useState<string[]>([]);
  const { member: authMember } = useAuthStore();
  const { data: roomsData } = useRooms("global");
  const rooms = (roomsData?.data ?? []).map((r: any) => ({
    ...r,
    memberCount: r.member_count ?? 0,
    lastActivity: r.last_activity ?? "",
    description: r.description ?? "",
  }));
  const navigate = useNavigate();

  const allRooms = useMemo(() => rooms, [rooms]);

  function toggleRoom(id: string) {
    setSelectedRooms((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="px-6 py-5 flex items-center justify-between border-b border-border">
        <div className="font-black text-primary text-lg">AlphaMinds</div>
        <div className="text-xs font-semibold text-text-secondary">Step {step} of 2</div>
      </header>
      <div className="px-6 pt-4">
        <div className="max-w-3xl mx-auto grid grid-cols-2 gap-2">
          {[1, 2].map((i) => (
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
                <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Welcome to AlphaMinds!</h1>
                <p className="text-text-secondary mt-2">Let&apos;s get you set up.</p>
                <div className="mt-8 flex justify-end">
                  <button onClick={() => setStep(2)} className="btn-primary">
                    Let&apos;s go <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </motion.div>
            )}
            {step === 2 && (
              <motion.div key="s2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Choose your Rooms</h1>
                <p className="text-text-secondary mt-2">Rooms are where conversations live. Pick at least one.</p>
                <div className="mt-8 grid sm:grid-cols-2 gap-3">
                  {allRooms.length === 0 ? (
                    <div className="col-span-full text-center py-8 text-muted-foreground">Loading rooms...</div>
                  ) : (
                    allRooms.map((r) => {
                      const sel = selectedRooms.includes(r.id);
                      return (
                        <button key={r.id} onClick={() => toggleRoom(r.id)} className="text-left rounded-2xl border-2 bg-card p-4 transition-all hover:border-primary">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-bold text-text-primary">{r.name}</h3>
                          </div>
                          <p className="text-xs text-text-secondary mb-2">{r.memberCount} members</p>
                          <p className="text-sm text-text-primary">{r.description}</p>
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="mt-8">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Selected</h3>
                  <div className="flex flex-wrap gap-2">
                    {selectedRooms.map((id) => {
                      const r = allRooms.find((room: any) => room.id === id);
                      return r ? (
                        <button key={id} onClick={() => toggleRoom(id)} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-subtle text-sm font-semibold text-text-primary hover:bg-border">
                          <span>#{r.name}</span>
                          <span className="text-muted-foreground hover:text-destructive">&times;</span>
                        </button>
                      ) : null;
                    })}
                  </div>
                </div>
                <div className="mt-8 flex justify-between">
                  <button onClick={() => setStep(1)} className="text-sm font-semibold text-text-secondary">← Back</button>
                  <button
                    disabled={selectedRooms.length === 0}
                    onClick={async () => {
                      try {
                        const { apiFetch } = await import("@/lib/api");
                        await apiFetch("/v1/me/rooms", {
                          method: "PUT",
                          body: JSON.stringify({ room_ids: selectedRooms }),
                        });
                      } catch (e) {
                        console.error(e);
                      }
                      navigate({ to: "/" });
                    }}
                    className="btn-primary"
                  >
                    Complete Setup
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}