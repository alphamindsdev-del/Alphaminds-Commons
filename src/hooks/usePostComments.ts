import { useInfiniteQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostCommentsResponse } from "../lib/types";
import { mapComment } from "../lib/utils";

export function usePostComments(postId: string, limit = 20) {
  return useInfiniteQuery<PostCommentsResponse>({
    queryKey: ["comments", postId],
    queryFn: async ({ pageParam }) => {
      const res = await apiFetch<any>(`/v1/posts/${postId}/comments?cursor=${pageParam}&limit=${limit}`);
      return {
        ...res,
        data: (res.data ?? []).map(mapComment),
        nextCursor: res.pagination?.next_cursor ?? res.next_cursor ?? null,
      };
    },
    initialPageParam: "",
    getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    enabled: !!postId,
  });
}
