import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useRegister() {
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
