import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ChallengesResponse } from "../lib/types";

export function useChallenges(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<ChallengesResponse>({
    queryKey: ["challenges", filters],
    queryFn: () => apiFetch<ChallengesResponse>(`/v1/challenges${params}`),
  });
}
