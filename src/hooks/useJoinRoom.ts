import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useJoinRoom() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roomId: string) =>
      apiFetch(`/v1/rooms/${roomId}/join`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["rooms"] });
    },
  });
}
