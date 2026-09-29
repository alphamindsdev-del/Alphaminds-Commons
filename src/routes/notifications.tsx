import { createFileRoute } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { EmptyState } from "@/components/common/EmptyState";
import { Bell, Loader2, CheckCheck } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useState } from "react";
import { PageHeader } from "@/components/common/PageHeader";

const TYPE_MAP: Record<string, "comment" | "event" | "badge" | "room" | "daily" | "challenge"> = {
  new_post: "room",
  new_comment: "comment",
  new_event: "event",
  badge_awarded: "badge",
  challenge_reminder: "challenge",
  daily_content: "daily",
};

function groupLabel(date: Date): string {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);
  const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const diffDays = Math.floor((today.getTime() - dateDay.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return "This Week";
  if (diffDays < 30) return "This Month";
  return "Older";
}

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · AlphaMinds" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notificationsData, isLoading, refetch } = useNotifications();
  const [marking, setMarking] = useState(false);
  const notifications = (notificationsData?.data ?? []).map((n: any) => {
    const created = n.created_at ? new Date(n.created_at) : new Date();
    return {
      id: n.id,
      type: TYPE_MAP[n.type] ?? "daily",
      title: n.title,
      body: n.body ?? "",
      timestamp: created.toLocaleDateString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      unread: !(n.read ?? true),
      group: groupLabel(created),
      actionUrl: n.action_url ?? null,
    };
  });
  const total = notifications.length;
  const groups = ["Today", "Yesterday", "This Week", "This Month", "Older"];

  const handleMarkAllRead = async () => {
    setMarking(true);
    try {
      await apiFetch("/v1/me/notifications/read-all", { method: "POST" });
      refetch();
      toast.success("All notifications marked as read");
    } catch {
      toast.error("Failed to mark as read");
    } finally {
      setMarking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <PageHeader eyebrow="Inbox" title="Notifications" />
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications yet"
          body="When you get activity — new posts, event reminders, challenge updates — they'll show up here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div className="flex items-end justify-between gap-4">
        <PageHeader eyebrow="Inbox" title="Notifications" />
        {total > 0 && (
          <button onClick={handleMarkAllRead} disabled={marking} className="shrink-0 inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-4 py-2 text-xs font-bold text-primary hover:border-primary/40 transition-colors disabled:opacity-50">
            <CheckCheck className="h-3.5 w-3.5" />
            {marking ? "Marking..." : "Mark all read"}
          </button>
        )}
      </div>
      <div className="space-y-6">
        {groups.map((g) => {
          const items = notifications.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <section key={g}>
              <h2 className="eyebrow px-2 mb-2">{g} · {items.length}</h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border card-shadow overflow-hidden">
                {items.map((n) => <NotificationItem key={n.id} n={n} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
