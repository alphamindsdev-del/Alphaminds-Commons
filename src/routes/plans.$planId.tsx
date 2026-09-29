import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { getMediaUrl } from "@/lib/utils";
import { BookOpen, CheckCircle2, Circle, Play, Headphones, FileText, Image, ChevronLeft, ArrowLeft, Flame, Gauge, Clock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/plans/$planId")({
  head: () => ({ meta: [{ title: "Plan · AlphaMinds" }] }),
  component: PlanDetailPage,
});

interface PlanItem {
  id: string;
  section_id: string | null;
  title: string;
  body: string;
  content_type: 'video' | 'audio' | 'article' | 'image';
  media_r2_key: string | null;
  sort_order: number;
  completed: boolean;
}

interface PlanSection {
  id: string;
  title: string;
  description: string;
  sort_order: number;
}

interface PlanDetail {
  id: string;
  title: string;
  slug: string;
  description: string;
  cover_image_r2_key: string | null;
  difficulty: string;
  estimated_duration: string | null;
  sections: PlanSection[];
  items: PlanItem[];
}

function PlanDetailPage() {
  const { planId } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const { data: plan, isLoading } = useQuery<PlanDetail>({
    queryKey: ["plan", planId],
    queryFn: () => apiFetch<PlanDetail>(`/v1/plans/${planId}`),
  });

  const completeMutation = useMutation({
    mutationFn: (itemId: string) => apiFetch(`/v1/plans/${planId}/complete/${itemId}`, { method: "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["plan", planId] });
      queryClient.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: () => toast.error("Failed to mark as complete"),
  });

  const totalItems = plan?.items.length ?? 0;
  const completedItems = plan?.items.filter(i => i.completed).length ?? 0;
  const pct = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  const activeItem = activeItemId ? plan?.items.find(i => i.id === activeItemId) : null;

  const contentTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return <Play className="h-4 w-4" />;
      case 'audio': return <Headphones className="h-4 w-4" />;
      case 'article': return <FileText className="h-4 w-4" />;
      case 'image': return <Image className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const groupedItems = plan?.sections.length
    ? plan.sections.map(section => ({
        section,
        items: plan.items.filter(i => i.section_id === section.id),
      })).filter(g => g.items.length > 0)
    : plan?.items.length
      ? [{ section: null, items: plan.items }]
      : [];

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4"><div className="h-8 w-48 bg-subtle rounded" /><div className="h-4 w-96 bg-subtle rounded" /><div className="h-64 bg-subtle rounded-2xl" /></div>
      </div>
    );
  }

  if (!plan) {
    return <div className="max-w-4xl mx-auto px-4 py-20 text-center text-text-secondary"><BookOpen className="h-12 w-12 mx-auto mb-4 opacity-40" /><p className="font-semibold">Plan not found</p></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <button onClick={() => navigate({ to: "/plans" })} className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary mb-6 transition-colors"><ArrowLeft className="h-4 w-4" /> Back to plans</button>

      {/* Header */}
      <div className="relative overflow-hidden rounded-3xl border border-border bg-card mb-8 card-shadow">
        <div className="relative aspect-video md:aspect-[3/1] bg-gradient-to-br from-primary via-primary-dark to-[#0F1923] overflow-hidden">
          <div className="subtle-grid absolute inset-0 opacity-30" />
          <span className="absolute -bottom-10 right-4 font-display font-bold text-[10rem] leading-none text-white/[0.07] tracking-tighter select-none">
            {String(plan.items.length || plan.sections.length || 0).padStart(2, "0")}
          </span>
          <div className="absolute bottom-4 left-5 right-5 flex items-center justify-between">
            <div className="flex items-center gap-2 text-white/80">
              <BookOpen className="h-4 w-4 text-accent" />
              <span className="text-[10px] font-bold uppercase tracking-widest">{plan.difficulty} Plan</span>
            </div>
            {plan.estimated_duration && (
              <span className="inline-flex items-center gap-1 rounded-full bg-black/30 backdrop-blur px-2.5 py-1 text-[10px] font-bold text-white"><Clock className="h-3 w-3" />{plan.estimated_duration}</span>
            )}
          </div>
        </div>
        <div className="p-6 sm:p-7">
          <h1 className="font-display font-semibold text-3xl sm:text-4xl tracking-tighter text-text-primary">{plan.title}</h1>
          <p className="mt-2 text-sm text-text-secondary leading-relaxed max-w-2xl">{plan.description}</p>

          {/* Progress */}
          <div className="mt-6">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="inline-flex items-center gap-1.5 font-bold text-text-primary"><Flame className="h-4 w-4" style={{ color: "var(--destructive)" }} /> Progress</span>
              <span className="text-text-secondary tabular-nums">{completedItems}/{totalItems} items · {pct}%</span>
            </div>
            <div className="h-2.5 bg-subtle rounded-full overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary via-primary-light to-accent rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_360px]">
        {/* Content list */}
        <div className="space-y-6">
          {groupedItems.length === 0 && <p className="text-text-secondary text-sm">No content yet.</p>}
          {groupedItems.map((group, gi) => (
            <div key={gi}>
              {group.section && (
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs font-black">{gi + 1}</span>
                  <div>
                    <h2 className="font-display font-semibold text-xl tracking-tighter text-text-primary">{group.section.title}</h2>
                    {group.section.description && <p className="text-sm text-text-secondary mt-0.5">{group.section.description}</p>}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                {group.items.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setActiveItemId(item.id)}
                    className={`w-full flex items-center gap-3 p-3.5 rounded-xl border transition-all text-left ${
                      activeItemId === item.id
                        ? 'border-primary bg-primary/5 shadow-[0_8px_24px_-12px_rgba(20,20,18,0.25)]'
                        : 'border-border bg-card hover:border-primary/30 hover:shadow-[0_4px_16px_-8px_rgba(20,20,18,0.15)]'
                    }`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); completeMutation.mutate(item.id); }}
                      className={`shrink-0 ${item.completed ? 'text-emerald-500' : 'text-text-secondary hover:text-primary'}`}
                    >
                      {item.completed ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </button>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="shrink-0 text-text-secondary">{contentTypeIcon(item.content_type)}</span>
                      <span className="text-sm font-medium text-text-primary truncate">{item.title}</span>
                      {item.completed && <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-emerald-500">Done</span>}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Active item viewer */}
        <div className="md:sticky md:top-24">
          {activeItem ? (
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  {contentTypeIcon(activeItem.content_type)}
                  <span className="uppercase tracking-widest font-semibold">{activeItem.content_type}</span>
                </div>
                <button
                  onClick={() => completeMutation.mutate(activeItem.id)}
                  className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-full border transition-colors ${
                    activeItem.completed
                      ? 'border-emerald-500/30 text-emerald-500 bg-emerald-500/5'
                      : 'border-primary/30 text-primary hover:bg-primary/5'
                  }`}
                >
                  {activeItem.completed ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Circle className="h-3.5 w-3.5" />}
                  {activeItem.completed ? 'Completed' : 'Mark complete'}
                </button>
              </div>
              <div className="p-5">
                <h3 className="font-bold text-lg text-text-primary mb-3">{activeItem.title}</h3>

                {activeItem.content_type === 'video' && activeItem.media_r2_key && (
                  <video src={getMediaUrl(activeItem.media_r2_key)} controls className="w-full rounded-xl mb-4 max-h-64 object-cover" />
                )}
                {activeItem.content_type === 'audio' && activeItem.media_r2_key && (
                  <audio src={getMediaUrl(activeItem.media_r2_key)} controls className="w-full mb-4" />
                )}
                {activeItem.content_type === 'image' && activeItem.media_r2_key && (
                  <img src={getMediaUrl(activeItem.media_r2_key)} alt={activeItem.title} className="w-full rounded-xl mb-4 max-h-64 object-cover" />
                )}

                {activeItem.body && (
                  <div className="prose prose-sm prose-invert max-w-none text-text-secondary" dangerouslySetInnerHTML={{ __html: activeItem.body }} />
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-card p-8 text-center text-text-secondary">
              <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="font-semibold">Select an item</p>
              <p className="text-sm mt-1">Click on any item to view its content.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
