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
import { HOUSE_MAP } from "@/lib/constants";
import { HouseBadge } from "@/components/common/HouseBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { Users, Clock, Sparkles } from "lucide-react";

export function ChallengeCard({ challenge, compact = false }: { challenge: Challenge; compact?: boolean }) {
  const h = HOUSE_MAP[challenge.house];
  return (
    <Link
      to="/challenges/$challengeId"
      params={{ challengeId: challenge.id }}
      className="block rounded-2xl border border-border bg-card p-5 card-shadow card-hover"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="font-bold text-text-primary truncate">{challenge.name}</h3>
          <p className="text-xs text-text-secondary mt-0.5">{challenge.metric} · {challenge.type}</p>
        </div>
        <HouseBadge house={challenge.house} size="sm" />
      </div>
      {challenge.joined ? (
        <ProgressBar value={challenge.current} max={challenge.target} color={h.color} showValue />
      ) : (
        !compact && <p className="text-sm text-text-secondary line-clamp-2 mb-3">{challenge.description}</p>
      )}
      <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
        <span className="inline-flex items-center gap-1"><Users className="h-3 w-3" /> {challenge.participants.toLocaleString()}</span>
        <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {challenge.daysLeft}d left</span>
        <span className="inline-flex items-center gap-1 font-bold" style={{ color: h.color }}>
          <Sparkles className="h-3 w-3" /> {challenge.points} pts
        </span>
      </div>
      <button
        className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold"
        style={
          challenge.joined
            ? { background: `${h.color}15`, color: h.color }
            : { background: "var(--primary)", color: "white" }
        }
      >
        {challenge.joined ? "Log Progress" : "Join Challenge"}
      </button>
    </Link>
  );
}
