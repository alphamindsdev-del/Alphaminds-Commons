import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useMyProfile } from "@/hooks/useMyProfile";
import { PageHeader } from "@/components/common/PageHeader";
import { toast } from "sonner";
import { EXAMINER_INDEX, levelCopy, levelIndex } from "@/lib/levels";
import type { JourneyData } from "@/lib/types";
import {
  Flame, Lock, Check, ArrowRight, BookMarked, Share2, Play, GraduationCap, Target, BookOpen, Sparkles,
} from "lucide-react";
import { Link, createFileRoute } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";

export const Route = createFileRoute("/journey")({
  component: JourneyPage,
});

const TYPE_ICONS: Record<string, LucideIcon> = {
  rel_fi: Play,
  claim_file: BookMarked,
  assignment: Target,
  assessment: GraduationCap,
  quiz: GraduationCap,
  lesson: BookOpen,
  course: BookOpen,
  reading: BookOpen,
  video: Play,
  audio: Play,
  article: BookOpen,
  resource: Sparkles,
  custom: Sparkles,
};

function JourneyPage() {
  const { member } = useAuthStore();

  if (!member) {
    return (
      <div className="py-24 text-center">
        <p className="text-text-secondary">Please sign in to view your journey</p>
        <Link to="/login" className="mt-4 inline-flex items-center gap-1.5 rounded-full btn-accent px-5 py-2.5 text-sm font-bold">
          Sign in <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    );
  }

  return <JourneyContent />;
}

function JourneyContent() {
  const { member, setMember } = useAuthStore();
  const { data: profile } = useMyProfile();
  const queryClient = useQueryClient();

  const { data: journey, isLoading: journeyLoading, isError: journeyError, refetch } = useQuery<JourneyData>({
    queryKey: ["journey"],
    queryFn: () => apiFetch<JourneyData>("/v1/journey"),
    staleTime: 30000,
  });

  const { data: code, isLoading: codeLoading } = useQuery<any>({
    queryKey: ["code/today"],
    queryFn: () => apiFetch<any>("/v1/code/today"),
    staleTime: 60000,
  });

  const { mutate: completeStep, isPending: completing } = useMutation({
    mutationFn: (activityId: string) =>
      apiFetch<{ success: boolean; promoted: boolean; new_level: string | null; journey: JourneyData }>(
        `/v1/journey/activities/${activityId}/complete`,
        { method: "POST" },
      ),
    onSuccess: (res) => {
      queryClient.setQueryData(["journey"], res.journey);
      if (res.promoted && res.new_level && member) {
        setMember({ ...member, membership_level: res.new_level });
        toast.success(`Congratulations — you've been promoted to ${res.new_level.replace(/_/g, " ").toLowerCase()}`);
      } else {
        toast.success("Step completed");
      }
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to complete step"),
  });

  const memberName = profile?.display_name ?? member?.display_name ?? "Member";
  const completedCount = journey?.completed_count ?? 0;
  const steps = journey?.activities ?? [];
  const nextLevel = journey?.next_level ?? null;
  const nextCopy = nextLevel ? levelCopy(nextLevel) : null;
  const hasUnlockedRelFi = levelIndex(member?.membership_level) >= EXAMINER_INDEX;

  const handleSave = async () => {
    if (!code?.id) return;
    try {
      await apiFetch(`/v1/code/${code.id}/save`, { method: "POST" });
      toast.success("Saved to your collection");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to save");
    }
  };

  const handleShare = async () => {
    if (!code?.passage) return;
    const url = `${window.location.origin}/code`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: code.title, text: code.passage, url });
        return;
      } catch {
        // user dismissed the share sheet — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(`${code.passage}\n\n${url}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not share");
    }
  };

  return (
    <div className="mx-auto max-w-[720px] space-y-8">
      <PageHeader
        eyebrow={(journey?.level ?? member?.membership_level ?? "SEEKER").replace(/_/g, " ")}
        title={`${memberName.split(" ")[0]}'s Journey`}
        subtitle={
          nextCopy
            ? `Complete the steps below to become ${nextCopy.article} ${nextCopy.label} and join the Alpha Circle.`
            : "You're progressing through the AlphaMinds journey."
        }
      />

      <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-text-primary">Progress</h2>
          <span className="text-sm text-text-secondary tabular-nums">{completedCount}/{steps.length} done</span>
        </div>

        {journeyLoading ? (
          <p className="mt-5 text-sm text-text-secondary">Loading your journey…</p>
        ) : journeyError ? (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">Could not load your journey.</p>
            <button onClick={() => refetch()} className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold">
              Try again
            </button>
          </div>
        ) : steps.length === 0 ? (
          <p className="mt-5 text-sm text-text-secondary">
            No activities have been published for your level yet. Your chapter leader will add them soon.
          </p>
        ) : (
          <div className="mt-5 space-y-1">
            {steps.map((step) => {
              const Icon = TYPE_ICONS[step.type] ?? Sparkles;
              const tone =
                step.status === "completed"
                  ? "bg-accent-purple text-white"
                  : step.status === "active"
                    ? "bg-bg-card-white text-accent-purple border-2 border-accent-purple"
                    : "bg-lock-gray/20 text-lock-gray";
              return (
                <div key={step.id} className="flex items-center gap-3 py-2">
                  <span className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}>
                    {step.status === "locked" ? <Lock className="h-4 w-4" /> : step.status === "completed" ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${step.status === "locked" ? "text-lock-gray" : "text-text-primary"}`}>
                      {step.title}
                      {!step.is_required && (
                        <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">Optional</span>
                      )}
                    </p>
                    <p className={`text-xs ${step.status === "locked" ? "text-lock-gray" : "text-text-secondary"}`}>
                      {step.status === "completed"
                        ? "Complete"
                        : step.status === "locked"
                          ? "Locked"
                          : step.type === "rel_fi"
                            ? "Play now"
                            : "Ready to complete"}
                    </p>
                    {step.status === "active" && step.description && (
                      <p className="mt-1 text-xs text-text-secondary line-clamp-2">{step.description}</p>
                    )}
                  </div>
                  {step.status === "active" && step.type === "rel_fi" && (
                    <Link to="/rel-fi" className="inline-flex items-center gap-1 rounded-full btn-accent px-3.5 py-1.5 text-xs font-bold shrink-0">
                      Play <ArrowRight className="h-3 w-3" />
                    </Link>
                  )}
                  {step.status === "active" && (
                    <button
                      onClick={() => completeStep(step.id)}
                      disabled={completing}
                      className={
                        step.type === "rel_fi"
                          ? "inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-3.5 py-1.5 text-xs font-semibold text-text-primary shrink-0 disabled:opacity-50"
                          : "inline-flex items-center gap-1.5 rounded-full btn-accent px-3.5 py-1.5 text-xs font-bold shrink-0 disabled:opacity-50"
                      }
                    >
                      <Check className="h-3 w-3" /> {step.type === "rel_fi" ? "Mark done" : "Complete"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {nextLevel && (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <h3 className="text-lg font-extrabold tracking-tight text-text-primary">Next level: {nextLevel.replace(/_/g, " ")}</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Complete all required activities in your current journey to be promoted to {nextLevel.replace(/_/g, " ").toLowerCase()}.
          </p>
        </section>
      )}

      {codeLoading ? null : code?.passage ? (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-accent-dark-green flex items-center justify-center shrink-0">
              <Flame className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-dark-green">Today&apos;s Code</span>
          </div>
          <p className="mt-4 text-lg font-bold text-text-primary leading-snug">{code.passage}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button onClick={handleSave} className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold">
              <BookMarked className="h-4 w-4" /> Save
            </button>
            <button onClick={handleShare} className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary">
              <Share2 className="h-4 w-4" /> Share
            </button>
            <Link to="/code" className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary">
              Read more <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {!hasUnlockedRelFi && (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <h3 className="text-lg font-extrabold tracking-tight text-text-primary">Rel-Fi Games</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Rel-Fi unlocks for the designated journey step. Once it is available, you can play it any time from here.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-lock-gray">
            <Lock className="h-3.5 w-3.5" /> Available at the Rel-Fi step
          </span>
        </section>
      )}
    </div>
  );
}
