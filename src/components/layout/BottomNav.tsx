import { Link, useRouterState } from "@tanstack/react-router";
import { Home, LayoutGrid, GraduationCap, User, Newspaper, BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/journey", label: "Your Journey", icon: GraduationCap },
  { to: "/code", label: "The Code", icon: BookOpen },
  { to: "/alpha-minds-daily", label: "Daily", icon: Newspaper },
  { to: "/profile", label: "Profile", icon: User },
] as const;

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-background border-t border-divider">
      <div className="grid grid-cols-5 px-1 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {tabs.map((t) => {
          const active = t.to === "/" ? pathname === "/" : pathname.startsWith(t.to);
          const Icon = t.icon;
          return (
            <Link
              key={t.to}
              to={t.to}
              className="relative flex flex-col items-center justify-center gap-0.5 py-1.5 min-h-[52px]"
            >
              {active && (
                <span className="absolute -top-px h-1 w-8 rounded-full bg-accent" />
              )}
              <Icon className={cn("h-5 w-5 transition-colors", active ? "text-text-primary" : "text-lock-gray")} />
              <span className={cn("text-[9px] font-semibold", active ? "text-text-primary" : "text-lock-gray")}>
                {t.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
