import { createFileRoute, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useChallengeDetail } from "@/hooks/useChallengeDetail";
import { useLogProgress } from "@/hooks/useLogProgress";
import { useJoinChallenge } from "@/hooks/useJoinChallenge";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP, type HouseId } from "@/lib/constants";
import { HouseBadge } from "@/components/common/HouseBadge";
import { CircularProgress } from "@/components/common/CircularProgress";
import { Avatar } from "@/components/common/Avatar";
import { Modal } from "@/components/common/Modal";
import { toast } from "@/components/common/Toast";
import { Clock, Sparkles, Users, Loader2 } from "lucide-react";

export const Route = createFileRoute("/challenges/$challengeId")({
  loader: async ({ params }) => params,
  head: () => ({
    meta: [{ title: `Challenge · AlphaMinds` }],
  }),
  component: ChallengeDetail,
});

function ChallengeDetail() {
  const { challengeId } = Route.useParams();
  const { data: challengeData, isLoading } = useChallengeDetail(challengeId);
  const logProgress = useLogProgress(challengeId);
  const joinChallenge = useJoinChallenge();
  const { member: authMember } = useAuthStore();
  const [open, setOpen] = useState(false);
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  const c = challengeData ? {
    id: challengeData.id, name: challengeData.name, house: challengeData.house,
    description: challengeData.description ?? "",
    joined: challengeData.joined ?? false,
    participants: challengeData.participant_count ?? 0, daysLeft: challengeData.days_left ?? 0,
    points: challengeData.points ?? 0, current: challengeData.current ?? 0,
    target: challengeData.target ?? 0, unit: challengeData.unit ?? "",
    metric: challengeData.metric ?? "", log: challengeData.log ?? [],
  } : null;
  if (!c) {
    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const h = HOUSE_MAP[c.house] ?? HOUSE_MAP.wellness;

  const me = authMember ? { name: authMember.display_name, username: authMember.username, primaryHouse: authMember.primary_house, id: authMember.id } : null;
  const leaderboard = (challengeData?.leaderboard ?? []).slice(0, 5).map((m: any, i: number) => ({ m: { name: m.display_name ?? m.name, username: m.username, primaryHouse: (m.primary_house ?? "wellness") as HouseId, id: m.id }, rank: i + 1, value: m.value ?? 5000 - i * 600 }));

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 p-6 sm:p-10 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}88, var(--primary-dark))` }}>
        <span className="absolute -top-10 -right-4 font-display font-bold text-[12rem] sm:text-[16rem] leading-none text-white/[0.09] tracking-tighter select-none pointer-events-none">
          {c.name.charAt(0).toUpperCase()}
        </span>
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full blur-3xl opacity-30 bg-white" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl opacity-20 bg-accent" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <HouseBadge house={c.house} />
            <span className="inline-flex items-center gap-1 rounded-full bg-white/20 backdrop-blur px-3 py-1 text-xs font-black"><Sparkles className="h-3 w-3" /> {c.points} pts</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-black/25 backdrop-blur px-3 py-1 text-xs font-black"><Users className="h-3 w-3" /> {c.participants.toLocaleString()}</span>
          </div>
          <h1 className="text-display font-semibold text-4xl sm:text-6xl tracking-tighter leading-[0.95]">{c.name}</h1>
          <p className="mt-3 text-white/90">{c.metric} · {c.daysLeft} days left</p>
        </div>
      </div>

      {!c.joined && (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 text-center card-shadow">
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${h.color}, transparent)` }} />
          <h2 className="text-display font-semibold text-2xl tracking-tighter">Ready to take this on?</h2>
          <p className="text-text-secondary text-sm mt-2 max-w-md mx-auto">Commit to {c.metric.toLowerCase()} and log your progress daily. Completing the challenge earns you <span className="font-black" style={{ color: h.color }}>{c.points} points</span>.</p>
          <button
            onClick={() => joinChallenge.mutate(challengeId, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["challenges", challengeId] });
                queryClient.invalidateQueries({ queryKey: ["challenges"] });
                toast.success("Challenge joined!");
              },
              onError: (err: any) => toast.error(err.message ?? "Failed to join challenge"),
            })}
            disabled={joinChallenge.isPending}
            className="mt-5 rounded-xl btn-primary font-bold px-8 py-2.5 disabled:opacity-60"
          >
            {joinChallenge.isPending ? <><Loader2 className="h-4 w-4 inline animate-spin" /> Joining…</> : "Join Challenge"}
          </button>
        </section>
      )}

      {c.joined && (
        <section className="relative overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8 card-shadow">
          <div className="absolute inset-x-0 top-0 h-1" style={{ background: `linear-gradient(90deg, ${h.color}, transparent)` }} />
          <h2 className="text-display font-semibold text-2xl tracking-tighter mb-5">My Progress</h2>
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <CircularProgress value={c.current} max={c.target} size={140} stroke={12} color={h.color}>
              <div className="text-center">
                <div className="text-2xl font-black" style={{ color: h.color }}>{Math.round((c.current / c.target) * 100)}%</div>
                <div className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">Today</div>
              </div>
            </CircularProgress>
            <div className="flex-1">
              <p className="font-black text-3xl text-text-primary">{c.current.toLocaleString()} <span className="text-text-secondary text-lg font-bold">/ {c.target.toLocaleString()} {c.unit}</span></p>
              <p className="text-text-secondary text-sm mt-1">Keep going — small consistent steps win this.</p>
              <button onClick={() => setOpen(true)} className="mt-4 rounded-xl btn-primary font-bold px-6 py-2.5">Log Progress</button>
            </div>
          </div>
          {c.log.length > 0 && (
            <div className="mt-6 border-t border-border pt-4">
              <p className="eyebrow mb-3">Recent Activity</p>
              <ul className="space-y-2">
                {c.log.map((e, i) => (
                  <li key={i} className="flex items-center justify-between text-sm">
                    <div><span className="font-bold">{e.date}</span> <span className="text-text-secondary">· {e.note}</span></div>
                    <span className="font-bold tabular-nums" style={{ color: h.color }}>{e.value.toLocaleString()} {c.unit}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section className="rounded-3xl border border-border bg-card p-6 sm:p-8 card-shadow">
        <h2 className="text-display font-semibold text-2xl tracking-tighter mb-5">Leaderboard</h2>
        <ul className="space-y-3">
          {leaderboard.map(({ m, rank, value }) => {
            const ch = HOUSE_MAP[m.primaryHouse] ?? HOUSE_MAP.wellness;
            return (
              <li key={m.id} className="flex items-center gap-3">
                <span className="w-7 text-center font-black text-lg text-text-secondary/60">{rank}</span>
                <Avatar name={m.name} size="sm" color={ch.color} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm truncate">{m.name}</p>
                  <p className="text-xs text-text-secondary truncate">@{m.username}</p>
                </div>
                <span className="font-black tabular-nums text-sm" style={{ color: h.color }}>{value.toLocaleString()}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-2">About this challenge</h2>
        <p className="text-text-primary leading-relaxed">{c.description}</p>
        <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {c.participants.toLocaleString()} participants</span>
          <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {c.daysLeft} days left</span>
        </div>
      </section>

      <Modal open={open} onClose={() => setOpen(false)} title="Log Progress">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Value ({c.unit})</label>
            <input type="number" value={val} onChange={(e) => setVal(e.target.value)} placeholder="e.g. 5400" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
          </div>
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Note (optional)</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} placeholder="How did it feel?" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3" />
          </div>
          <button
            onClick={() => {
              const value = Number(val);
              if (!value || value <= 0) {
                toast.error("Enter a value to log");
                return;
              }
              logProgress.mutate(
                { value, note: note.trim() || undefined, logged_date: new Date().toISOString().slice(0, 10) },
                {
                  onSuccess: (res: any) => {
                    queryClient.invalidateQueries({ queryKey: ["challenges", challengeId] });
                    queryClient.invalidateQueries({ queryKey: ["me", "challenges"] });
                    queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
                    toast.success(res?.completed ? `Challenge complete! +${c.points} pts` : "Progress logged");
                    setOpen(false);
                    setVal("");
                    setNote("");
                  },
                  onError: (err: any) => toast.error(err.message ?? "Failed to log progress"),
                }
              );
            }}
            disabled={logProgress.isPending}
            className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 disabled:opacity-60"
          >
            {logProgress.isPending ? <><Loader2 className="h-4 w-4 inline animate-spin" /> Saving…</> : "Save"}
          </button>
        </div>
      </Modal>
    </div>
  );
}
