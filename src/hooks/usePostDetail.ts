import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostDetailResponse } from "../lib/types";
import { mapPost, mapComment } from "../lib/utils";

export function usePostDetail(postId: string) {
  return useQuery<PostDetailResponse>({
    queryKey: ["post", postId],
    queryFn: async () => {
      const res = await apiFetch<any>(`/v1/posts/${postId}`);
      const post = res.data ?? res;
      return {
        ...mapPost(post),
        created_at: (post.created_at ?? "") as string,
        liked: Boolean(post.liked ?? post.is_liked ?? false),
        comment_count: (post.comment_count ?? post.comments_count ?? 0) as number,
        comments: (post.comments ?? []).map(mapComment),
      } as PostDetailResponse;
    },
    enabled: !!postId,
  });
}
