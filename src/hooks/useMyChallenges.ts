import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { MyChallengesResponse } from "../lib/types";

export function useMyChallenges() {
  return useQuery<MyChallengesResponse>({
    queryKey: ["me", "challenges"],
    queryFn: () => apiFetch<MyChallengesResponse>("/v1/me/challenges"),
  });
}
