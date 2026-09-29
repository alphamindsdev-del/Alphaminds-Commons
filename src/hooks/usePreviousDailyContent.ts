import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export interface PreviousDailyItem {
  id: string;
  title: string;
  body: string;
  house: string;
  content_type: string;
  media_r2_key: string | null;
  scheduled_date: string | null;
  day_of_week: string | null;
  created_at: string;
}

interface PreviousDailyResponse {
  data: PreviousDailyItem[];
}

export function usePreviousDailyContent() {
  return useQuery<PreviousDailyResponse>({
    queryKey: ["daily-content", "previous"],
    queryFn: () => apiFetch<PreviousDailyResponse>("/v1/daily-content/previous"),
    staleTime: 1000 * 60 * 5,
    retry: 1,
  });
}
