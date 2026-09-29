import { Link } from "@tanstack/react-router";
import { Bell, Menu } from "lucide-react";
import { Logo } from "./Logo";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

export function TopBar({ onMenuClick }: { onMenuClick: () => void }) {
  const { member } = useAuthStore();
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
      <div className="flex items-center justify-between px-4 h-14">
        <button onClick={onMenuClick} className="h-10 w-10 -ml-2 flex items-center justify-center text-text-primary" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <div className="absolute left-1/2 -translate-x-1/2">
          <Logo size="sm" />
        </div>
        <Link to="/notifications" className="relative h-10 w-10 -mr-2 flex items-center justify-center text-text-primary" aria-label="Notifications">
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
