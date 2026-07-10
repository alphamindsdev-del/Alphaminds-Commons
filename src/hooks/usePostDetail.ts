import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { PostDetailResponse } from "../lib/types";

export function usePostDetail(postId: string) {
  return useQuery<PostDetailResponse>({
    queryKey: ["post", postId],
    queryFn: () => apiFetch<PostDetailResponse>(`/v1/posts/${postId}`),
    enabled: !!postId,
  });
}
