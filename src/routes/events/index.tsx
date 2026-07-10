import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useEvents } from "@/hooks/useEvents";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { HOUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Calendar } from "lucide-react";

export const Route = createFileRoute("/events/")({
  head: () => ({ meta: [{ title: "Events · AlphaMinds" }] }),
  component: EventsPage,
});

const filters = [
  { id: "all", label: "All" },
  { id: "Online", label: "Online" },
  { id: "Physical", label: "Physical" },
  ...HOUSES.map((h) => ({ id: h.id, label: h.name })),
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
    rsvped: false, full: false, tags: e.tags ?? [],
  }));
  const [active, setActive] = useState("all");
  const filtered = events.filter((e) => {
    if (active === "all") return true;
    if (active === "Online" || active === "Physical") return e.format === active;
    return e.house === active;
  });

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Events</h1>
        <p className="text-text-secondary mt-1">Show up. Online or in person. Always together.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setActive(f.id)}
            className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              active === f.id ? "bg-primary text-white" : "bg-card border border-border text-text-secondary hover:text-text-primary",
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
