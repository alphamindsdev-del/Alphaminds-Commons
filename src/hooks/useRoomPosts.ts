import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostsResponse } from "../lib/types";
import { mapPost } from "../lib/utils";

export function useRoomPosts(roomId: string, limit = 20) {
  return useInfiniteQuery<PostsResponse>({
    queryKey: ["posts", roomId],
    queryFn: async ({ pageParam }) => {
      const res = await apiFetch<any>(`/v1/rooms/${roomId}/posts?cursor=${pageParam}&limit=${limit}`);
      return {
        ...res,
        data: (res.data ?? []).map(mapPost),
        nextCursor: res.pagination?.next_cursor ?? res.next_cursor ?? null,
      };
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!roomId,
  });
}
