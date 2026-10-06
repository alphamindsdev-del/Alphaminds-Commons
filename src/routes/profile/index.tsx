import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { Avatar } from "@/components/common/Avatar";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { getMediaUrl } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { toast } from "@/components/common/Toast";
import {
  Settings,
  LogOut,
  Flame,
  MapPin,
  Sparkles,
  Award,
  CalendarDays,
  ChevronRight,
  Pencil,
  Share2,
  Loader2,
} from "lucide-react";

function fmtMonth(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long" });
}

function fmtDateShort(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Clipboard API can be blocked (permissions, insecure context) — fall back.
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "");
  ta.style.position = "fixed";
  ta.style.opacity = "0";
  document.body.appendChild(ta);
  ta.select();
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(ta);
  }
}

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [{ title: `Profile · AlphaMinds` }] }),
  component: ProfilePage,
});

const SECTION_TITLE = "text-display font-semibold text-xl tracking-tight";

function ProfilePage() {
  const { member: authMember, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const { data: profile, isLoading } = useMyProfile();
  const { data: myChallengesData } = useMyChallenges();

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await apiFetch("/v1/auth/logout", { method: "POST" });
    } catch {
      // Session may already be gone — still clear locally.
    }
    clearSession();
    toast.success("Logged out");
    navigate({ to: "/" });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 sm:space-y-8">
        <header className="-mx-4 sm:-mx-6 lg:-mx-10">
          <div className="h-36 sm:h-48 bg-subtle animate-pulse" />
          <div className="px-4 sm:px-6 lg:px-10">
            <div className="-mt-10 sm:-mt-12 flex items-end justify-between gap-4">
              <div className="h-20 w-20 sm:h-24 sm:w-24 rounded-full bg-subtle ring-4 ring-background animate-pulse" />
              <div className="h-10 w-24 rounded-xl bg-subtle animate-pulse" />
            </div>
            <div className="mt-4 space-y-2">
              <div className="h-7 w-48 rounded bg-subtle animate-pulse" />
              <div className="h-4 w-28 rounded bg-subtle animate-pulse" />
            </div>
          </div>
        </header>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  const m: {
    name: string; username: string; bio: string; chapter: string;
    joinedAt: string; streak: number; totalPoints: number; challengesCompleted: number;
    eventsAttended: number;
    badges: any[]; id: string;
    avatarUrl: string | null; coverPhotoUrl: string | null;
  } = profile ? {
    name: profile.display_name ?? authMember?.display_name ?? "Member",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    chapter: profile.chapter ?? authMember?.chapter_id ?? "",
    joinedAt: fmtMonth(profile.joined_at),
    streak: profile.streak ?? 0,
    totalPoints: profile.total_points ?? 0,
    challengesCompleted: profile.challenges_completed ?? 0,
    eventsAttended: profile.events_attended ?? 0,
    badges: profile.badges ?? [],
    id: authMember?.id ?? "",
    avatarUrl: profile.avatar_url ?? authMember?.avatar_url ?? null,
    coverPhotoUrl: profile.cover_photo_url ?? null,
  } : authMember ? {
    name: authMember.display_name,
    username: authMember.username,
    bio: "",
    chapter: authMember.chapter_id ?? "",
    joinedAt: "",
    streak: 0,
    totalPoints: 0,
    challengesCompleted: 0,
    eventsAttended: 0,
    badges: [],
    id: authMember.id,
    avatarUrl: authMember.avatar_url ?? null,
    coverPhotoUrl: null,
  } : { name: "Member", username: "", bio: "", chapter: "", joinedAt: "", streak: 0, totalPoints: 0, challengesCompleted: 0, eventsAttended: 0, badges: [], id: "", avatarUrl: null, coverPhotoUrl: null };

  const membershipLevel = authMember?.membership_level;
  const roleLabel = authMember?.role && authMember.role !== "member"
    ? authMember.role.replace(/_/g, " ")
    : null;
  const myChallenges = (myChallengesData?.active ?? []).slice(0, 2).map((c: any) => ({
    ...c, joined: true, log: c.log ?? [],
  }));

  const handleShare = async () => {
    const url = `${window.location.origin}/profile/${m.username}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `${m.name} on AlphaMinds`, url });
        return;
      } catch (err) {
        if ((err as Error)?.name === "AbortError") return; // user dismissed the share sheet
      }
    }
    const copied = await copyToClipboard(url);
    if (copied) toast.success("Profile link copied");
    else toast.error("Couldn't copy link");
  };

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <header className="-mx-4 sm:-mx-6 lg:-mx-10">
        <div
          className="relative h-36 sm:h-48 overflow-hidden"
          style={m.coverPhotoUrl ? undefined : { background: "linear-gradient(135deg, var(--primary-dark), var(--accent-dark-green))" }}
        >
          {m.coverPhotoUrl ? (
            <img src={getMediaUrl(m.coverPhotoUrl)} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="absolute -top-6 right-2 font-display font-bold text-[9rem] sm:text-[13rem] leading-none text-white/[0.08] tracking-tighter select-none pointer-events-none">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -top-24 -right-20 h-64 w-64 rounded-full blur-3xl opacity-20 bg-white" />
            </>
          )}
        </div>

        <div className="px-4 sm:px-6 lg:px-10">
          <div className="-mt-10 sm:-mt-12 flex items-end justify-between gap-4">
            <div className="relative z-10 ring-4 ring-background rounded-full shrink-0">
              {m.avatarUrl ? (
                <img src={getMediaUrl(m.avatarUrl)} alt={m.name} className="h-20 w-20 sm:h-24 sm:w-24 rounded-full object-cover" />
              ) : (
                <Avatar name={m.name} size="2xl" />
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleShare}
                aria-label="Share profile"
                className="h-10 w-10 rounded-xl border border-border bg-card flex items-center justify-center text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
              >
                <Share2 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditOpen(true)}
                aria-label="Edit profile"
                className="h-10 rounded-xl border border-border bg-card px-3 sm:px-4 inline-flex items-center gap-2 text-sm font-bold hover:border-primary/40 transition-colors"
              >
                <Pencil className="h-4 w-4 sm:hidden" />
                <span className="hidden sm:inline">Edit Profile</span>
              </button>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="text-display font-semibold text-2xl sm:text-3xl tracking-tight leading-tight">{m.name}</h1>
              {roleLabel && (
                <span className="rounded-full border border-border bg-subtle px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-text-secondary">
                  {roleLabel}
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm mt-1">@{m.username}</p>
            {m.bio && <p className="mt-3 max-w-2xl text-text-primary leading-relaxed">{m.bio}</p>}
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
              {m.chapter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 font-bold">
                  <MapPin className="h-3 w-3" /> {m.chapter}
                </span>
              )}
              {m.joinedAt && (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 font-bold">
                  <CalendarDays className="h-3 w-3" /> Joined {m.joinedAt}
                </span>
              )}
              {membershipLevel && (
                <span className="inline-flex items-center gap-1 rounded-full bg-subtle px-2.5 py-1 font-bold uppercase tracking-widest text-[10px]">
                  <Sparkles className="h-3 w-3" /> {membershipLevel}
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Day Streak", value: m.streak, icon: Flame, color: "#F97316" },
          { label: "Total Points", value: m.totalPoints, icon: Sparkles, color: "#0EA5E9" },
          { label: "Challenges Done", value: m.challengesCompleted, icon: Award, color: "#10B981" },
          { label: "Events Attended", value: m.eventsAttended, icon: MapPin, color: "#6366F1" },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-4 card-shadow">
            <span
              className="h-9 w-9 rounded-xl inline-flex items-center justify-center"
              style={{ background: `${s.color}1A`, color: s.color }}
            >
              <s.icon className="h-[18px] w-[18px]" />
            </span>
            <p className="mt-3 font-display font-semibold text-2xl sm:text-3xl tabular-nums leading-none">{s.value.toLocaleString()}</p>
            <p className="mt-1.5 text-[10px] uppercase font-bold tracking-widest text-text-secondary">{s.label}</p>
          </div>
        ))}
      </section>

      {/* Badges */}
      <section>
        <h2 className={SECTION_TITLE + " mb-3"}>Badges</h2>
        {m.badges.length > 0 ? (
          <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {m.badges.map((b: any) => (
              <div key={b.id} className="shrink-0 w-28 rounded-2xl border border-border bg-card p-4 text-center card-shadow">
                <div className="flex h-9 items-center justify-center">
                  {b.icon ? (
                    <img src={getMediaUrl(b.icon)} alt={b.name} className="h-8 w-8 object-contain" />
                  ) : (
                    <Award className="h-8 w-8 text-primary" />
                  )}
                </div>
                <p className="mt-2 font-bold text-xs leading-tight line-clamp-2">{b.name}</p>
                {b.earnedAt && <p className="text-[10px] text-text-secondary mt-1">Earned {fmtDateShort(b.earnedAt)}</p>}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No badges earned yet. Keep participating to earn badges!</p>
        )}
      </section>

      {/* Active Challenges */}
      <section>
        <h2 className={SECTION_TITLE + " mb-3"}>Active Challenges</h2>
        {myChallenges.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {myChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} compact />)}
          </div>
        ) : (
          <p className="text-sm text-text-secondary">No active challenges. Join one from the challenges page!</p>
        )}
      </section>

      {/* Settings & Logout */}
      <section className="overflow-hidden rounded-2xl border border-border bg-card divide-y divide-border card-shadow">
        <Link to="/settings" className="flex items-center gap-3 p-4 hover:bg-subtle transition-colors">
          <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
            <Settings className="h-5 w-5" />
          </div>
          <span className="flex-1 font-bold text-text-primary">Settings</span>
          <ChevronRight className="h-4 w-4 text-text-secondary" />
        </Link>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="w-full flex items-center gap-3 p-4 text-left hover:bg-subtle transition-colors disabled:opacity-60"
        >
          <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
            <LogOut className="h-5 w-5" />
          </div>
          <span className="flex-1 font-bold text-destructive">Log out</span>
          {loggingOut
            ? <Loader2 className="h-4 w-4 animate-spin text-text-secondary" />
            : <ChevronRight className="h-4 w-4 text-text-secondary" />}
        </button>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
