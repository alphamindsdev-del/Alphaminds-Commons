import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { useMyProfile } from "@/hooks/useMyProfile";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { HOUSE_MAP, HOUSES, type HouseId } from "@/lib/constants";
import { Avatar } from "@/components/common/Avatar";
import { HouseBadge } from "@/components/common/HouseBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { PostCard } from "@/components/posts/PostCard";
import { EditProfileModal } from "@/components/profile/EditProfileModal";
import { Settings, LogOut } from "lucide-react";

export const Route = createFileRoute("/profile/")({
  head: () => ({ meta: [{ title: `Profile · AlphaMinds` }] }),
  component: ProfilePage,
});

function ProfilePage() {
  const { member: authMember, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const [editOpen, setEditOpen] = useState(false);

  const handleLogout = () => {
    clearSession();
    navigate({ to: "/" });
  };
  const { data: profile } = useMyProfile();
  const { data: myChallengesData } = useMyChallenges();
  const m: {
    name: string; username: string; primaryHouse: HouseId; bio: string; chapter: string;
    joinedAt: string; streak: number; totalPoints: number; scores: Record<string, number>;
    badges: any[]; secondaryHouses: string[]; id: string;
  } = profile ? {
    name: profile.display_name ?? authMember?.display_name ?? "Member",
    username: profile.username ?? "",
    primaryHouse: profile.primary_house ?? (authMember?.primary_house ?? "wellness"),
    bio: (profile as any)?.bio ?? "",
    chapter: (profile as any)?.chapter ?? authMember?.chapter_id ?? "",
    joinedAt: (profile as any)?.joined_at ?? "",
    streak: (profile as any)?.streak ?? 0,
    totalPoints: (profile as any)?.total_points ?? 0,
    scores: (profile as any)?.scores ?? { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 },
    badges: (profile as any)?.badges ?? [],
    secondaryHouses: (profile as any)?.secondary_houses ?? [],
    id: authMember?.id ?? "",
  } : authMember ? {
    name: authMember.display_name,
    username: authMember.username,
    primaryHouse: authMember.primary_house,
    bio: "",
    chapter: authMember.chapter_id ?? "",
    joinedAt: "",
    streak: 0,
    totalPoints: 0,
    scores: { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 },
    badges: [],
    secondaryHouses: [],
    id: authMember.id,
  } : { name: "Member", username: "", primaryHouse: "wellness" as HouseId, bio: "", chapter: "", joinedAt: "", streak: 0, totalPoints: 0, scores: { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 }, badges: [], secondaryHouses: [], id: "" };
  const primary = HOUSE_MAP[m.primaryHouse];
  const myPosts: any[] = [];
  const myChallenges = (myChallengesData?.data ?? []).slice(0, 2).map((c: any) => ({
    ...c, joined: true, participants: c.participant_count ?? 0, daysLeft: c.days_left ?? 0,
    points: c.points ?? 0, current: c.current ?? 0, target: c.target ?? 0,
    unit: c.unit ?? "", metric: c.metric ?? "", log: c.log ?? [],
  }));
  return (
    <div className="space-y-8">
      <header className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="h-40 sm:h-56" style={{ background: `linear-gradient(135deg, ${primary.color}, ${primary.color}99, #1e3f47)` }} />
        <div className="px-4 sm:px-6 lg:px-8 -mt-12">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4">
            <div className="ring-4 ring-background rounded-full"><Avatar name={m.name} size="xl" color={primary.color} /></div>
            <div className="flex-1">
              <h1 className="font-black text-3xl">{m.name}</h1>
              <p className="text-text-secondary">@{m.username}</p>
              <p className="text-text-primary mt-2">{m.bio}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-text-secondary">
                <span className="rounded-full bg-subtle px-2.5 py-1 font-bold">📍 {m.chapter}</span>
                <span>Joined {m.joinedAt}</span>
              </div>
            </div>
            <button onClick={() => setEditOpen(true)} className="rounded-xl border border-border font-bold px-4 py-2 text-sm">Edit Profile</button>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Streak", value: `${m.streak} 🔥` },
          { label: "Total Points", value: m.totalPoints },
          { label: "Challenges", value: 4 },
          { label: "Events", value: 3 },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 text-center">
            <p className="text-[10px] uppercase font-bold tracking-widest text-text-secondary">{s.label}</p>
            <p className="font-black text-xl mt-1">{s.value}</p>
          </div>
        ))}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">House Memberships</h2>
        <div className="flex flex-wrap gap-2">
          <HouseBadge house={m.primaryHouse} size="lg" />
          {m.secondaryHouses.map((h: string) => <HouseBadge key={h} house={h as HouseId} size="md" />)}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <h2 className="font-bold text-lg mb-4">Five Houses Score</h2>
        <div className="space-y-3">
          {HOUSES.map((h) => (
            <ProgressBar key={h.id} value={m.scores[h.id]} max={250} color={h.color} label={`${h.emoji} ${h.name}`} />
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Badges</h2>
        <div className="flex gap-3 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
          {m.badges.map((b: any) => (
            <div key={b.id} className="shrink-0 w-28 rounded-2xl border border-border bg-card p-4 text-center">
              <div className="text-3xl">{b.icon}</div>
              <p className="font-bold text-xs mt-2">{b.name}</p>
              <p className="text-[10px] text-text-secondary mt-0.5">Earned {b.earnedAt}</p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-3">Active Challenges</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          {myChallenges.map((c) => <ChallengeCard key={c.id} challenge={c} compact />)}
        </div>
      </section>

      {myPosts.length > 0 && (
        <section>
          <h2 className="font-bold text-lg mb-3">Recent Posts</h2>
          <div className="space-y-4">
            {myPosts.map((p) => <PostCard key={p.id} post={p} />)}
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-border bg-card divide-y divide-border card-shadow">
        <Link to="/settings" className="flex items-center justify-between p-4 hover:bg-subtle transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center"><Settings className="h-5 w-5" /></div>
            <span className="font-bold text-text-primary">Settings</span>
          </div>
          <span className="text-text-secondary text-sm">→</span>
        </Link>
        <button onClick={handleLogout} className="flex items-center justify-between p-4 w-full text-left hover:bg-subtle transition-colors">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center"><LogOut className="h-5 w-5" /></div>
            <span className="font-bold text-destructive">Log out</span>
          </div>
        </button>
      </section>

      <EditProfileModal open={editOpen} onClose={() => setEditOpen(false)} />
    </div>
  );
}
