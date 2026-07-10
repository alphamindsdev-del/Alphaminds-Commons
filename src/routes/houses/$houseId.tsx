import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { HOUSE_MAP, type HouseId } from "@/lib/constants";
import { useHouseDetail } from "@/hooks/useHouseDetail";
import { RoomCard } from "@/components/rooms/RoomCard";
import { EventCard } from "@/components/events/EventCard";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { MessageSquare, Calendar, Target, BookOpen } from "lucide-react";

export const Route = createFileRoute("/houses/$houseId")({
  head: ({ params }) => ({
    meta: [{ title: `${HOUSE_MAP[params.houseId as HouseId]?.fullName ?? "House"} · AlphaMinds` }],
  }),
  component: HouseDetailPage,
});

function HouseDetailPage() {
  const { houseId } = Route.useParams();
  const { data, isLoading } = useHouseDetail(houseId);
  const h = HOUSE_MAP[houseId as HouseId];
  if (!h) throw notFound();
  const [tab, setTab] = useState<"rooms" | "events" | "challenges" | "resources">("rooms");

  const houseRooms = (data?.rooms as any[]) ?? [];
  const houseEvents = (data?.events as any[]) ?? [];
  const houseChallenges = (data?.challenges as any[]) ?? [];

  return (
    <div className="-mx-4 sm:-mx-6 lg:-mx-8">
      <div className="px-4 sm:px-6 lg:px-8">
        <Link to="/houses" className="text-sm font-semibold text-text-secondary">← All Houses</Link>
      </div>

      <header className="relative mt-4 mx-4 sm:mx-6 lg:mx-8 rounded-3xl p-8 sm:p-12 text-white overflow-hidden" style={{ background: `linear-gradient(135deg, ${h.color}, ${h.color}aa, #1e3f47)` }}>
        <div className="absolute -top-20 -right-20 h-80 w-80 rounded-full blur-3xl opacity-30 bg-white" />
        <div className="relative">
          <div className="text-6xl mb-4">{h.emoji}</div>
          <h1 className="font-black text-4xl sm:text-5xl">{h.fullName}</h1>
          <p className="italic text-white/85 text-lg mt-1">{h.tagline}</p>
          <p className="mt-4 max-w-2xl text-white/90">{h.description}</p>
          <p className="mt-6 text-xs font-bold uppercase tracking-widest text-white/80">
            {houseRooms.length} Rooms · 1,247 Members · {houseEvents.length} Events
          </p>
        </div>
      </header>

      <div className="sticky top-0 md:top-0 z-20 glass border-b border-border mt-6">
        <div className="px-4 sm:px-6 lg:px-8 flex gap-1 overflow-x-auto scrollbar-none">
          {(["rooms", "events", "challenges", "resources"] as const).map((t) => (
            <button key={t} onClick={() => setTab(t)} className="relative py-3 px-4 text-sm font-bold capitalize whitespace-nowrap" style={{ color: tab === t ? h.color : "var(--text-secondary)" }}>
              {t}
              {tab === t && <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full" style={{ background: h.color }} />}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 mt-6">
        {tab === "rooms" && (
          houseRooms.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {houseRooms.map((r) => <RoomCard key={r.id} room={r} suggested={!r.joined} />)}
            </div>
          ) : (
            <EmptyState
              icon={<MessageSquare className="h-6 w-6" />}
              title="No rooms yet"
              body="This house doesn't have any rooms yet. Check back soon."
              action={<Link to="/rooms" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse all rooms</Link>}
            />
          )
        )}
        {tab === "events" && (
          houseEvents.length > 0 ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {houseEvents.map((e) => <EventCard key={e.id} event={e} />)}
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="h-6 w-6" />}
              title="No upcoming events"
              body="There are no events scheduled for this house right now."
              action={<Link to="/events" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse all events</Link>}
            />
          )
        )}
        {tab === "challenges" && (
          houseChallenges.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">
              {houseChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} />)}
            </div>
          ) : (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No active challenges"
              body="No active challenges right now — check back next week."
              action={<Link to="/challenges" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse all challenges</Link>}
            />
          )
        )}
        {tab === "resources" && (
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              { t: "House Reading List", d: "12 books curated by the House guides." },
              { t: "Practice Guides", d: "Short PDFs to deepen your daily work." },
              { t: "Guest Conversations", d: "Audio from invited mentors." },
              { t: "Founding Principles", d: "What this House stands for." },
            ].map((r) => (
              <div key={r.t} className="rounded-2xl border border-border bg-card p-5 card-shadow">
                <h3 className="font-bold text-text-primary">{r.t}</h3>
                <p className="text-sm text-text-secondary mt-1">{r.d}</p>
                <button className="mt-3 text-sm font-bold" style={{ color: h.color }}>Open →</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
