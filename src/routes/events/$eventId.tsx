import { createFileRoute, notFound, Link } from "@tanstack/react-router";
import { useEventDetail } from "@/hooks/useEventDetail";
import { useEvents } from "@/hooks/useEvents";
import { useRsvp } from "@/hooks/useRsvp";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP } from "@/lib/constants";
import { HouseBadge } from "@/components/common/HouseBadge";
import { EventCard } from "@/components/events/EventCard";
import { Avatar } from "@/components/common/Avatar";
import { Calendar, Clock, MapPin, Check, ExternalLink, Link2, Globe, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/events/$eventId")({
  loader: async ({ params }) => params,
  head: ({ loaderData }) => ({
    meta: [{ title: `${"Event"} · AlphaMinds` }],
  }),
  component: EventDetailPage,
});

function RsvpButton({ eventId, rsvpStatus, rsvpCount, rsvpLimit, format }: { eventId: string; rsvpStatus: string | null | undefined; rsvpCount: number; rsvpLimit: number | null | undefined; format?: string }) {
  const { member } = useAuthStore();
  const rsvp = useRsvp(eventId);
  const isFull = rsvpLimit !== null && rsvpLimit !== undefined && rsvpCount >= rsvpLimit;

  if (!member) {
    return (
      <Link to="/login" className="w-full block text-center rounded-xl bg-primary text-primary-foreground font-bold py-3">
        Log in to RSVP
      </Link>
    );
  }

  if (rsvp.isPending) {
    return (
      <button disabled className="w-full rounded-xl bg-primary/50 text-primary-foreground font-bold py-3 cursor-not-allowed">
        <Loader2 className="h-4 w-4 inline animate-spin mr-1" /> Saving...
      </button>
    );
  }

  if (rsvpStatus === "going") {
    return (
      <button
        onClick={() => rsvp.mutate("not_going")}
        className="w-full rounded-xl py-3 font-bold transition-colors"
        style={{ background: `${HOUSE_MAP.wellness.color}20`, color: HOUSE_MAP.wellness.color }}
      >
        <Check className="h-4 w-4 inline mr-1" /> Going · Click to cancel
      </button>
    );
  }

  if (rsvpStatus === "maybe") {
    return (
      <div className="flex gap-2">
        <button onClick={() => rsvp.mutate("going")} className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold py-3">Yes, I'm going</button>
        <button onClick={() => rsvp.mutate("not_going")} className="flex-1 rounded-xl border border-border text-text-secondary font-bold py-3">Not going</button>
      </div>
    );
  }

  if (isFull) {
    return (
      <div className="space-y-2">
        <button disabled className="w-full rounded-xl py-3 font-bold text-white bg-text-secondary/50 cursor-not-allowed">
          Event is full
        </button>
        <button onClick={() => rsvp.mutate("maybe")} className="w-full rounded-xl border border-border text-text-secondary font-bold py-3 text-sm">
          Join waitlist
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <button onClick={() => rsvp.mutate("going")} className="flex-1 rounded-xl bg-primary text-primary-foreground font-bold py-3">Going</button>
      <button onClick={() => rsvp.mutate("maybe")} className="flex-1 rounded-xl border border-border text-text-secondary font-bold py-3">Maybe</button>
    </div>
  );
}

function EventDetailPage() {
  const { eventId } = Route.useParams();
  const { data: eventData, isLoading } = useEventDetail(eventId);
  const { data: allEvents } = useEvents("global");
  const event = eventData ? {
    id: eventData.id, title: eventData.title, type: eventData.event_type, house: eventData.house,
    date: eventData.starts_at ? new Date(eventData.starts_at).toLocaleDateString() : "",
    time: eventData.starts_at ? new Date(eventData.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    endDate: eventData.ends_at ? new Date(eventData.ends_at).toLocaleDateString() : "",
    endTime: eventData.ends_at ? new Date(eventData.ends_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    format: eventData.format, location: eventData.location_name ?? "", locationAddress: eventData.location_address ?? "",
    description: eventData.description ?? "",
    host: { name: eventData.host?.display_name ?? "", display_name: eventData.host?.display_name ?? "", avatar: eventData.host?.avatar ?? "" },
    rsvpCount: eventData.rsvp_count ?? 0, capacity: eventData.rsvp_limit ?? 100,
    onlineUrl: eventData.online_url ?? "",
    registrationUrl: eventData.registration_url ?? "",
    rsvpStatus: eventData.is_rsvped ?? null,
    attendees: eventData.attendees ?? [],
    tags: eventData.tags ?? [],
  } : null;

  if (!event) {
    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }

  const h = HOUSE_MAP[event.house] ?? HOUSE_MAP.wellness;
  const others = ((allEvents?.data ?? []) as any[]).filter((e: any) => e.id !== event.id).slice(0, 2).map((e: any) => ({
    id: e.id, title: e.title, type: e.event_type, house: e.house,
    date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "",
    time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "",
    format: e.format, location: e.location_name ?? "", description: e.description ?? "",
    host: { name: e.host?.display_name ?? "", avatar: "" },
    rsvpCount: e.rsvp_count ?? 0, capacity: e.rsvp_limit ?? 100,
    rsvped: false, full: false, tags: e.tags ?? [],
    coverImage: e.cover_r2_key ? `/v1/media/${e.cover_r2_key}` : undefined,
  }));

  const isPhysical = event.format === "physical" || event.format === "hybrid";
  const isOnline = event.format === "online" || event.format === "hybrid";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      toast.success("Event link copied!");
    }).catch(() => {
      toast.error("Failed to copy link");
    });
  };

  const ensureUrl = (url: string) => url.startsWith('http://') || url.startsWith('https://') ? url : `https://${url}`;

  const googleMapsUrl = event.location
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.locationAddress || event.location)}`
    : null;

  return (
    <div className="space-y-8">
      <div className="relative -mx-4 sm:-mx-6 lg:-mx-8 h-56 sm:h-72 flex items-end p-6 sm:p-10 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}99, var(--primary-dark))` }}>
        <span className="absolute -top-14 -right-4 font-display font-bold text-[12rem] sm:text-[17rem] leading-none text-white/[0.09] tracking-tighter select-none pointer-events-none">
          {event.title.charAt(0).toUpperCase()}
        </span>
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full blur-3xl opacity-30 bg-white" />
        <div className="absolute -bottom-32 -left-16 h-72 w-72 rounded-full blur-3xl opacity-20 bg-accent" />
        <div className="relative max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="inline-block rounded-full bg-white/95 text-text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1">{event.type}</span>
            <span className="inline-block rounded-full bg-black/25 backdrop-blur text-white text-[10px] font-black uppercase tracking-widest px-3 py-1">{event.format}</span>
          </div>
          <h1 className="text-display font-semibold text-4xl sm:text-6xl tracking-tighter leading-[0.95]">{event.title}</h1>
          <p className="mt-3 text-white/90 text-sm sm:text-base">{event.date} · {event.time}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <p className="text-text-primary leading-relaxed whitespace-pre-line">{event.description}</p>

          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> Date</p>
              <p className="mt-1 font-bold">{event.date}{event.endDate && event.endDate !== event.date ? ` · ${event.endDate}` : ""}</p>
            </div>
            <div className="rounded-xl bg-card border border-border p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5"><Clock className="h-3 w-3" /> Time</p>
              <p className="mt-1 font-bold">{event.time}{event.endTime ? ` · ${event.endTime}` : ""}</p>
            </div>
          </div>

          {isPhysical && event.location && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5 mb-2"><MapPin className="h-3 w-3" /> Location</p>
              <p className="font-bold">{event.location}</p>
              {event.locationAddress && <p className="text-sm text-text-secondary mt-0.5">{event.locationAddress}</p>}
              <a
                href={googleMapsUrl!}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 h-48 rounded-2xl bg-subtle border border-border relative overflow-hidden flex items-center justify-center group cursor-pointer block"
              >
                <div className="absolute inset-0 opacity-50" style={{ background: "linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.05) 100%), repeating-linear-gradient(45deg, var(--border) 0, var(--border) 1px, transparent 1px, transparent 24px)" }} />
                <div className="relative flex flex-col items-center text-text-secondary group-hover:text-primary transition-colors">
                  <div className="h-10 w-10 rounded-full flex items-center justify-center text-white" style={{ background: h.color }}><MapPin className="h-5 w-5" /></div>
                  <span className="text-xs mt-2 font-semibold">Open in Google Maps</span>
                </div>
              </a>
            </div>
          )}

          {isOnline && event.onlineUrl && (
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary inline-flex items-center gap-1.5 mb-2"><Globe className="h-3 w-3" /> Online Event</p>
              <a
                href={ensureUrl(event.onlineUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-xl bg-primary text-primary-foreground font-bold px-5 py-3 text-sm"
              >
                <ExternalLink className="h-4 w-4" /> Join Online
              </a>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            {event.tags.map((t: string) => (
              <span key={t} className="rounded-full bg-subtle px-3 py-1 text-xs font-bold text-text-secondary">{t}</span>
            ))}
            <HouseBadge house={event.house} />
            <button
              onClick={handleCopyLink}
              className="rounded-full bg-card border border-border px-3 py-1 text-xs font-bold text-text-secondary hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              <Link2 className="h-3 w-3" /> Copy link
            </button>
          </div>
        </div>

        <aside className="lg:sticky lg:top-6 self-start space-y-4">
          <div className="rounded-2xl border border-border bg-card p-6 card-shadow space-y-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">Spots remaining</p>
              <p className="mt-1 font-black text-2xl">{event.capacity - event.rsvpCount} / {event.capacity}</p>
              <div className="mt-2 h-2 bg-subtle rounded-full overflow-hidden">
                <div className="h-full" style={{ width: `${(event.rsvpCount / event.capacity) * 100}%`, background: h.color }} />
              </div>
            </div>

            <RsvpButton
              eventId={event.id}
              rsvpStatus={event.rsvpStatus}
              rsvpCount={event.rsvpCount}
              rsvpLimit={eventData?.rsvp_limit}
              format={event.format}
            />

            {event.registrationUrl && (
              <a
                href={ensureUrl(event.registrationUrl)}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full rounded-xl border border-primary text-primary font-bold py-3 text-center block text-sm hover:bg-primary/5 transition-colors"
              >
                <ExternalLink className="h-4 w-4 inline mr-1" /> Register Externally
              </a>
            )}

            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-3">Attendees</p>
              {event.attendees.length > 0 ? (
                <div className="flex items-center">
                  {event.attendees.slice(0, 5).map((a: any, i: number) => (
                    <div key={a.member_id ?? i} className="-ml-2 first:ml-0 ring-2 ring-card rounded-full">
                      <Avatar name={a.display_name ?? a.username} size="sm" />
                    </div>
                  ))}
                  <span className="ml-3 text-sm font-semibold text-text-secondary">+{Math.max(event.rsvpCount - 5, 0)} going</span>
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No attendees yet</p>
              )}
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
