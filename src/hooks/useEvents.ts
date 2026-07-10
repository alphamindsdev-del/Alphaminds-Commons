import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { EventsResponse } from "../lib/types";

export function useEvents(chapterId: string, filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<EventsResponse>({
    queryKey: ["events", chapterId, filters],
    queryFn: () => apiFetch<EventsResponse>(`/v1/chapters/${chapterId}/events${params}`),
    enabled: !!chapterId,
  });
}
