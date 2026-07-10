import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, MessageSquare, Calendar, User, Trophy, Bell, Settings, Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { useAuthStore } from "@/store/authStore";

const mainNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/houses", label: "Houses", icon: LayoutGrid },
  { to: "/rooms", label: "Rooms", icon: MessageSquare },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/challenges", label: "Challenges", icon: Trophy },
  { to: "/profile", label: "Profile", icon: User },
  { to: "/notifications", label: "Notifications", icon: Bell },
] as const;

export function Sidebar() {
  const { member } = useAuthStore();
  if (!member) return null;
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <aside className="hidden md:flex fixed inset-y-0 left-0 z-30 flex-col bg-surface border-r border-border w-[64px] lg:w-[240px] transition-all duration-200">
      <div className="h-16 flex items-center px-3 lg:px-5 border-b border-border">
        <Logo size="md" />
      </div>
      <nav className="flex-1 px-2 lg:px-3 py-4 space-y-1 overflow-y-auto">
        {mainNav.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className={cn(
                "flex items-center gap-3 px-2.5 lg:px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
                active ? "bg-primary text-white" : "text-text-secondary hover:bg-subtle hover:text-text-primary",
              )}
              title={t.label}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden lg:inline truncate">{t.label}</span>
            </Link>
          );
        })}
        {member.role === "admin" && (
          <Link
            to="/admin"
            className={cn(
              "flex items-center gap-3 px-2.5 lg:px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
              pathname.startsWith("/admin")
                ? "bg-primary text-white"
                : "text-text-secondary hover:bg-subtle hover:text-text-primary",
            )}
            title="Admin"
          >
            <Shield className="h-5 w-5 shrink-0" />
            <span className="hidden lg:inline truncate">Admin</span>
            <span className="hidden lg:inline ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-accent/20 text-primary">
              Admin
            </span>
          </Link>
        )}
      </nav>

      <div className="p-2 lg:p-3 border-t border-border space-y-2">
        {member.subscription_tier === "free" && (
          <Link
            to="/subscription"
            className="hidden lg:flex items-center gap-2 rounded-xl bg-gradient-to-br from-primary to-primary-light text-white px-3 py-3 text-sm font-bold"
          >
            <Sparkles className="h-4 w-4" />
            <span>Upgrade</span>
          </Link>
        )}
        <div className="flex items-center gap-2">
          <Link
            to="/settings"
            className="flex items-center gap-2 px-2 py-2 rounded-xl hover:bg-subtle text-text-secondary"
            title="Settings"
          >
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
