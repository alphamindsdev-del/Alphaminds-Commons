import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";

export function useLogin() {
  return useMutation({
    mutationFn: (data: any) =>
      apiFetch("/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(data),
      }),
  });
}
