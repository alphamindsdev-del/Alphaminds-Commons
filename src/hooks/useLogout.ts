import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import { useAuthStore } from "../store/authStore";

export function useLogout() {
  const clearSession = useAuthStore((s: { clearSession: () => void }) => s.clearSession);
  return useMutation({
    mutationFn: () =>
      apiFetch("/v1/auth/logout", {
        method: "POST",
      }),
    onSuccess: () => {
      clearSession();
    },
  });
}
