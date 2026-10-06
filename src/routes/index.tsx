import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useEvents } from "@/hooks/useEvents";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { useDailyContent } from "@/hooks/useDailyContent";
import type { ChallengeItem, JourneyData } from "@/lib/types";
import { getMediaUrl } from "@/lib/utils";
import { levelCopy } from "@/lib/levels";
import { LandingPage } from "@/components/landing/LandingPage";

import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SectionHeading } from "@/components/common/PageHeader";
import { EventCard } from "@/components/events/EventCard";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import {
  Flame,
  Quote,
  ArrowRight,
  Share2,
  BookMarked,
  Play,
  Users,
  CalendarDays,
  Lock,
  Check,
  Calendar,
  Target,
  GraduationCap,
  ArrowUpRight,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AlphaMinds Commons" },
      { name: "description", content: "A digital community for human flourishing." },
    ],
  }),
  component: IndexRoute,
});

/* Root "/" route:
   - Logged-out visitors see the public landing page (§0 of the landing spec).
   - Logged-in members skip straight to the Home dashboard. */
function IndexRoute() {
  const { isAuthenticated } = useAuthStore();
  return isAuthenticated ? <Home /> : <LandingPage />;
}

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

/* ───────── Progress ring (Your Journey) ───────── */
function ProgressRing({ value, total, size = 88 }: { value: number; total: number; size?: number }) {
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = total > 0 ? Math.min(1, value / total) : 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--divider)" strokeWidth={stroke} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="var(--accent-purple)"
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - pct)}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
    </svg>
  );
}

/* ───────── Commons header (§3) ───────── */
function CommonsHeader({ name, streak }: { name: string; streak: number }) {
  return (
    <header className="space-y-3">
      <h1 className="text-[26px] sm:text-[34px] font-extrabold text-text-primary leading-[1.1] tracking-tight">
        {greeting()},{" "}
        <span className="relative inline-block">
          {name.split(" ")[0]}
          <span className="absolute -bottom-1 left-0 right-0 h-1.5 rounded-full bg-accent" />
        </span>
      </h1>
      <div className="flex items-center gap-4 text-text-secondary">
        <span className="inline-flex items-center gap-1.5 font-bold text-text-primary">
          <Flame className="h-4 w-4" style={{ color: "var(--flame-red)" }} />
          {streak} day streak
        </span>
      </div>
    </header>
  );
}

/* ───────── Today's Code card (§4) ───────── */
function TodaysCodeCard({ code }: { code: any }) {
  const { member } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const passage: string = code?.passage ?? "";
  const title: string = code?.title ?? "No Code Today";
  const isPublished: boolean = code?.is_published ?? true;
  const scheduled: string | null = code?.scheduled_date ?? null;
  const byline = scheduled
    ? `The Code • ${new Date(scheduled).toLocaleDateString("en-US", { month: "long", day: "numeric" })}`
    : "The Code";

  const handleSave = async () => {
    if (!code?.id) return;
    if (!member) { window.location.href = "/login"; return; }
    try {
      await apiFetch(`/v1/code/${code.id}/save`, { method: "POST" });
      setSaved(true);
      toast.success("Saved to your collection");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const handleShare = async () => {
    if (!passage) return;
    const url = `${window.location.origin}/code`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: passage, url });
        return;
      } catch {
        // user dismissed the share sheet — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${passage}\n\n${url}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not share");
    }
  };

  return (
    <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6 relative overflow-hidden">
      <div className="flex items-center gap-2.5">
        <span className="h-7 w-7 rounded-lg bg-accent-dark-green flex items-center justify-center shrink-0">
          <Quote className="h-3.5 w-3.5 text-white" />
        </span>
        <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-dark-green">
          Today&apos;s Code
        </span>
      </div>

      <div className="relative mt-4">
        <p className="text-lg sm:text-xl font-bold text-text-primary leading-snug">
          {isPublished ? (
            <>
              <span className="text-accent-dark-green mr-1">“</span>
              {passage}
              <span className="text-accent-dark-green">”</span>
            </>
          ) : (
            "No code published for today yet."
          )}
        </p>
        {/* decorative botanical sprig */}
        <svg
          className="pointer-events-none absolute -right-1 -top-1 h-12 w-12 text-accent-dark-green/20 hidden sm:block"
          viewBox="0 0 100 100"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M50 95 C50 60 50 40 50 18" strokeLinecap="round" />
          <path d="M50 70 C40 64 30 66 22 58 C32 56 42 58 50 64" strokeLinecap="round" />
          <path d="M50 55 C60 49 70 51 78 43 C68 41 58 43 50 49" strokeLinecap="round" />
          <path d="M50 40 C42 35 34 36 28 30 C36 28 44 30 50 35" strokeLinecap="round" />
        </svg>
      </div>

      <p className="mt-4 text-xs text-text-secondary">{byline}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/code"
          className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold"
        >
          Read more <ArrowRight className="h-4 w-4" />
        </Link>
        <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary">
          <BookMarked className="h-4 w-4" /> {saved ? "Saved" : "Save"}
        </button>
        <button
          onClick={handleShare}
          className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </section>
  );
}

/* ───────── Your Journey card (§5) ───────── */
function JourneyStepNode({ state, icon: Icon, label, sub }: { state: "done" | "active" | "locked" | "reward"; icon: any; label: string; sub: string }) {
  const ring =
    state === "done"
      ? "bg-accent-purple text-white"
      : state === "active" || state === "reward"
        ? "bg-bg-card-white text-accent-purple border-2 border-accent-purple"
        : "bg-lock-gray text-white";
  return (
    <div className="flex flex-col items-center gap-1.5 min-w-[64px]">
      <div className={`h-11 w-11 rounded-full flex items-center justify-center shrink-0 ${ring}`}>
        {state === "done" ? <Check className="h-5 w-5" /> : state === "locked" ? <Lock className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
      </div>
      <span className={`text-[11px] font-bold text-center leading-tight ${state === "locked" ? "text-lock-gray" : "text-text-primary"}`}>{label}</span>
      <span className={`text-[10px] text-center leading-tight ${state === "locked" ? "text-lock-gray" : "text-text-secondary"}`}>{sub}</span>
    </div>
  );
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  rel_fi: Play,
  claim_file: BookMarked,
  assignment: Target,
  assessment: GraduationCap,
  quiz: GraduationCap,
  lesson: GraduationCap,
  course: GraduationCap,
  reading: GraduationCap,
};

function YourJourneyCard({ name, membershipLevel }: { name: string; membershipLevel: string }) {
  const { data: journey } = useQuery<JourneyData>({
    queryKey: ["journey"],
    queryFn: () => apiFetch<JourneyData>("/v1/journey"),
    staleTime: 30000,
  });

  const level = journey?.level ?? membershipLevel;
  const nextLevel = journey?.next_level ?? null;
  const nextCopy = nextLevel ? levelCopy(nextLevel) : null;
  const completed = journey?.completed_count ?? 0;
  const total = journey?.total_count ?? 0;

  const steps = (journey?.activities ?? []).slice(0, 5).map((a) => ({
    label: a.title,
    sub:
      a.status === "completed"
        ? "Done"
        : a.status === "locked"
          ? "Locked"
          : a.type === "rel_fi"
            ? "Play Now"
            : "Start",
    state: (a.status === "completed" ? "done" : a.status === "active" ? "active" : "locked") as "done" | "active" | "locked",
    icon: TYPE_ICONS[a.type] ?? Check,
  }));

  return (
    <section>
      <div className="flex items-end justify-between mb-4">
        <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-text-primary">YOUR JOURNEY</h2>
        <Link to="/journey" className="text-sm font-bold text-accent-purple inline-flex items-center gap-1">
          View all <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
        <div className="flex items-center gap-5">
          <div className="relative">
            <ProgressRing value={completed} total={total} />
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-extrabold text-text-primary leading-none">{completed}</span>
              <span className="text-[10px] text-text-secondary">of {total}</span>
            </div>
          </div>
          <div>
            <p className="eyebrow-purple">{level.replace(/_/g, " ")} JOURNEY</p>
            <h3 className="mt-1 text-lg font-bold text-text-primary">You&apos;re on your way, {name.split(" ")[0]}!</h3>
            <p className="mt-1 text-sm text-text-secondary">
              {nextCopy
                ? `Complete the steps below to become ${nextCopy.article} ${nextCopy.label} and join Alpha Circle.`
                : "You're progressing through the AlphaMinds journey."}
            </p>
          </div>
        </div>

        {steps.length === 0 ? (
          <p className="mt-6 text-sm text-text-secondary">Your journey steps will appear here once they are published.</p>
        ) : (
          <div className="mt-6 flex items-start justify-between gap-1 overflow-x-auto scrollbar-none">
            {steps.map((s, i) => (
              <div key={s.label} className="flex items-start gap-1">
                <JourneyStepNode state={s.state} icon={s.icon} label={s.label} sub={s.sub} />
                {i < steps.length - 1 && <div className="h-px w-4 sm:w-8 bg-divider mt-5 shrink-0" />}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ───────── Lower two-card row (§6) ───────── */
function MyChapterCard({ chapterName, members }: { chapterName: string; members: number }) {
  return (
    <div className="rounded-2xl bg-bg-card-white border border-divider p-5 sm:p-6 space-y-4">
      <p className="eyebrow">MY CHAPTER</p>
      <div className="flex items-center gap-3">
        <span className="h-11 w-11 rounded-full border-2 border-accent-purple flex items-center justify-center text-accent-purple shrink-0">
          <Users className="h-5 w-5" />
        </span>
        <div>
          <p className="font-bold text-text-primary">{chapterName}</p>
          <p className="text-xs text-text-secondary">{members} members</p>
        </div>
      </div>
      <div className="h-px bg-divider" />
      <div className="flex items-start gap-2">
        <CalendarDays className="h-4 w-4 mt-0.5 text-accent-purple shrink-0" />
        <div>
          <p className="text-xs font-bold text-text-primary">Next Alpha Circle</p>
          <p className="text-sm font-semibold text-text-primary">TBA</p>
        </div>
      </div>
      <div className="flex items-start gap-2">
        <Lock className="h-4 w-4 mt-0.5 text-lock-gray shrink-0" />
        <p className="text-xs text-text-secondary">Complete your Seeker Journey to participate in Alpha Circle.</p>
      </div>
    </div>
  );
}

function DailyInsightCard({ title, mediaKey }: { title?: string | null; mediaKey?: string | null }) {
  const mediaUrl = mediaKey ? getMediaUrl(mediaKey) : null;
  return (
    <div className="rounded-2xl bg-bg-card-white border border-divider p-5 sm:p-6 space-y-4 relative">
      <p className="eyebrow-green">ALPHAMINDS DAILY</p>
      <div className="flex items-center gap-3">
        <span className="h-12 w-12 rounded-xl bg-accent-dark-green flex items-center justify-center shrink-0">
          <Play className="h-5 w-5 text-white" />
        </span>
        <div>
          <p className="font-bold text-text-primary">Daily Insight</p>
          <p className="text-xs text-text-secondary truncate max-w-[200px]">{title || "Today's reflection"}</p>
        </div>
      </div>
      {mediaUrl ? (
        <a href={mediaUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold">
          Listen now <ArrowRight className="h-4 w-4" />
        </a>
      ) : (
        <span className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold">
          Listen now <ArrowRight className="h-4 w-4" />
        </span>
      )}
    </div>
  );
}

/* ───────── Home ───────── */
function Home() {
  const { member: authMember } = useAuthStore();
  const { data: profile } = useMyProfile();
  const { data: code } = useQuery({ queryKey: ["code/today"], queryFn: () => apiFetch<any>("/v1/code/today"), staleTime: 60000 });
  const { data: dailyData } = useDailyContent();
  const { data: eventsData, isLoading: eventsLoading } = useEvents("global");
  const { data: myChallengesData, isLoading: challengesLoading } = useMyChallenges();
  const { data: homePlans, isLoading: plansLoading } = useQuery({ queryKey: ["plans"], queryFn: () => apiFetch<any[]>("/v1/plans"), staleTime: 60000 });

  const member = profile
    ? {
        name: profile.display_name ?? authMember?.display_name ?? "Member",
        username: profile.username ?? "",
        chapter: profile.chapter ?? authMember?.chapter_id ?? "",
        streak: profile.streak ?? 0,
        membershipLevel: (profile.membership_level ?? authMember?.membership_level ?? "SEEKER") as string,
        id: profile.id,
      }
    : authMember
      ? {
          name: authMember.display_name,
          username: authMember.username,
          chapter: authMember.chapter_id ?? "",
          streak: 0,
          membershipLevel: authMember.membership_level ?? "SEEKER",
          id: authMember.id,
        }
      : null;

  const chapterName = member?.chapter || "My Chapter";

  return (
    <div className="mx-auto max-w-[720px] space-y-8 pb-4">
      <CommonsHeader name={member?.name ?? "Member"} streak={member?.streak ?? 0} />

      <TodaysCodeCard code={code} />

      <YourJourneyCard name={member?.name ?? "Member"} membershipLevel={member?.membershipLevel ?? "SEEKER"} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <MyChapterCard chapterName={chapterName} members={12} />
        <DailyInsightCard title={dailyData?.content?.title} mediaKey={dailyData?.content?.media_r2_key} />
      </div>

      {/* Upcoming Events */}
      <section>
        <SectionHeading
          kicker="Show Up"
          title="Upcoming Events"
          action={<Link to="/events" className="inline-flex items-center gap-1 text-sm font-bold text-accent-purple">View all <ArrowUpRight className="h-4 w-4" /></Link>}
        />
        {eventsLoading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (eventsData?.data ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {(eventsData?.data ?? []).slice(0, 3).map((e: any) => (
              <EventCard key={e.id} event={{ ...e, date: e.starts_at ? new Date(e.starts_at).toLocaleDateString() : "", time: e.starts_at ? new Date(e.starts_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : "", format: e.format ?? "", coverImage: e.cover_r2_key ? getMediaUrl(e.cover_r2_key) : undefined, host: { name: e.host?.display_name ?? "", avatar: "" }, rsvped: e.is_rsvped === "going", full: (e.rsvp_count ?? 0) >= (e.rsvp_limit ?? 999999), tags: e.tags ?? [], rsvpCount: e.rsvp_count ?? 0, capacity: e.rsvp_limit ?? 100, location: e.location_name ?? "" }} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Calendar className="h-5 w-5" />} title="No upcoming events" body="There are no events scheduled right now." />
        )}
      </section>

      {/* Active Challenges */}
      <section>
        <SectionHeading
          kicker="Keep Moving"
          title="Active Challenges"
          action={<Link to="/challenges" className="inline-flex items-center gap-1 text-sm font-bold text-accent-purple">View all <ArrowUpRight className="h-4 w-4" /></Link>}
        />
        {challengesLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (myChallengesData?.active ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {(myChallengesData?.active ?? []).map((c: ChallengeItem) => (
              <ChallengeCard key={c.id} challenge={{ id: c.id, house: c.house, name: c.name, metric: c.metric, type: c.type ?? "", joined: true, current: c.current ?? 0, target: c.target ?? 0, description: c.description ?? "", participants: c.participants ?? 0, daysLeft: c.daysLeft ?? 0, points: c.points ?? 0 }} />
            ))}
          </div>
        ) : (
          <EmptyState icon={<Target className="h-5 w-5" />} title="No active challenges" body="Join a challenge to start building daily habits." />
        )}
      </section>

      {/* Plans */}
      <section>
        <SectionHeading
          kicker="Your Learning Path"
          title="Plans"
          action={<Link to="/plans" className="inline-flex items-center gap-1 text-sm font-bold text-accent-purple">See more <ArrowUpRight className="h-4 w-4" /></Link>}
        />
        {plansLoading ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {Array.from({ length: 2 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : (homePlans ?? []).length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {(homePlans ?? []).slice(0, 2).map((plan: any) => {
              const pct = plan.total_items > 0 ? Math.round((plan.completed_items / plan.total_items) * 100) : 0;
              return (
                <Link key={plan.id} to="/plans/$planId" params={{ planId: plan.id }} className="group relative overflow-hidden rounded-2xl border border-divider bg-card p-5 card-shadow">
                  <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-primary-light to-accent opacity-80" />
                  <div className="flex items-center gap-1.5 mb-1">
                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-text-secondary">{plan.difficulty}</span>
                    {plan.estimated_duration && <><span className="text-text-secondary text-[10px]">·</span><span className="text-text-secondary text-[10px] flex items-center gap-1"><Calendar className="h-3 w-3" />{plan.estimated_duration}</span></>}
                  </div>
                  <h3 className="font-bold text-text-primary group-hover:text-primary transition-colors">{plan.title}</h3>
                  <p className="mt-0.5 text-xs text-text-secondary line-clamp-2">{plan.description}</p>
                  <div className="mt-4 flex items-center gap-3">
                    <div className="flex-1 h-1.5 rounded-full bg-subtle overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-text-secondary tabular-nums shrink-0">{plan.completed_items}/{plan.total_items}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <EmptyState icon={<GraduationCap className="h-5 w-5" />} title="No plans yet" body="Start a learning plan to track your progress." />
        )}
      </section>
    </div>
  );
}
