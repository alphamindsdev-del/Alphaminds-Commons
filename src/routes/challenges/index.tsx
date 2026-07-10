import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useChallenges } from "@/hooks/useChallenges";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { HOUSES } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";

export const Route = createFileRoute("/challenges/")({
  head: () => ({ meta: [{ title: "Challenges · AlphaMinds" }] }),
  component: ChallengesPage,
});

const filters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  ...HOUSES.map((h) => ({ id: h.id, label: h.name })),
];

const filterLabel = (id: string) => filters.find((f) => f.id === id)?.label ?? id;

function ChallengesPage() {
  const { data: challengesData, isLoading } = useChallenges();
  const { data: myChallengesData } = useMyChallenges();
  const allChallenges = (challengesData?.data ?? []).map((c: any) => ({
    ...c, joined: (myChallengesData?.data ?? []).some((mc: any) => mc.id === c.id),
    participants: c.participant_count ?? 0, daysLeft: c.days_left ?? 0,
    points: c.points ?? 0, current: c.current ?? 0, target: c.target ?? 0,
    unit: c.unit ?? "", metric: c.metric ?? "", log: c.log ?? [],
  }));
  const [f, setF] = useState("all");
  const active = allChallenges.filter((c: any) => c.joined);
  const discover = allChallenges.filter((c: any) => !c.joined);
  const list = f === "all" ? allChallenges : f === "active" ? active : allChallenges.filter((c: any) => c.house === f);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Challenges</h1>
          <p className="text-text-secondary mt-1">Small, daily, doable. Built for consistency, not heroics.</p>
        </header>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (f === "all") {
    return (
      <div className="space-y-8">
        <header>
          <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Challenges</h1>
          <p className="text-text-secondary mt-1">Small, daily, doable. Built for consistency, not heroics.</p>
        </header>

        <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
          {filters.map((x) => (
            <button key={x.id} onClick={() => setF(x.id)} className={cn(
              "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
              f === x.id ? "bg-primary text-white" : "bg-card border border-border text-text-secondary hover:text-text-primary",
            )}>{x.label}</button>
          ))}
        </div>

        <section>
          <h2 className="font-bold text-lg mb-4">Active Challenges</h2>
          {active.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">{active.map((c: any) => <ChallengeCard key={c.id} challenge={c} />)}</div>
          ) : (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No active challenges"
              body="You haven't joined any challenges yet. Pick one from the Discover section below."
            />
          )}
        </section>

        <section>
          <h2 className="font-bold text-lg mb-4">Discover Challenges</h2>
          {discover.length > 0 ? (
            <div className="grid sm:grid-cols-2 gap-4">{discover.map((c: any) => <ChallengeCard key={c.id} challenge={c} />)}</div>
          ) : (
            <EmptyState
              icon={<Target className="h-6 w-6" />}
              title="No more challenges to discover"
              body="You've joined all available challenges. Check back later for new ones."
            />
          )}
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="font-black text-3xl sm:text-4xl text-text-primary">Challenges</h1>
        <p className="text-text-secondary mt-1">Small, daily, doable. Built for consistency, not heroics.</p>
      </header>

      <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
        {filters.map((x) => (
          <button key={x.id} onClick={() => setF(x.id)} className={cn(
            "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-colors",
            f === x.id ? "bg-primary text-white" : "bg-card border border-border text-text-secondary hover:text-text-primary",
          )}>{x.label}</button>
        ))}
      </div>

      {list.length > 0 ? (
        <div className="grid sm:grid-cols-2 gap-4">{list.map((c: any) => <ChallengeCard key={c.id} challenge={c} />)}</div>
      ) : (
        <EmptyState
          icon={<Target className="h-6 w-6" />}
          title={`No ${filterLabel(f)} challenges found`}
          body="There are no challenges matching this filter. Try a different category."
        />
      )}
    </div>
  );
}
