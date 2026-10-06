import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/events/")({
  head: () => ({ meta: [{ title: "Events · AlphaMinds" }] }),
  component: EventsPage,
});

const filters = [
  { id: "all", label: "All" },
  { id: "Online", label: "Online" },
  { id: "Physical", label: "Physical" },
];

const filterLabel = (id: string) => filters.find((f) => f.id === id)?.label ?? id;

function EventsPage() {
  const { data: eventsData, isLoading } = useEvents("global");
  const events = (eventsData?.data ?? []).map((e: any) => ({
    id: e.id, title: e.title, type: e.event_type, house: e.house,
    date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "",
    time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    format: e.format, location: e.location_name ?? "", description: e.description ?? "",
    host: { name: e.host?.display_name ?? "", avatar: "" },
    rsvpCount: e.rsvp_count ?? 0, capacity: e.rsvp_limit ?? 100,
    rsvped: e.is_rsvped === "going", full: (e.rsvp_count ?? 0) >= (e.rsvp_limit ?? 999999),
    tags: e.tags ?? [],
    coverImage: e.cover_r2_key ? `/v1/media/${e.cover_r2_key}` : undefined,
  }));
  const [active, setActive] = useState("all");
  const filtered = events.filter((e) => {
    if (active === "all") return true;
    return e.format === active;
  });

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Show Up"
        title="Events"
        subtitle="Online or in person — together. RSVP, show up, and leave a little more connected."
      />

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all",
              active === f.id ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(20,20,18,0.5)]" : "bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/30",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filtered.length > 0 ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      ) : (
        <EmptyState
          icon={<Calendar className="h-6 w-6" />}
          title={`No ${active === "all" ? "" : filterLabel(active) + " "}events found`}
          body="There are no upcoming events matching your filter. Try a different category or check back later."
        />
      )}
    </div>
  );
}
