import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateCover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch("/v1/me/cover", {
        method: "PUT",
        body: formData,
        headers: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me"] });
      queryClient.invalidateQueries({ queryKey: ["member"] });
    },
  });
}
