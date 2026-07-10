import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { Logo } from "./Logo";
import { ThemeToggle } from "@/components/common/ThemeToggle";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP } from "@/lib/constants";

export function TopBar() {
  const { member } = useAuthStore();
  if (!member) return null;
  const h = HOUSE_MAP[member.primary_house] ?? Object.values(HOUSE_MAP)[0];
  return (
    <header className="md:hidden sticky top-0 z-30 glass border-b border-border">
      <div className="flex items-center justify-between px-4 h-14">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          <Link to="/notifications" className="relative h-10 w-10 rounded-full bg-subtle flex items-center justify-center" aria-label="Notifications">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-accent" />
          </Link>
          <ThemeToggle compact />
          <Link to="/profile" aria-label="Profile">
            <Avatar name={member.display_name} size="sm" color={h.color} />
          </Link>
        </div>
      </div>
    </header>
  );
}
