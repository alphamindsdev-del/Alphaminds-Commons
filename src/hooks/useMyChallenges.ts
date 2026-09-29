import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { MyChallengesResponse } from "../lib/types";
import { mapChallenge } from "./useChallenges";

export function useMyChallenges() {
  return useQuery<MyChallengesResponse>({
    queryKey: ["me", "challenges"],
    queryFn: async () => {
      const data = await apiFetch<{
        active: Array<Record<string, unknown>>;
        completed: Array<Record<string, unknown>>;
      }>("/v1/me/challenges");
      return {
        active: (data.active ?? []).map((c) => ({ ...mapChallenge(c), joined: true })),
        completed: (data.completed ?? []).map((c) => ({ ...mapChallenge(c), joined: true })),
      };
    },
  });
}
