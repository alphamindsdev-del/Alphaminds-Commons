import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { GraduationCap, Clock, CheckCircle2, ChevronRight, ArrowRight, Play } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Plans · AlphaMinds" }] }),
  component: PlansPage,
});

interface Plan {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_r2_key: string | null;
  difficulty: string;
  estimated_duration: string | null;
  total_items: number;
  completed_items: number;
}

function PlansPage() {
  const isDetail = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/plans/$planId"),
  });
  const { data: plans, isLoading } = useQuery<Plan[]>({
    queryKey: ["plans"],
    queryFn: () => apiFetch<Plan[]>("/v1/plans"),
  });
  if (isDetail) return <Outlet />;

  const difficultyTone = (d: string) =>
    d === "beginner" ? { label: "Beginner", cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" }
    : d === "intermediate" ? { label: "Intermediate", cls: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20" }
    : { label: "Advanced", cls: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20" };

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Your Learning Path"
        title="Plans"
        subtitle="Curated, structured learning journeys. Pick a plan and start moving — every item you complete builds your progress."
      />

      {isLoading ? (
        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2].map((i) => (
            <div key={i} className="rounded-3xl border border-border bg-card overflow-hidden animate-pulse">
              <div className="h-56 bg-subtle" />
              <div className="p-5 space-y-3"><div className="h-5 w-3/4 bg-subtle rounded" /><div className="h-3 w-full bg-subtle rounded" /><div className="h-3 w-1/2 bg-subtle rounded" /></div>
            </div>
          ))}
        </div>
      ) : !plans?.length ? (
        <div className="text-center py-24 text-text-secondary rounded-3xl border-2 border-dashed border-border bg-card/50">
          <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-40" />
          <p className="font-semibold text-lg">No plans available yet</p>
          <p className="text-sm mt-1">Check back soon for new learning plans.</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {plans.map((plan) => {
            const pct = plan.total_items > 0 ? Math.round((plan.completed_items / plan.total_items) * 100) : 0;
            const tone = difficultyTone(plan.difficulty);
            const idx = String(plans.indexOf(plan) + 1).padStart(2, "0");
            return (
              <Link key={plan.id} to="/plans/$planId" params={{ planId: plan.id }} className="group relative overflow-hidden rounded-3xl border border-border bg-card card-shadow card-glow">
                <div className="relative aspect-[2/1] overflow-hidden bg-gradient-to-br from-primary via-primary-dark to-[#0F1923]">
                  <div className="subtle-grid absolute inset-0 opacity-40" />
                  <span className="absolute -bottom-6 right-2 font-display font-bold text-[8rem] leading-none text-white/[0.08] tracking-tighter select-none">{idx}</span>
                  <div className="absolute top-4 right-4 flex items-center gap-2">
                    <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest border", tone.cls)}>{tone.label}</span>
                    {plan.estimated_duration && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white"><Clock className="h-3 w-3" />{plan.estimated_duration}</span>
                    )}
                  </div>
                  <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
                    <div className="flex items-center gap-2 text-white/80">
                      <GraduationCap className="h-4 w-4 text-accent" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">AlphaMinds Plan</span>
                    </div>
                    <span className="flex h-10 w-10 items-center justify-center rounded-full btn-accent opacity-90 transition-transform group-hover:scale-110">
                      <Play className="h-4 w-4 ml-0.5" />
                    </span>
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
                    <div className="h-full bg-accent transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h3 className="font-display font-semibold text-2xl tracking-tighter text-text-primary group-hover:text-primary transition-colors">{plan.title}</h3>
                      <p className="mt-1 text-sm text-text-secondary line-clamp-2">{plan.description}</p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 min-w-[90px] h-1.5 rounded-full bg-subtle overflow-hidden">
                        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-text-secondary tabular-nums shrink-0">{plan.completed_items}/{plan.total_items} done</span>
                    </div>
                    <span className="inline-flex items-center gap-1 text-sm font-bold text-primary">Start <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" /></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
