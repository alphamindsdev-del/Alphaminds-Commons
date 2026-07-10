import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostCommentsResponse } from "../lib/types";

export function usePostComments(postId: string, limit = 20) {
  return useInfiniteQuery<PostCommentsResponse>({
    queryKey: ["comments", postId],
    queryFn: ({ pageParam }) =>
      apiFetch<PostCommentsResponse>(`/v1/posts/${postId}/comments?cursor=${pageParam}&limit=${limit}`),
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!postId,
  });
}
