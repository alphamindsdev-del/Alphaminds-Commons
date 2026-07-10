import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users } from "lucide-react";
import type { HouseId } from "@/lib/constants";

interface AlphaEvent {
  id: string;
  title: string;
  type: string;
  house: HouseId;
  date: string;
  time: string;
  format: string;
  location: string;
  description: string;
  host: { name: string; avatar: string };
  rsvpCount: number;
  capacity: number;
  rsvped: boolean;
  full: boolean;
  tags: string[];
}
import { HOUSE_MAP } from "@/lib/constants";
import { HouseBadge } from "@/components/common/HouseBadge";

export function EventCard({ event }: { event: AlphaEvent }) {
  const h = HOUSE_MAP[event.house];
  const pct = Math.round((event.rsvpCount / event.capacity) * 100);

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group block rounded-2xl overflow-hidden bg-card border border-border card-shadow card-hover"
    >
      <div
        className="h-32 relative flex items-end p-4"
        style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}aa, ${h.color}66)` }}
      >
        <span className="absolute top-3 left-3 rounded-full bg-white/95 text-text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-1">
          {event.type}
        </span>
        <span className="absolute top-3 right-3 rounded-full bg-black/30 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest px-2 py-1">
          {event.format}
        </span>
        <span className="text-4xl">{h.emoji}</span>
      </div>
      <div className="p-4">
        <h3 className="font-bold text-text-primary line-clamp-1">{event.title}</h3>
        <div className="mt-2 flex flex-col gap-1 text-xs text-text-secondary">
          <span className="inline-flex items-center gap-1.5"><Calendar className="h-3 w-3" /> {event.date} · {event.time}</span>
          <span className="inline-flex items-center gap-1.5"><MapPin className="h-3 w-3" /> {event.location}</span>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <HouseBadge house={event.house} size="sm" />
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
            <Users className="h-3 w-3" /> {event.rsvpCount}/{event.capacity}
          </span>
        </div>
        <button
          className="mt-4 w-full rounded-xl py-2.5 text-sm font-bold transition-colors"
          style={
            event.full
              ? { background: "rgb(var(--subtle))", color: "rgb(var(--text-secondary))" }
              : event.rsvped
                ? { background: `${h.color}20`, color: h.color }
                : { background: "var(--primary)", color: "white" }
          }
        >
          {event.full ? "Full — Join Waitlist" : event.rsvped ? "Going ✓" : "RSVP"}
        </button>
        <div className="mt-2 h-1 bg-subtle rounded-full overflow-hidden">
          <div className="h-full" style={{ width: `${pct}%`, background: h.color }} />
        </div>
      </div>
    </Link>
  );
}
