import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { ChallengeDetailResponse } from "../lib/types";

export function useChallengeDetail(challengeId: string) {
  return useQuery<ChallengeDetailResponse>({
    queryKey: ["challenges", challengeId],
    queryFn: () => apiFetch<ChallengeDetailResponse>(`/v1/challenges/${challengeId}`),
    enabled: !!challengeId,
  });
}
