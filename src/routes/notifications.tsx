import { createFileRoute } from "@tanstack/react-router";
import { useNotifications } from "@/hooks/useNotifications";
import { NotificationItem } from "@/components/notifications/NotificationItem";
import { EmptyState } from "@/components/common/EmptyState";
import { Bell } from "lucide-react";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications · AlphaMinds" }] }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const { data: notificationsData, isLoading } = useNotifications();
  const notifications = (notificationsData?.data ?? []).map((n: any) => ({
    id: n.id, type: n.type, title: n.title, body: n.body ?? "",
    timestamp: n.created_at ? new Date(n.created_at).toLocaleDateString() : "",
    read: n.read ?? false, unread: !(n.read ?? false), group: n.group ?? "Today", actionUrl: n.action_url ?? null,
    actor: n.actor ? { name: n.actor.display_name ?? n.actor.name ?? "", avatar: "" } : null,
  }));
  const total = notifications.length;
  const groups = ["Today", "Yesterday", "This Week"] as const;

  if (total === 0 && !isLoading) {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <header>
          <h1 className="font-black text-3xl">Notifications</h1>
        </header>
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="No notifications yet"
          body="When you get activity — new posts, event reminders, challenge updates — they'll show up here."
        />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <header className="flex items-center justify-between">
        <h1 className="font-black text-3xl">Notifications</h1>
        {total > 0 && <button className="text-sm font-bold text-primary">Mark all read</button>}
      </header>
      <div className="space-y-6">
        {groups.map((g) => {
          const items = notifications.filter((n) => n.group === g);
          if (items.length === 0) return null;
          return (
            <section key={g}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-text-secondary px-2 mb-2">{g}</h2>
              <div className="rounded-2xl border border-border bg-card divide-y divide-border card-shadow">
                {items.map((n) => <NotificationItem key={n.id} n={n} />)}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
