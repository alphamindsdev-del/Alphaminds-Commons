import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { queryClient } from "../lib/queryClient";

export function useRsvp(eventId: string) {
  return useMutation({
    mutationFn: (status: string) =>
      apiFetch(`/v1/events/${eventId}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["event", eventId] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
    },
  });
}
