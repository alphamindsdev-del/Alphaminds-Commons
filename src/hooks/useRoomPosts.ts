import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostsResponse } from "../lib/types";

export function useRoomPosts(roomId: string, limit = 20) {
  return useInfiniteQuery<PostsResponse>({
    queryKey: ["posts", roomId],
    queryFn: ({ pageParam }) =>
      apiFetch<PostsResponse>(`/v1/rooms/${roomId}/posts?cursor=${pageParam}&limit=${limit}`),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!roomId,
  });
}
