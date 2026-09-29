import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ChallengesResponse, ChallengeItem } from "../lib/types";

export function useChallenges(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<ChallengesResponse>({
    queryKey: ["challenges", filters],
    queryFn: async () => {
      const data = await apiFetch<{ data: Array<Record<string, unknown>> }>(`/v1/challenges${params}`);
      return {
        data: (data.data ?? []).map((c) => mapChallenge(c)),
      };
    },
  });
}

function computeDaysLeft(c: Record<string, unknown>): number {
  if (c.days_left !== undefined && c.days_left !== null) return Number(c.days_left);
  if (c.daysLeft !== undefined && c.daysLeft !== null) return Number(c.daysLeft);
  const endsAt = (c.ends_at ?? c.endsAt) as string | undefined;
  if (endsAt) return Math.max(0, Math.ceil((new Date(endsAt).getTime() - Date.now()) / 86400000));
  if (c.duration_days) return Number(c.duration_days);
  return 0;
}

function mapChallenge(c: Record<string, unknown>): ChallengeItem {
  const dl = computeDaysLeft(c);
  return {
    id: c.id as string,
    name: (c.title ?? c.name) as string,
    house: (c.house ?? "wellness") as import("../lib/constants").HouseId,
    description: c.description as string | undefined,
    metric: (c.metric_type ?? c.metric ?? "") as string,
    type: (c.challenge_type ?? c.type) as string | undefined,
    joined: !!(c.is_participating ?? c.joined),
    participant_count: (c.participant_count ?? c.participants ?? 0) as number,
    participants: (c.participant_count ?? c.participants ?? 0) as number,
    days_left: dl,
    daysLeft: dl,
    points: (c.points_reward ?? c.points ?? 0) as number,
    pointsNum: (c.points_reward ?? c.points ?? 0) as number,
    current: (c.current_value ?? c.current ?? 0) as number,
    target: (c.target_value ?? c.target ?? 0) as number,
    unit: (c.unit ?? "") as string,
    log: [],
    leaderboard: [],
  };
}

export { mapChallenge };
