import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, MessageSquare, Calendar, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/houses", label: "Houses", icon: LayoutGrid },
  { to: "/rooms", label: "Rooms", icon: MessageSquare },
  { to: "/events", label: "Events", icon: Calendar },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 glass border-t border-border">
      <div className="grid grid-cols-5 px-2 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[44px]"
            >
              {active && (
                <motion.span
                  layoutId="bottomnav-indicator"
                  className="absolute -top-0.5 h-1 w-8 rounded-full bg-primary"
                />
              )}
              <Icon className={cn("h-5 w-5 transition-colors", active ? "text-primary" : "text-text-secondary")} />
              <span className={cn("text-[10px] font-semibold", active ? "text-primary" : "text-text-secondary")}>{t.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
