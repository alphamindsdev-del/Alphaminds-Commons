import { Bell, Calendar, Trophy, MessageSquare, Sun, Star, DoorOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

type NotificationType = "comment" | "event" | "badge" | "room" | "daily" | "challenge";

interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  timestamp: string;
  group: string;
  unread: boolean;
  actionUrl: string | null;
}

const icons = {
  comment: { Icon: MessageSquare, color: "#3B82F6", bg: "#3B82F615" },
  event: { Icon: Calendar, color: "#10B981", bg: "#10B98115" },
  badge: { Icon: Trophy, color: "#F59E0B", bg: "#F59E0B15" },
  room: { Icon: DoorOpen, color: "#10B981", bg: "#10B98115" },
  daily: { Icon: Sun, color: "#6366F1", bg: "#6366F115" },
  challenge: { Icon: Star, color: "#F59E0B", bg: "#F59E0B15" },
} as const;

export function NotificationItem({ n }: { n: AppNotification }) {
  const cfg = icons[n.type] ?? { Icon: Bell, color: "var(--primary)", bg: "color-mix(in srgb, var(--primary) 8%, transparent)" };
  const { Icon } = cfg;
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleClick = async () => {
    if (n.unread) {
      await apiFetch(`/v1/me/notifications/${n.id}/read`, { method: "POST" });
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["me", "notifications"] });
    }
    if (n.actionUrl) {
      navigate({ to: n.actionUrl });
    }
  };

  return (
    <div className="flex items-start gap-3 p-4 rounded-xl hover:bg-subtle transition-colors cursor-pointer" onClick={handleClick}>
      <div className="h-10 w-10 rounded-full flex items-center justify-center shrink-0" style={{ background: cfg.bg, color: cfg.color }}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <p className="font-semibold text-text-primary text-sm">{n.title}</p>
          {n.unread && <span className="h-2 w-2 mt-1.5 rounded-full bg-accent shrink-0" />}
        </div>
        <p className="text-sm text-text-secondary mt-0.5 line-clamp-2">{n.body}</p>
        <span className="text-xs text-text-secondary mt-1 inline-block">{n.timestamp}</span>
      </div>
    </div>
  );
}
