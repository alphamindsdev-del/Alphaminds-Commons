import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { MyProfileResponse } from "../lib/types";

export function useMyProfile() {
  return useQuery<MyProfileResponse>({
    queryKey: ["me", "profile"],
    queryFn: () => apiFetch<MyProfileResponse>("/v1/me/profile"),
  });
}
