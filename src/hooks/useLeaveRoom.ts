import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useLeaveRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) =>
      apiFetch(`/v1/rooms/${roomId}/leave`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
