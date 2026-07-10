import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { RoomDetailResponse } from "../lib/types";

export function useRoomDetail(roomId: string) {
  return useQuery<RoomDetailResponse>({
    queryKey: ["room", roomId],
    queryFn: () => apiFetch<RoomDetailResponse>(`/v1/rooms/${roomId}`),
    enabled: !!roomId,
  });
}
