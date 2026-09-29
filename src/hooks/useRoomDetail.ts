import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { RoomItem } from "../lib/types";

export interface RoomDetailResult {
  room: RoomItem;
  isMember: boolean;
}

export function useRoomDetail(roomId: string) {
  return useQuery<RoomDetailResult>({
    queryKey: ["room", roomId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/v1/rooms/${roomId}`);
      const room = (res.room ?? res) as any;
      return {
        room: {
          ...room,
          memberCount: room.member_count ?? room.memberCount ?? 0,
          isMember: room.is_member ?? room.joined ?? false,
        },
        isMember: Boolean(room.is_member ?? room.joined ?? false),
      };
    },
    enabled: !!roomId,
  });
}
