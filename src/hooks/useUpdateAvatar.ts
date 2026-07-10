import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useUpdateAvatar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) =>
      apiFetch("/v1/me/avatar", {
        method: "PUT",
        body: formData,
        headers: {},
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["me", "profile"] });
    },
  });
}
