import { Link } from "@tanstack/react-router";
import { Calendar, MapPin, Users, Check, Loader2 } from "lucide-react";
import type { HouseId } from "@/lib/constants";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

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
  coverImage?: string;
}

export function EventCard({ event }: { event: AlphaEvent }) {
  const [loading, setLoading] = useState(false);
  const { member } = useAuthStore();

  const handleRsvp = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!member) {
      window.location.href = "/login";
      return;
    }
    setLoading(true);
    try {
      await apiFetch(`/v1/events/${event.id}/rsvp`, {
        method: "POST",
        body: JSON.stringify({ status: event.rsvped ? "not_going" : "going" }),
      });
      queryClient.invalidateQueries({ queryKey: ["event", event.id] });
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success(event.rsvped ? "RSVP cancelled" : "You're going!");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to RSVP");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Link
      to="/events/$eventId"
      params={{ eventId: event.id }}
      className="group block rounded-3xl overflow-hidden bg-card border border-border card-shadow card-glow"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-[#0F1923]">
        {event.coverImage ? (
          <img src={event.coverImage} alt={event.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
        ) : (
          <div className="absolute inset-0 subtle-grid opacity-30" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
        <span className="absolute -bottom-8 -right-2 font-display font-bold text-[7rem] leading-none text-white/[0.1] tracking-tighter select-none">
          {event.title.charAt(0).toUpperCase()}
        </span>
        <div className="absolute top-4 right-4 flex gap-1.5">
          <span className="rounded-full bg-black/40 backdrop-blur text-white text-[10px] font-bold uppercase tracking-widest px-2.5 py-1">{event.format}</span>
        </div>
        <div className="absolute bottom-4 left-5 right-5">
          <h3 className="text-display font-semibold text-2xl tracking-tighter text-white leading-none">{event.title}</h3>
          <p className="mt-1.5 text-xs text-white/80 inline-flex items-center gap-1.5">
            <Calendar className="h-3 w-3" /> {event.date} · {event.time}
            {event.location && <><span className="opacity-50">·</span><MapPin className="h-3 w-3" /> {event.location}</>}
          </p>
        </div>
      </div>
      <div className="p-4">
        <div className="flex items-center justify-between">
          <span className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary">
            <Users className="h-3 w-3" /> {event.rsvpCount}/{event.capacity}
          </span>
        </div>
        <button
          onClick={handleRsvp}
          disabled={loading}
          className="mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition-all active:scale-[0.98]"
          style={
            loading
              ? { border: "1px solid var(--border)", color: "var(--text-secondary)", background: "var(--subtle)" }
              : event.full
                ? { border: "1px solid var(--border)", color: "var(--text-secondary)" }
                : event.rsvped
                  ? { background: "color-mix(in srgb, var(--accent) 8%, transparent)", color: "var(--accent)", border: "1px solid color-mix(in srgb, var(--accent) 25%, transparent)" }
                  : { background: "var(--primary)", color: "var(--primary-foreground)" }
          }
        >
          {loading ? <><Loader2 className="h-3 w-3 inline animate-spin" /> Saving</> : event.full ? "Event Full" : event.rsvped ? <><Check className="h-3 w-3 inline" /> Going</> : "RSVP"}
        </button>
      </div>
    </Link>
  );
}
