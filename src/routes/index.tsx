import { createFileRoute, Link } from "@tanstack/react-router";
import { DailyContentCard } from "@/components/daily/DailyContentCard";
import { ScoreCard } from "@/components/common/ScoreCard";
import { EventCard } from "@/components/events/EventCard";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useAuthStore } from "@/store/authStore";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useEvents } from "@/hooks/useEvents";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { HOUSE_MAP, houseOfToday } from "@/lib/constants";
import { HOUSES } from "@/lib/constants";
import { Flame, Calendar, Target } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Home · AlphaMinds Commons" },
      { name: "description", content: "Your daily home in the AlphaMinds Commons." },
    ],
  }),
  component: Home,
});

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function Home() {
  const { member: authMember } = useAuthStore();
  const { data: profile } = useMyProfile();
  const { data: eventsData, isLoading: eventsLoading } = useEvents("global");
  const { data: myChallengesData, isLoading: challengesLoading } = useMyChallenges();
  const member = profile ? {
    name: profile.display_name ?? authMember?.display_name ?? "Member",
    username: profile.username ?? "",
    primaryHouse: profile.primary_house ?? authMember?.primary_house ?? "wellness",
    streak: (profile as any)?.streak ?? 0,
    scores: (profile as any)?.scores ?? { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 },
  } : authMember ? {
    name: authMember.display_name,
    username: authMember.username,
    primaryHouse: authMember.primary_house,
    streak: 0,
    scores: { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 },
  } : null;
  const today = houseOfToday();
  const primary = member ? HOUSE_MAP[member.primaryHouse] : HOUSE_MAP["wellness"];

  return (
    <div className="space-y-10">
      {/* Greeting */}
      <section>
        <h1 className="font-black text-3xl sm:text-4xl text-text-primary tracking-tight">
          {greeting()}, {member?.name.split(" ")[0] ?? "Member"} <span className="inline-block">👋</span>
        </h1>
        <p className="mt-1 text-base">
          Welcome to the <span className="font-bold" style={{ color: primary.color }}>{primary.fullName}</span>
        </p>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-bold text-text-primary">
            <span>{today.emoji}</span> {today.dayLabel}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-card border border-border px-3 py-1.5 text-xs font-bold text-text-primary">
            <Flame className="h-3.5 w-3.5 text-amber-500" /> {member?.streak ?? 0}-day streak
          </span>
        </div>
      </section>

      {/* Daily Content - Hero */}
      <DailyContentCard />

      {/* Scores */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">My Progress</h2>
          <Link to="/profile" className="text-sm font-semibold text-primary">View profile →</Link>
        </div>
        <div className="flex sm:grid sm:grid-cols-5 gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {HOUSES.map((h) => (
            <ScoreCard key={h.id} house={h.id} value={member?.scores[h.id] ?? 0} />
          ))}
        </div>
      </section>

      {/* Upcoming Events */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">Upcoming Events</h2>
          <Link to="/events" className="text-sm font-semibold text-primary">View all →</Link>
        </div>
        {eventsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (eventsData?.data ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(eventsData?.data ?? []).slice(0, 3).map((e: any) => <EventCard key={e.id} event={{ ...e, date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "", time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : "", host: { name: e.host?.display_name ?? "", avatar: "" }, rsvped: false, full: false, tags: e.tags ?? [], rsvpCount: e.rsvp_count ?? 0, capacity: e.rsvp_limit ?? 100, location: e.location_name ?? "" }} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar className="h-6 w-6" />}
            title="No upcoming events"
            body="There are no events scheduled right now. Check back soon."
            action={<Link to="/events" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse events</Link>}
          />
        )}
      </section>

      {/* Active Challenges */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-xl">Active Challenges</h2>
          <Link to="/challenges" className="text-sm font-semibold text-primary">View all →</Link>
        </div>
        {challengesLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (myChallengesData?.data ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {(myChallengesData?.data ?? []).map((c: any) => <ChallengeCard key={c.id} challenge={{ ...c, joined: true, participants: c.participant_count ?? 0, daysLeft: c.days_left ?? 0, points: c.points ?? 0, current: c.current ?? 0, target: c.target ?? 0, unit: c.unit ?? "", metric: c.metric ?? "", log: [] }} />)}
          </div>
        ) : (
          <EmptyState
            icon={<Target className="h-6 w-6" />}
            title="No active challenges"
            body="Join a challenge to start building daily habits."
            action={<Link to="/challenges" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse challenges</Link>}
          />
        )}
      </section>
    </div>
  );
}
