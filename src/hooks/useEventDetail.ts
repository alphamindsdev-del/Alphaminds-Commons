import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { EventDetailResponse } from "../lib/types";

export function useEventDetail(eventId: string) {
  return useQuery<EventDetailResponse>({
    queryKey: ["event", eventId],
    queryFn: () => apiFetch<EventDetailResponse>(`/v1/events/${eventId}`),
    enabled: !!eventId,
  });
}
