import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { NotificationsResponse } from "../lib/types";

export function useNotifications(filters?: Record<string, string>) {
  const params = filters ? `?${new URLSearchParams(filters)}` : "";
  return useQuery<NotificationsResponse>({
    queryKey: ["me", "notifications", filters],
    queryFn: () => apiFetch<NotificationsResponse>(`/v1/me/notifications${params}`),
  });
}
