import { Link } from "@tanstack/react-router";
import type { HouseId } from "@/lib/constants";

interface Challenge {
  id: string;
  house: HouseId;
  name: string;
  metric: string;
  type: string;
  joined: boolean;
  current: number;
  target: number;
  description: string;
  participants: number;
  daysLeft: number;
  points: number;
}
import { ProgressBar } from "@/components/common/ProgressBar";
import { useJoinChallenge } from "@/hooks/useJoinChallenge";
import { useAuthStore } from "@/store/authStore";
import { toast } from "@/components/common/Toast";
import { Users, Clock, Flame, Loader2, CheckCircle2, ArrowRight, Target } from "lucide-react";

export function ChallengeCard({ challenge, compact = false }: { challenge: Challenge; compact?: boolean }) {
  const accent = "var(--accent)";
  const Icon = Target;
  const pct = challenge.target > 0 ? Math.min(100, Math.round((challenge.current / challenge.target) * 100)) : 0;
  const joinChallenge = useJoinChallenge();
  const { member } = useAuthStore();
  return (
    <Link
      to="/challenges/$challengeId"
      params={{ challengeId: challenge.id }}
      className="group relative flex flex-col overflow-hidden rounded-3xl border border-border bg-card card-shadow card-glow card-hover"
    >
      <div className="relative">
        <div
          className="h-1.5 w-full"
          style={{ background: `linear-gradient(90deg, ${accent}, color-mix(in srgb, var(--accent) 40%, transparent) 65%, transparent)` }}
        />
        <Icon
          aria-hidden
          className="pointer-events-none absolute -right-4 -top-2 h-24 w-24 rotate-12 opacity-[0.07] transition-transform duration-500 group-hover:rotate-6 group-hover:scale-110"
          style={{ color: accent }}
        />
      </div>

      <div className="flex flex-1 flex-col p-5 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <span
              className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border"
              style={{ background: "color-mix(in srgb, var(--accent) 8%, transparent)", borderColor: "color-mix(in srgb, var(--accent) 19%, transparent)", color: accent }}
            >
              <Icon className="h-6 w-6" />
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-text-secondary">{challenge.metric}</p>
              <h3 className="text-display mt-1 text-xl font-semibold leading-tight tracking-tight text-text-primary">
                {challenge.name}
              </h3>
            </div>
          </div>
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-subtle px-2.5 py-1 text-xs font-black text-text-primary">
            <Flame className="h-3.5 w-3.5" style={{ color: accent }} />
            {challenge.points} pts
          </span>
        </div>

        <div className="mt-4 flex-1">
          {challenge.joined ? (
            <div>
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-text-secondary">{pct}% complete</span>
                {!compact && (
                  <span className="font-bold tabular-nums" style={{ color: accent }}>
                    {challenge.current.toLocaleString()} / {challenge.target.toLocaleString()}
                  </span>
                )}
              </div>
              <ProgressBar value={challenge.current} max={challenge.target} color={accent} showValue={false} />
            </div>
          ) : (
            !compact && <p className="text-sm leading-relaxed text-text-secondary line-clamp-2">{challenge.description}</p>
          )}
        </div>

        <div className="mt-4 flex items-center gap-2 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1">
            <Users className="h-3.5 w-3.5" />
            {challenge.participants.toLocaleString()}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1">
            <Clock className="h-3.5 w-3.5" />
            {challenge.daysLeft}d left
          </span>
          {challenge.joined && (
            <span className="ml-auto inline-flex items-center gap-1 font-bold" style={{ color: accent }}>
              <CheckCircle2 className="h-3.5 w-3.5" />
              Joined
            </span>
          )}
        </div>

        <button
          onClick={(e) => {
            if (challenge.joined) return;
            e.preventDefault();
            e.stopPropagation();
            if (!member) {
              window.location.href = "/login";
              return;
            }
            joinChallenge.mutate(challenge.id, {
              onError: (err: any) => toast.error(err.message ?? "Failed to join"),
            });
          }}
          disabled={joinChallenge.isPending}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-black uppercase tracking-wider transition-all hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
          style={
            challenge.joined
              ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: accent }
              : { background: accent, color: "#fff" }
          }
        >
          {joinChallenge.isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Joining…
            </>
          ) : challenge.joined ? (
            <>
              Log Progress
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </>
          ) : (
            "Join Challenge"
          )}
        </button>
      </div>
    </Link>
  );
}
