import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { SubscriptionResponse } from "../lib/types";

export function useSubscription() {
  return useQuery<SubscriptionResponse>({
    queryKey: ["me", "subscription"],
    queryFn: () => apiFetch<SubscriptionResponse>("/v1/me/subscription"),
  });
}
