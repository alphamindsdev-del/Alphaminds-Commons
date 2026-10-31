import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CalendarDays, Dumbbell, Flame, HeartPulse, Users } from "lucide-react";
import { useEvents } from "@/hooks/useEvents";
import { useRooms } from "@/hooks/useRooms";
import { EventCard } from "@/components/events/EventCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { AssetImage } from "@/components/alphabody/AssetImage";
import type { EventItem, RoomItem } from "@/lib/types";

export const Route = createFileRoute("/beatlift")({
  head: () => ({
    meta: [
      { title: "BeatLift · AlphaBody" },
      {
        name: "description",
        content:
          "Move with purpose. Join BeatLift sessions, strength training and community challenges.",
      },
    ],
  }),
  component: BeatLiftPage,
});

const BEATLIFT_IMAGE = "/assets/images/BeatLift_ Strength in Motion.webp";

function BeatLiftPage() {
  const { data: eventsData, isLoading } = useEvents("global");
  const { data: roomsData } = useRooms("global", { house: "wellness" });

  const events = (eventsData?.data ?? [])
    .filter((event) => {
      const type =
        `${event.event_type ?? ""} ${event.type ?? ""} ${event.title ?? ""}`.toLowerCase();
      return type.includes("beatlift") || type.includes("movement") || type.includes("fitness");
    })
    .slice(0, 4)
    .map((e) => ({
      id: e.id,
      title: e.title,
      type: e.event_type ?? e.type ?? "movement",
      house: e.house,
      date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "",
      time: e.starts_at
        ? new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : "",
      format: e.format ?? "Online",
      location: e.location_name ?? "",
      description: e.description ?? "",
      host: { name: e.host?.display_name ?? e.host?.name ?? "", avatar: "" },
      rsvpCount: e.rsvp_count ?? 0,
      capacity: e.rsvp_limit ?? 100,
      rsvped: e.is_rsvped === "going",
      full: (e.rsvp_count ?? 0) >= (e.rsvp_limit ?? 999999),
      tags: e.tags ?? [],
      coverImage: (e as EventItem & { cover_r2_key?: string }).cover_r2_key
        ? `/v1/media/${(e as EventItem & { cover_r2_key?: string }).cover_r2_key}`
        : undefined,
    }));

  const beatLiftRoom = (roomsData?.data ?? roomsData?.rooms ?? []).find((room: RoomItem) =>
    `${room.name ?? ""}`.toLowerCase().includes("beatlift"),
  );

  return (
    <div className="mx-auto max-w-[960px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#0B0F0B] p-5 text-white sm:p-8">
        <AssetImage
          src={BEATLIFT_IMAGE}
          alt=""
          loading="eager"
          className="absolute inset-0 h-full w-full"
          imgClassName="h-full w-full object-cover object-[72%_center] opacity-75"
          fallback={
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,#33452a,#0b0f0b_70%)]" />
          }
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black via-black/80 to-black/20" />
        <div className="relative z-10 max-w-lg">
          <p className="text-[10px] font-black uppercase tracking-[0.22em] text-accent">
            AlphaBody
          </p>
          <h1 className="mt-2 font-display text-3xl font-black tracking-tight sm:text-4xl">
            BeatLift
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-white/75">
            Strength, mobility and movement for real life. Join live sessions, move at your own pace
            and build habits that lift your whole day.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Link
              to="/events"
              className="inline-flex items-center gap-1.5 rounded-full bg-accent px-4 py-2.5 text-sm font-bold text-accent-foreground"
            >
              Find a session <ArrowRight className="h-4 w-4" />
            </Link>
            {beatLiftRoom && (
              <Link
                to="/rooms/$roomId"
                params={{ roomId: beatLiftRoom.id }}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white backdrop-blur"
              >
                <Users className="h-4 w-4" /> BeatLift Room
              </Link>
            )}
          </div>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: Dumbbell, label: "Strength", value: "Build" },
          { icon: Flame, label: "Mobility", value: "Move" },
          { icon: HeartPulse, label: "Recovery", value: "Restore" },
        ].map((item) => (
          <div
            key={item.label}
            className="rounded-2xl border border-divider bg-card p-3 text-center sm:p-4"
          >
            <item.icon className="mx-auto h-5 w-5 text-[#1F7A4D]" />
            <p className="mt-2 text-[11px] font-black uppercase tracking-wider text-text-primary">
              {item.value}
            </p>
            <p className="mt-0.5 text-[10px] text-text-secondary">{item.label}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-text-primary">Upcoming sessions</h2>
            <p className="mt-1 text-xs text-text-secondary">
              Live and on-demand movement with the community.
            </p>
          </div>
          <Link
            to="/events"
            className="inline-flex items-center gap-1 text-xs font-bold text-[#1F7A4D]"
          >
            All events <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : events.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {events.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-divider bg-subtle/40 p-6">
            <EmptyState
              icon={<CalendarDays className="h-6 w-6 text-text-secondary" />}
              title="No BeatLift sessions scheduled"
              body="New movement sessions are added regularly. Browse all events to find your next one."
              action={
                <Link
                  to="/events"
                  className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                >
                  Browse events
                </Link>
              }
            />
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-divider bg-[#F7F5EE] p-5">
        <h2 className="font-display text-lg font-bold text-text-primary">Move at your pace</h2>
        <p className="mt-2 text-sm leading-relaxed text-text-secondary">
          BeatLift is not about punishing workouts. It is about showing up for your body with
          strength, mobility and recovery that fit your life. Start where you are, and build from
          there.
        </p>
      </section>
    </div>
  );
}
