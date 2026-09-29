import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useCompleteDaily(contentId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch(`/v1/daily-content/${contentId}/complete`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["daily-content", "today"] });
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
    },
  });
}
