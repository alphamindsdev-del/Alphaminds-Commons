import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useChallenges } from "@/hooks/useChallenges";
import { useMyChallenges } from "@/hooks/useMyChallenges";
import { ChallengeCard } from "@/components/challenges/ChallengeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { cn } from "@/lib/utils";
import { Target } from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/common/PageHeader";

export const Route = createFileRoute("/challenges/")({
  head: () => ({ meta: [{ title: "Challenges · AlphaMinds" }] }),
  component: ChallengesPage,
});

const filters = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
];

const filterLabel = (id: string) => filters.find((f) => f.id === id)?.label ?? id;

function ChallengesPage() {
  const { data: challengesData, isLoading } = useChallenges();
  const { data: myChallengesData } = useMyChallenges();
  const allChallenges = (challengesData?.data ?? []).map((c: any) => ({
    ...c,
    joined: (myChallengesData?.active ?? []).some((mc: any) => mc.id === c.id),
    log: c.log ?? [],
  }));
  const [f, setF] = useState("all");
  const active = allChallenges.filter((c: any) => c.joined);
  const discover = allChallenges.filter((c: any) => !c.joined);
  const list = f === "all" ? allChallenges : active;

  const header = (
    <PageHeader
      eyebrow="Just Show Up"
      title="Challenges"
      subtitle="Small, daily, doable. Built for consistency, not heroics. One rep today beats ten reps someday."
    />
  );

  const pills = (
    <div className="flex gap-2 overflow-x-auto scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
      {filters.map((x) => (
        <button key={x.id} onClick={() => setF(x.id)} className={cn(
          "shrink-0 rounded-full px-4 py-2 text-sm font-semibold transition-all",
          f === x.id ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-8px_rgba(20,20,18,0.5)]" : "bg-card border border-border text-text-secondary hover:text-text-primary hover:border-primary/30",
        )}>{x.label}</button>
      ))}
    </div>
  );

  if (isLoading) {
    return (
      <div className="space-y-8">
        {header}
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  if (f === "all") {
    return (
      <div className="space-y-10">
        {header}
        {pills}

        <section>
          <SectionHeading kicker="In Motion" title="Your Active Challenges" />
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
          <SectionHeading kicker="Discover" title="Find Your Next One" />
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
      {header}
      {pills}
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
