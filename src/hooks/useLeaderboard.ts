import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { LeaderboardResponse } from "../lib/types";

export function useLeaderboard(chapterId: string, filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<LeaderboardResponse>({
    queryKey: ["leaderboard", chapterId, filters],
    queryFn: () => apiFetch<LeaderboardResponse>(`/v1/chapters/${chapterId}/leaderboard${params}`),
    enabled: !!chapterId,
  });
}
