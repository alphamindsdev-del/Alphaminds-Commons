import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useEvents } from "@/hooks/useEvents";
import { HOUSE_MAP } from "@/lib/constants";
import { HouseBadge } from "@/components/common/HouseBadge";
import { EventCard } from "@/components/events/EventCard";
import { Avatar } from "@/components/common/Avatar";
import { Calendar, Clock, MapPin } from "lucide-react";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => params,
  head: ({ loaderData }) => ({
    meta: [{ title: `${"Event"} · AlphaMinds` }],
  }),
  component: EventDetailPage,
});

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { data: eventData, isLoading } = useEventDetail(eventId);
  const { data: allEvents } = useEvents("global");
  const event = eventData ? {
    id: eventData.id, title: eventData.title, type: eventData.event_type, house: eventData.house,
    date: eventData.starts_at ? new Date(eventData.starts_at).toLocaleDateString() : "",
    time: eventData.starts_at ? new Date(eventData.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    format: eventData.format, location: eventData.location_name ?? "", description: eventData.description ?? "",
    host: { name: eventData.host?.display_name ?? "", avatar: "" },
    rsvpCount: eventData.rsvp_count ?? 0, capacity: eventData.rsvp_limit ?? 100,
    rsvped: false, full: (eventData.rsvp_count ?? 0) >= (eventData.rsvp_limit ?? 100), tags: eventData.tags ?? [],
  } : null;
  if (!event) {
    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const h = HOUSE_MAP[event.house];
  const others = ((allEvents?.data ?? []) as any[]).filter((e: any) => e.id !== event.id).slice(0, 2).map((e: any) => ({
    id: e.id, title: e.title, type: e.event_type, house: e.house,
    date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "",
    time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    format: e.format, location: e.location_name ?? "", description: e.description ?? "",
    host: { name: e.host?.display_name ?? "", avatar: "" },
    rsvpCount: e.rsvp_count ?? 0, capacity: e.rsvp_limit ?? 100,
    rsvped: false, full: false, tags: e.tags ?? [],
  }));

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-56 sm:h-72 flex items-end p-6 sm:p-10 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}aa, #1e3f47)` }}>
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full blur-3xl opacity-30 bg-white" />
        <div className="relative max-w-3xl">
          <span className="inline-block rounded-full bg-white/95 text-text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-1 mb-3">{event.type}</span>
          <h1 className="font-black text-3xl sm:text-5xl">{event.title}</h1>
          <p className="mt-2 text-white/90">{event.date} · {event.time}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <p className="text-text-primary leading-relaxed">{event.description}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Date</p>
              <p className="mt-1 font-bold">{event.date}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> Time</p>
              <p className="mt-1 font-bold">{event.time}</p>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5 mb-2"><MapPin className="h-3 w-3" /> Location</p>
            <p className="font-bold">{event.location}</p>
            <div className="mt-3 h-48 rounded-2xl bg-subtle border border-border relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 opacity-50" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.05) 100%), repeating-linear-gradient(45deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 24px)" }} />
              <div className="relative flex flex-col items-center text-text-secondary">
                <div className="h-10 w-10 rounded-full flex items-center justify-center text-white" style={{ background: h.color }}><MapPin className="h-5 w-5" /></div>
                <span className="text-xs mt-2 font-semibold">{event.location}</span>
              </div>
            </div>
          </div>

          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Hosted by</p>
            <div className="flex items-center gap-3">
              <Avatar name={event.host.name} size="md" color={h.color} />
              <p className="font-bold">{event.host.name}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {event.tags.map((t) => (
              <span key={t} className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-text-secondary">{t}</span>
            ))}
            <HouseBadge house={event.house} />
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 self-start rounded-2xl border border-border bg-card p-6 card-shadow space-y-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Spots remaining</p>
            <p className="mt-1 font-black text-2xl">{event.capacity - event.rsvpCount} / {event.capacity}</p>
            <div className="mt-2 h-2 bg-subtle rounded-full overflow-hidden">
              <div className="h-full" style={{ width: `${(event.rsvpCount / event.capacity) * 100}%`, background: h.color }} />
            </div>
          </div>
          <button
            className="w-full rounded-xl py-3 font-bold text-white"
            style={{ background: event.full ? "#94A3B8" : "var(--primary)" }}
          >
            {event.full ? "Join Waitlist" : event.rsvped ? "Going ✓" : "RSVP"}
          </button>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Attendees</p>
            <div className="flex items-center">
              {["AO", "TB", "ZI", "KA", "DO"].map((n, i) => (
                <div key={n} className="-ml-2 first:ml-0 ring-2 ring-card rounded-full"><Avatar name={n} size="sm" /></div>
              ))}
              <span className="ml-3 text-sm font-semibold text-text-secondary">+{Math.max(event.rsvpCount - 5, 0)} going</span>
            </div>
          </div>
        </aside>
      </div>

      <section>
        <h2 className="font-bold text-xl mb-4">Other Events You Might Like</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {others.map((e) => <EventCard key={e.id} event={e} />)}
        </div>
      </section>
    </div>
  );
}
