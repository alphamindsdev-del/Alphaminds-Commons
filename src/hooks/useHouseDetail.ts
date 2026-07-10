import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { HouseDetailResponse } from "../lib/types";

export function useHouseDetail(houseId: string) {
  return useQuery<HouseDetailResponse>({
    queryKey: ["houses", houseId],
    queryFn: () => apiFetch<HouseDetailResponse>(`/v1/houses/${houseId}`),
    enabled: !!houseId,
  });
}
