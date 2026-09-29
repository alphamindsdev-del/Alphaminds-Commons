import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useLogProgress(challengeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch(`/v1/challenges/${challengeId}/log`, {
        method: "POST",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "challenges"] });
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
    },
  });
}
