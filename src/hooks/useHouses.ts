import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { HousesResponse } from "../lib/types";

export function useHouses() {
  return useQuery<HousesResponse>({
    queryKey: ["houses"],
    queryFn: () => apiFetch<HousesResponse>("/v1/houses"),
  });
}
