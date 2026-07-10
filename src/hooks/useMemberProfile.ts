import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { MemberProfileResponse } from "../lib/types";

export function useMemberProfile(memberId: string) {
  return useQuery<MemberProfileResponse>({
    queryKey: ["member", memberId],
    queryFn: () => apiFetch<MemberProfileResponse>(`/v1/members/${memberId}/profile`),
    enabled: !!memberId,
  });
}
