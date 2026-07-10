import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useJoinChallenge() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (challengeId: string) =>
      apiFetch(`/v1/challenges/${challengeId}/join`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["challenges"] });
    },
  });
}
