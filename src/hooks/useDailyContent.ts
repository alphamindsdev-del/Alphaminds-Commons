import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { DailyContentResponse } from "../lib/types";

export function useDailyContent() {
  return useQuery<DailyContentResponse>({
    queryKey: ["daily-content", "today"],
    queryFn: () => apiFetch<DailyContentResponse>("/v1/daily-content/today"),
    staleTime: 1000 * 60,
    refetchOnMount: true,
    retry: 1,
  });
}
