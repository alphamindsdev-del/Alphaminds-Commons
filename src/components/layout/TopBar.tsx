import { Link, useRouterState } from "@tanstack/react-router";
import { Bell, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

function spaceLabel(pathname: string): string | null {
  if (
    pathname.startsWith("/alpha-body") ||
    pathname.startsWith("/wellness-clinic") ||
    pathname.startsWith("/beatlift") ||
    pathname.startsWith("/health-")
  ) {
    return "ALPHABODY SPACE";
  }
  if (pathname.startsWith("/alpha-world")) return "ALPHAWORLD SPACE";
  if (
    pathname === "/" ||
    pathname.startsWith("/journey") ||
    pathname.startsWith("/code") ||
    pathname.startsWith("/alpha-minds-daily") ||
    pathname.startsWith("/events") ||
    pathname.startsWith("/challenges") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/rooms")
  ) {
    return "ALPHAMIND SPACE";
  }
  return null;
}

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { member } = useAuthStore();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const label = spaceLabel(pathname);
  const { data: unreadData } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => apiFetch<{ unread_count: number }>("/v1/me/notifications?limit=1"),
    refetchInterval: 30000,
    enabled: !!member,
  });
  const unread = unreadData?.unread_count ?? 0;
  if (!member) return null;
  return (
    <header className="md:hidden sticky top-0 z-30 bg-background border-b border-divider">
      <div className="relative flex items-center justify-between px-4 h-16">
        <button
          onClick={onMenuClick}
          className="h-10 w-10 -ml-2 flex items-center justify-center text-text-primary"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="absolute left-1/2 flex -translate-x-1/2 flex-col items-center">
          <Logo size="sm" />
          {label && (
            <span className="mt-0.5 text-[8px] font-black uppercase tracking-[0.2em] text-[#4C8C2E]">
              {label}
            </span>
          )}
        </div>
        <Link
          to="/notifications"
          className="relative h-10 w-10 -mr-2 flex items-center justify-center text-text-primary"
          aria-label="Notifications"
        >
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute top-1.5 right-1.5 h-4 min-w-[16px] px-1 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center leading-none">
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
}
