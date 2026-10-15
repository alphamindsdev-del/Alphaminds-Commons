import { useEffect, useRef, useState } from "react";
import { useAuth } from "./auth-store";
import { useAuthStore } from "@/store/authStore";
import { embeddedLogin, getHandoff, hasAlphaMindsToken } from "../lib/api";

/**
 * Embedded SSO for REL-Fi inside The Commons.
 *
 * Waits for the host app's session restore to settle (avoiding the child-effect
 * race on hard refresh), exchanges the AlphaMinds session for a short-lived
 * handoff JWT, then for a Rel-Fi token. On failure the user can retry without
 * being permanently locked out; an expired/invalid AlphaMinds session (401)
 * sends the user to the app login for graceful reauthentication.
 */
export function useEmbeddedAutoLogin(enabled: boolean) {
  const user = useAuth((s) => s.user);
  const loadSession = useAuth((s) => s.loadSession);
  const alphaLoading = useAuthStore((s) => s.isLoading);
  const [authError, setAuthError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const runningRef = useRef(false);

  useEffect(() => {
    if (!enabled || user || alphaLoading) return;
    if (runningRef.current) return;
    if (!hasAlphaMindsToken()) {
      loadSession();
      return;
    }
    runningRef.current = true;
    let cancelled = false;
    setAuthError(null);
    getHandoff()
      .then((handoff) => embeddedLogin(handoff))
      .then(() => {
        if (!cancelled) loadSession();
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const status = (err as { status?: number })?.status;
        console.error("[RelFi] Auto-login failed:", err);
        if (status === 401) {
          // AlphaMinds session expired or invalid — reauthenticate via the app.
          window.location.assign("/login");
          return;
        }
        setAuthError("Failed to auto-sign in. Retry, or sign in with your Rel-Fi account below.");
        loadSession();
      })
      .finally(() => {
        runningRef.current = false;
      });
    return () => {
      cancelled = true;
    };
  }, [enabled, user, alphaLoading, attempt, loadSession]);

  const retry = () => {
    setAuthError(null);
    setAttempt((a) => a + 1);
  };

  return { authError, retry };
}
