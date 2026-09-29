import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/v1/me/profile", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
    },
  });
}
