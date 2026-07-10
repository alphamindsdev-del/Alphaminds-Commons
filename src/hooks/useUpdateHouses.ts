import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateHouses() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/v1/me/houses", {
        method: "PUT",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
    },
  });
}
