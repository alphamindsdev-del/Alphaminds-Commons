import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { X, Home, Calendar, User, Bell, Settings, Sparkles, Shield, LogOut, Moon, Sun, GraduationCap, Newspaper, Leaf, Flame, Map, Library, ScrollText, Target, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { Avatar } from "@/components/common/Avatar";
import { HouseBadge } from "@/components/common/HouseBadge";
import { useTheme } from "@/hooks/useTheme";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP } from "@/lib/constants";
import { levelIndex } from "@/lib/levels";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";

const navItems = [
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

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { member, clearSession } = useAuthStore();
  const { theme, toggle } = useTheme();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { data: unreadData } = useQuery({
    queryKey: ["unread-notifications"],
    queryFn: () => apiFetch<{ unread_count: number }>("/v1/me/notifications?limit=1"),
    refetchInterval: 30000,
    enabled: !!member,
  });
  const unread = unreadData?.unread_count ?? 0;
  if (!member) return null;
  const memberLevelIndex = levelIndex(member.membership_level);
  const bypassLocks = member.role === "admin";
  const h = HOUSE_MAP[member.primary_house] ?? Object.values(HOUSE_MAP)[0];

  const handleLogout = () => {
    clearSession();
    onClose();
    navigate({ to: "/" });
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="fixed inset-y-0 left-0 z-50 w-[280px] flex flex-col bg-surface"
          >
            <div className="flex items-center justify-between px-4 h-14 shrink-0">
              <Logo size="sm" />
              <button onClick={onClose} className="h-9 w-9 rounded-full bg-subtle flex items-center justify-center hover:bg-border transition-colors" aria-label="Close menu">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="px-4 py-4 shrink-0">
              <Link to="/profile" onClick={onClose} className="flex items-center gap-3">
                <Avatar name={member.display_name} size="md" color={h.color} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-sm truncate text-text-primary">{member.display_name}</p>
                  <p className="text-xs text-text-secondary truncate">@{member.username}</p>
                  <div className="mt-1">
                    <HouseBadge house={member.primary_house} size="sm" />
                  </div>
                </div>
              </Link>
            </div>

            <div className="mx-4 h-px bg-border shrink-0" />

            <nav className="flex-1 px-2 py-2 space-y-0.5 overflow-y-auto">
              {navItems.map((item) => {
                const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
                const Icon = item.icon;
                const isLocked = !bypassLocks && memberLevelIndex < item.minLevel;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    onClick={onClose}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
                      active ? "bg-card text-text-primary" : isLocked
                        ? "text-lock-gray hover:bg-subtle"
                        : "text-text-secondary hover:bg-subtle hover:text-text-primary",
                    )}
                  >
                    <Icon className={isLocked ? "h-5 w-5 shrink-0 text-lock-gray" : "h-5 w-5 shrink-0"} />
                    <span className="flex-1">{item.label}</span>
                    {isLocked && (
                      <span className="ml-auto h-5 w-5 rounded-full bg-lock-gray/15 text-lock-gray inline-flex items-center justify-center">
                        <Lock className="h-3 w-3" />
                      </span>
                    )}
                    {item.to === "/notifications" && unread > 0 && (
                      <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-accent text-[10px] font-bold text-accent-foreground flex items-center justify-center leading-none">
                        {unread > 99 ? "99+" : unread}
                      </span>
                    )}
                  </Link>
                );
              })}
              {member.role === "admin" && (
                <Link
                  to="/admin"
                  onClick={onClose}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-colors min-h-[44px]",
                    pathname.startsWith("/admin") ? "bg-card text-text-primary" : "text-text-secondary hover:bg-subtle hover:text-text-primary",
                  )}
                >
                  <Shield className="h-5 w-5 shrink-0" />
                  <span>Admin</span>
                </Link>
              )}
            </nav>

            <div className="mx-4 h-px bg-border shrink-0" />

            <div className="px-2 py-3 space-y-0.5 shrink-0">
              {member.subscription_tier === "free" && (
                <Link
                  to="/subscription"
                  onClick={onClose}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl btn-accent text-sm font-bold min-h-[44px]"
                >
                  <Sparkles className="h-5 w-5" />
                  <span>Upgrade</span>
                </Link>
              )}
              <Link
                to="/settings"
                onClick={onClose}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors min-h-[44px]"
              >
                <Settings className="h-5 w-5 shrink-0" />
                <span className="flex-1">Settings</span>
                <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(); }} className="h-8 w-8 rounded-full bg-subtle flex items-center justify-center hover:bg-border transition-colors" aria-label="Toggle theme">
                  {theme === "light" ? <Moon className="h-3.5 w-3.5" /> : <Sun className="h-3.5 w-3.5" />}
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-subtle hover:text-text-primary transition-colors w-full text-left min-h-[44px]"
              >
                <LogOut className="h-5 w-5 shrink-0" />
                <span>Log out</span>
              </button>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
