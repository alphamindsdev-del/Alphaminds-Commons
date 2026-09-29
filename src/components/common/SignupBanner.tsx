import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { X } from "lucide-react";

export function SignupBanner() {
  const { isAuthenticated } = useAuthStore();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (isAuthenticated || dismissed) return;

    let scrollTimer: ReturnType<typeof setTimeout>;
    let scrollCheck: (() => void) | null = null;

    const onScroll = () => {
      const doc = document.documentElement;
      const scrollPct = (doc.scrollTop + doc.clientHeight) / doc.scrollHeight;
      if (scrollPct > 0.5) {
        setVisible(true);
        if (scrollCheck) document.removeEventListener("scroll", scrollCheck);
      }
    };

    scrollCheck = onScroll;
    document.addEventListener("scroll", onScroll, { passive: true });

    scrollTimer = setTimeout(() => {
      if (!visible) setVisible(true);
    }, 15000);

    return () => {
      clearTimeout(scrollTimer);
      if (scrollCheck) document.removeEventListener("scroll", scrollCheck);
    };
  }, [isAuthenticated, dismissed, visible]);

  if (isAuthenticated || dismissed || !visible) return null;

  return (
    <div className="fixed bottom-20 left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:w-80 z-50 rounded-2xl border border-border bg-card p-5 card-shadow animate-in slide-in-from-bottom-4">
      <button
        onClick={() => setDismissed(true)}
        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center hover:bg-subtle"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
      <p className="font-bold text-text-primary pr-4">Join AlphaMinds</p>
      <p className="text-sm text-text-secondary mt-1">Sign up free and become part of the Commons.</p>
      <div className="mt-3 flex gap-2">
        <Link
          to="/register"
          className="flex-1 rounded-xl bg-primary text-primary-foreground text-center text-sm font-bold py-2.5"
        >
          Sign up free
        </Link>
        <Link
          to="/login"
          className="flex-1 rounded-xl border border-border text-text-primary text-center text-sm font-bold py-2.5"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
