import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { RoomsResponse } from "../lib/types";

export function useRooms(chapterId: string, filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<RoomsResponse>({
    queryKey: ["rooms", chapterId, filters],
    queryFn: () => apiFetch<RoomsResponse>(`/v1/chapters/${chapterId}/rooms${params}`),
    enabled: !!chapterId,
  });
}
