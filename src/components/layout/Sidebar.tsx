import { Link, useRouterState } from "@tanstack/react-router";
import { Home, Calendar, User, Bell, Settings, Sparkles, Shield, GraduationCap, Newspaper, Leaf, Flame, Map, Library, ScrollText, Target, Lock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/store/authStore";
import { levelIndex } from "@/lib/levels";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const mainNav = [
  { to: "/", label: "Home", icon: Home, minLevel: 0 },
  { to: "/journey", label: "Your Journey", icon: GraduationCap, minLevel: 0 },
  { to: "/code", label: "The Code", icon: ScrollText, minLevel: 0 },
  { to: "/alpha-minds-daily", label: "Alpha Minds Daily", icon: Newspaper, minLevel: 0 },
  { to: "/plans", label: "Plans", icon: Target, minLevel: 1 },
  { to: "/wellness-clinic", label: "Wellness Clinic", icon: Leaf, minLevel: 1 },
  { to: "/rel-fi", label: "Rel-Fi — Play Now", icon: Flame, minLevel: 1 },
  { to: "/my-chapter", label: "My Chapter", icon: Map, minLevel: 0 },
  { to: "/events", label: "Events", icon: Calendar, minLevel: 1 },
  { to: "/library", label: "Library", icon: Library, minLevel: 0 },
  { to: "/profile", label: "Profile", icon: User, minLevel: 0 },
  { to: "/notifications", label: "Notifications", icon: Bell, minLevel: 0 },
] as const;

export function Sidebar() {
  const { member } = useAuthStore();
  if (!member) return null;
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: unreadData } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => apiFetch<{ unread_count: number }>("/v1/me/notifications?limit=1"),
    refetchInterval: 30000,
    enabled: !!member,
  });
  const unread = unreadData?.unread_count ?? 0;
  const memberLevelIndex = levelIndex(member.membership_level);
  const bypassLocks = member.role === "admin";

  const linkClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-3 px-2.5 lg:px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
      active
        ? "bg-card text-text-primary"
        : "text-text-secondary hover:bg-subtle hover:text-text-primary",
    );

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-background border-r border-divider w-[64px] lg:w-[240px] transition-all duration-200">
      <div className="h-14 flex items-center px-3 lg:px-6 border-b border-divider">
        <Logo size="md" />
      </div>
      <nav className="flex-1 px-2 lg:px-3 py-5 space-y-1 overflow-y-auto">
        {mainNav.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          const isLocked = !bypassLocks && memberLevelIndex < t.minLevel;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={linkClass(active)}
              title={isLocked ? `${t.label} — unlocks at Examiner level` : t.label}
            >
              {active && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent" />
              )}
              <Icon className={cn("h-5 w-5 shrink-0", isLocked ? "text-lock-gray" : "")} />
              <span className={cn("hidden lg:inline truncate", isLocked && "text-lock-gray")}>{t.label}</span>
              {isLocked && (
                <span className="hidden lg:inline-flex ml-auto h-5 w-5 rounded-full bg-lock-gray/15 text-lock-gray items-center justify-center">
                  <Lock className="h-3 w-3" />
                </span>
              )}
              {t.to === "/notifications" && unread > 0 && (
                <span className="ml-auto h-5 min-w-[20px] px-1.5 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center leading-none">
                  {unread > 99 ? "99+" : unread}
                </span>
              )}
            </Link>
          );
        })}
        {member.role === "admin" && (
          <Link
            to="/admin"
            className={linkClass(pathname.startsWith("/admin"))}
            title="Admin"
          >
            {pathname.startsWith("/admin") && (
              <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-r-full bg-accent" />
            )}
            <Shield className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline truncate">Admin</span>
          </Link>
        )}
      </nav>

      <div className="p-2 lg:p-3 border-t border-divider space-y-2">
        {member.subscription_tier === "free" && (
          <Link to="/subscription" className="hidden lg:flex items-center justify-center gap-2 rounded-xl btn-accent px-3 py-3 text-sm font-bold">
            <Sparkles className="h-4 w-4" />
            <span>Upgrade</span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <Link to="/settings" className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-subtle text-text-secondary" title="Settings">
            <Settings className="h-5 w-5" />
            <span className="hidden lg:inline text-sm font-semibold">Settings</span>
          </Link>
          <div className="ml-auto">
            <ThemeToggle compact />
          </div>
        </div>
      </div>
    </aside>
  );
}
