import { useAuthStore } from "@/store/authStore";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "@/lib/api";
import { useMyProfile } from "@/hooks/useMyProfile";
import { PageHeader } from "@/components/common/PageHeader";
import { YouTubeEmbed } from "@/components/journey/YouTubeEmbed";
import { classifyJourneyLink, journeyLinkHref } from "@/lib/journeyLinks";
import { toast } from "sonner";
import { EXAMINER_INDEX, levelCopy, levelIndex } from "@/lib/levels";
import type { JourneyActivity, JourneyData } from "@/lib/types";
import {
  Flame,
  Lock,
  Check,
  ArrowRight,
  BookMarked,
  Share2,
  Play,
  GraduationCap,
  Target,
  BookOpen,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  Clock,
  ShieldCheck,
  AlertCircle,
  ClipboardCheck,
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

function resourceLabel(step: JourneyActivity, href: string): string {
  if (href.startsWith("/library")) return "Read the article";
  if (href.startsWith("/challenges")) return "Open the challenge";
  if (href.startsWith("/rel-fi")) return "Play Rel-Fi";
  if (step.type === "article" || step.type === "reading") return "Read the article";
  if (step.type === "video" || step.type === "audio") return "Open the media";
  return "Open the resource";
}

function statusLabel(step: JourneyActivity): string {
  if (step.status === "locked") return "Locked";
  if (step.status === "completed") {
    if (step.verification_status === "pending") return "Awaiting review";
    return step.attempts > 1 ? `Completed · ${step.attempts} attempts` : "Completed";
  }
  if (step.started_at) return "In progress";
  return "Ready to start";
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  try {
    return new Date(value).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function JourneyPage() {
  const { member } = useAuthStore();

  if (!member) {
    return (
      <div className="py-24 text-center">
        <p className="text-text-secondary">Please sign in to view your journey</p>
        <Link
          to="/login"
          className="mt-4 inline-flex items-center gap-1.5 rounded-full btn-accent px-5 py-2.5 text-sm font-bold"
        >
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

  const [selectedLevel, setSelectedLevel] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [retaking, setRetaking] = useState<Record<string, boolean>>({});
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [opened, setOpened] = useState<Record<string, boolean>>({});
  const [watched, setWatched] = useState<Record<string, boolean>>({});
  const [played, setPlayed] = useState<Record<string, boolean>>({});
  const [answers, setAnswers] = useState<Record<string, number[]>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const queryKey = ["journey", selectedLevel ?? "current"];
  const {
    data: journey,
    isLoading: journeyLoading,
    isError: journeyError,
    refetch,
  } = useQuery<JourneyData>({
    queryKey,
    queryFn: () =>
      apiFetch<JourneyData>(`/v1/journey${selectedLevel ? `?level=${selectedLevel}` : ""}`),
    staleTime: 30000,
  });

  const { data: code, isLoading: codeLoading } = useQuery<any>({
    queryKey: ["code/today"],
    queryFn: () => apiFetch<any>("/v1/code/today"),
    staleTime: 60000,
  });

  const refreshJourney = () => {
    queryClient.invalidateQueries({ queryKey: ["journey"] });
  };

  const startMutation = useMutation({
    mutationFn: ({ id }: { id: string; retake?: boolean }) =>
      apiFetch<{ success: boolean; attempt_id: string; started_at: string }>(
        `/v1/journey/activities/${id}/start`,
        { method: "POST" },
      ),
    onSuccess: (_res, vars) => {
      if (vars.retake) {
        setRetaking((prev) => ({ ...prev, [vars.id]: true }));
        setAcknowledged((prev) => ({ ...prev, [vars.id]: false }));
        setOpened((prev) => ({ ...prev, [vars.id]: false }));
        setWatched((prev) => ({ ...prev, [vars.id]: false }));
        setPlayed((prev) => ({ ...prev, [vars.id]: false }));
        setAnswers((prev) => ({ ...prev, [vars.id]: [] }));
        setExpandedId(vars.id);
        toast.success("Step reopened — complete it again to record a new attempt");
      }
      refreshJourney();
    },
    onError: (e: any) => toast.error(e.message ?? "Could not start this step"),
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Record<string, unknown> }) =>
      apiFetch<{
        success: boolean;
        promoted?: boolean;
        new_level?: string | null;
        pending_verification?: boolean;
        journey?: JourneyData;
      }>(`/v1/journey/activities/${id}/complete`, {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: (res) => {
      if (res.promoted && res.new_level && member) {
        setMember({ ...member, membership_level: res.new_level });
        setSelectedLevel(null);
        toast.success(
          `Congratulations — you've been promoted to ${res.new_level.replace(/_/g, " ").toLowerCase()}`,
        );
      } else if (res.pending_verification) {
        toast.success("Submitted for review. An administrator will verify your evidence.");
      } else {
        toast.success("Step completed");
      }
      setRetaking((prev) => ({ ...prev, ...(expandedId ? { [expandedId]: false } : {}) }));
      refreshJourney();
    },
    onError: (e: any) => toast.error(e.message ?? "Failed to complete step"),
  });

  const toggleStep = (step: JourneyActivity) => {
    if (step.status === "locked") return;
    const next = expandedId === step.id ? null : step.id;
    setExpandedId(next);
    if (next && step.status !== "completed" && !step.started_at && !startMutation.isPending) {
      startMutation.mutate({ id: step.id });
    }
  };

  const markOpened = (id: string) => setOpened((prev) => ({ ...prev, [id]: true }));
  const markWatched = (id: string) => {
    setWatched((prev) => ({ ...prev, [id]: true }));
    markOpened(id);
  };
  const markPlayed = (id: string) => setPlayed((prev) => ({ ...prev, [id]: true }));

  const memberName = profile?.display_name ?? member?.display_name ?? "Member";
  const completedCount = journey?.completed_count ?? 0;
  const steps = journey?.activities ?? [];
  const nextLevel = journey?.next_level ?? null;
  const nextCopy = nextLevel ? levelCopy(nextLevel) : null;
  const hasUnlockedRelFi = levelIndex(member?.membership_level) >= EXAMINER_INDEX;
  const levels = journey?.levels ?? [];

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
    <div className="mx-auto max-w-[760px] space-y-8">
      <PageHeader
        eyebrow={(journey?.level ?? member?.membership_level ?? "SEEKER").replace(/_/g, " ")}
        title={`${memberName.split(" ")[0]}'s Journey`}
        subtitle={
          nextCopy
            ? `Complete the steps below to become ${nextCopy.article} ${nextCopy.label} and join the Alpha Circle.`
            : "You're progressing through the AlphaMinds journey."
        }
      />

      {levels.length > 1 && (
        <section className="rounded-2xl bg-card border border-divider p-3">
          <p className="px-2 pb-2 text-[11px] font-bold uppercase tracking-[0.08em] text-text-secondary">
            Your journeys
          </p>
          <div className="flex flex-wrap gap-2">
            {levels.map((entry) => {
              const active = entry.level === (selectedLevel ?? journey?.level);
              return (
                <button
                  key={entry.level}
                  onClick={() => {
                    setSelectedLevel(entry.level);
                    setExpandedId(null);
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold transition ${
                    active
                      ? "bg-accent-purple text-white"
                      : "bg-bg-card-white border border-divider text-text-primary hover:border-accent-purple/40"
                  }`}
                >
                  {levelCopy(entry.level).label}
                  <span className="ml-1.5 tabular-nums opacity-80">
                    {entry.completed_count}/{entry.total_count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {journey?.is_previous_level && (
        <div className="flex items-start gap-2 rounded-xl border border-divider bg-bg-card-white/70 p-3 text-sm text-text-secondary">
          <Clock className="mt-0.5 h-4 w-4 shrink-0 text-accent-purple" />
          <p>
            You're revisiting an earlier journey. You can review completed steps, retake
            activities, and finish anything you left incomplete.
          </p>
        </div>
      )}

      <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold tracking-tight text-text-primary">Progress</h2>
          <span className="text-sm text-text-secondary tabular-nums">
            {completedCount}/{steps.length} done
          </span>
        </div>
        {steps.length > 0 && (
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-divider">
            <div
              className="h-full rounded-full bg-accent-purple transition-all"
              style={{ width: `${Math.round((completedCount / Math.max(1, steps.length)) * 100)}%` }}
            />
          </div>
        )}

        {journeyLoading ? (
          <p className="mt-5 text-sm text-text-secondary">Loading your journey…</p>
        ) : journeyError ? (
          <div className="mt-5">
            <p className="text-sm text-text-secondary">Could not load your journey.</p>
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold"
            >
              Try again
            </button>
          </div>
        ) : steps.length === 0 ? (
          <p className="mt-5 text-sm text-text-secondary">
            No activities have been published for this journey yet. Your chapter leader will add
            them soon.
          </p>
        ) : (
          <div className="mt-5 space-y-2">
            {steps.map((step) => {
              const Icon = TYPE_ICONS[step.type] ?? Sparkles;
              const expanded = expandedId === step.id;
              const locked = step.status === "locked";
              const completed = step.status === "completed";
              const isRetaking = retaking[step.id] === true;
              const showForm = !completed || isRetaking;
              const kind = classifyJourneyLink(step.link_url);
              const href = step.link_url ? journeyLinkHref(step.link_url) : null;
              const didOpen = opened[step.id] || step.evidence?.opened === true;
              const didWatch = watched[step.id] || step.evidence?.watched === true;
              const didPlay = played[step.id] || step.evidence?.played === true;
              const didAcknowledge =
                acknowledged[step.id] || step.evidence?.acknowledged === true;
              const quizAnswers = answers[step.id] ?? [];
              const canSubmit =
                step.completion_rule === "quiz"
                  ? step.quiz_questions.length === 0
                    ? didAcknowledge
                    : quizAnswers.length === step.quiz_questions.length &&
                      quizAnswers.every((v) => Number.isInteger(v))
                  : step.completion_rule === "resource"
                    ? didOpen
                    : step.completion_rule === "activity"
                      ? didPlay
                      : step.completion_rule === "acknowledge"
                        ? didAcknowledge
                        : true;

              const tone = completed
                ? "bg-accent-purple text-white"
                : step.status === "active" || step.status === "available"
                  ? "bg-bg-card-white text-accent-purple border-2 border-accent-purple"
                  : "bg-lock-gray/20 text-lock-gray";

              return (
                <div
                  key={step.id}
                  className={`rounded-xl border transition ${
                    expanded ? "border-accent-purple/40 bg-bg-card-white/50" : "border-transparent"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => toggleStep(step)}
                    disabled={locked}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-3 text-left disabled:cursor-not-allowed"
                  >
                    <span
                      className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${tone}`}
                    >
                      {locked ? (
                        <Lock className="h-4 w-4" />
                      ) : completed ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p
                        className={`font-semibold ${locked ? "text-lock-gray" : "text-text-primary"}`}
                      >
                        {step.title}
                        {!step.is_required && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                            Optional
                          </span>
                        )}
                      </p>
                      <p
                        className={`text-xs ${locked ? "text-lock-gray" : "text-text-secondary"}`}
                      >
                        {statusLabel(step)}
                      </p>
                    </div>
                    {!locked && (
                      <span className="text-text-secondary">
                        {expanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </span>
                    )}
                  </button>

                  {expanded && !locked && (
                    <div className="space-y-3 px-4 pb-4">
                      {step.description && (
                        <p className="text-sm text-text-secondary">{step.description}</p>
                      )}
                      {step.instructions && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                            Instructions
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                            {step.instructions}
                          </p>
                        </div>
                      )}
                      {step.content && (
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-wide text-text-secondary">
                            Details
                          </p>
                          <p className="mt-1 whitespace-pre-wrap text-sm text-text-primary">
                            {step.content}
                          </p>
                        </div>
                      )}

                      {kind === "youtube" && href && (
                        <YouTubeEmbed
                          url={href}
                          activityId={step.id}
                          onWatched={() => markWatched(step.id)}
                          onUnavailable={() => markOpened(step.id)}
                        />
                      )}

                      {href && kind === "internal" && (
                        <Link
                          to={href as any}
                          onClick={() => markOpened(step.id)}
                          className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-xs font-bold"
                        >
                          {resourceLabel(step, href)} <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}

                      {href && kind === "external" && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => markOpened(step.id)}
                          className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-xs font-bold"
                        >
                          {resourceLabel(step, href)} <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {step.type === "rel_fi" && !href && (
                        <Link
                          to="/rel-fi"
                          onClick={() => markPlayed(step.id)}
                          className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-xs font-bold"
                        >
                          Play Rel-Fi <ArrowRight className="h-3 w-3" />
                        </Link>
                      )}

                      {showForm && step.completion_rule === "quiz" && (
                        <div className="space-y-3 rounded-xl border border-divider bg-card p-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">
                            <ClipboardCheck className="h-3.5 w-3.5" /> Assessment ·{" "}
                            {step.passing_score}% to pass
                          </p>
                          {step.quiz_questions.length === 0 ? (
                            <label className="flex items-start gap-2 text-sm text-text-primary">
                              <input
                                type="checkbox"
                                className="mt-1"
                                checked={didAcknowledge}
                                onChange={(e) =>
                                  setAcknowledged((prev) => ({
                                    ...prev,
                                    [step.id]: e.target.checked,
                                  }))
                                }
                              />
                              No questions are configured yet. I reviewed the material.
                            </label>
                          ) : (
                            step.quiz_questions.map((question, qIndex) => (
                              <div key={question.id} className="space-y-1.5">
                                <p className="text-sm font-semibold text-text-primary">
                                  {qIndex + 1}. {question.prompt}
                                </p>
                                {question.options.map((option, oIndex) => (
                                  <label
                                    key={`${question.id}-${oIndex}`}
                                    className="flex items-start gap-2 text-sm text-text-secondary"
                                  >
                                    <input
                                      type="radio"
                                      name={`${step.id}-${question.id}`}
                                      className="mt-1"
                                      checked={quizAnswers[qIndex] === oIndex}
                                      onChange={() =>
                                        setAnswers((prev) => {
                                          const next = [...(prev[step.id] ?? [])];
                                          next[qIndex] = oIndex;
                                          return { ...prev, [step.id]: next };
                                        })
                                      }
                                    />
                                    {option}
                                  </label>
                                ))}
                              </div>
                            ))
                          )}
                        </div>
                      )}

                      {showForm && step.completion_rule === "admin" && (
                        <div className="space-y-2 rounded-xl border border-divider bg-card p-3">
                          <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-text-secondary">
                            <ShieldCheck className="h-3.5 w-3.5" /> Requires administrator
                            verification
                          </p>
                          <textarea
                            value={notes[step.id] ?? ""}
                            onChange={(e) =>
                              setNotes((prev) => ({ ...prev, [step.id]: e.target.value }))
                            }
                            placeholder="Add evidence or a note for the reviewer (optional)"
                            rows={3}
                            className="w-full rounded-lg border border-divider bg-bg-card-white px-3 py-2 text-sm text-text-primary outline-none focus:border-accent-purple"
                          />
                          {step.verification_status === "pending" && (
                            <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-dark-green">
                              <Clock className="h-3.5 w-3.5" /> Awaiting administrator review
                            </p>
                          )}
                        </div>
                      )}

                      {showForm && step.completion_rule === "resource" && (
                        <label className="flex items-start gap-2 text-sm text-text-primary">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={didOpen}
                            onChange={(e) =>
                              setOpened((prev) => ({ ...prev, [step.id]: e.target.checked }))
                            }
                          />
                          I opened and reviewed this resource.
                        </label>
                      )}

                      {showForm && step.completion_rule === "activity" && (
                        <label className="flex items-start gap-2 text-sm text-text-primary">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={didPlay}
                            onChange={(e) =>
                              setPlayed((prev) => ({ ...prev, [step.id]: e.target.checked }))
                            }
                          />
                          I completed this activity.
                        </label>
                      )}

                      {showForm && step.completion_rule === "acknowledge" && (
                        <label className="flex items-start gap-2 text-sm text-text-primary">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={didAcknowledge}
                            onChange={(e) =>
                              setAcknowledged((prev) => ({
                                ...prev,
                                [step.id]: e.target.checked,
                              }))
                            }
                          />
                          I have read and completed this step.
                        </label>
                      )}

                      {kind === "youtube" && !didWatch && showForm && (
                        <p className="text-xs text-text-secondary">
                          Watch the video to the end to unlock completion.
                        </p>
                      )}

                      {showForm && (
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-divider pt-3">
                          <p className="text-xs text-text-secondary">
                            {canSubmit
                              ? "Ready to record your progress."
                              : "Complete the requirement above to continue."}
                          </p>
                          <button
                            onClick={() => {
                              const payload: Record<string, unknown> = {};
                              if (step.completion_rule === "quiz") {
                                payload.answers = quizAnswers;
                                if (step.quiz_questions.length === 0)
                                  payload.acknowledgement = true;
                              } else if (step.completion_rule === "admin") {
                                payload.submit_for_review = true;
                                payload.evidence = { note: notes[step.id] ?? "" };
                              } else if (step.completion_rule === "acknowledge") {
                                payload.acknowledgement = true;
                                payload.evidence = { acknowledged: true };
                              } else if (step.completion_rule === "resource") {
                                payload.evidence = { opened: true };
                              } else if (step.completion_rule === "activity") {
                                payload.evidence = { played: true };
                              }
                              completeMutation.mutate({ id: step.id, payload });
                            }}
                            disabled={completeMutation.isPending || !canSubmit}
                            className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-xs font-bold disabled:opacity-50"
                          >
                            {step.completion_rule === "admin" ? (
                              <>
                                <ShieldCheck className="h-3 w-3" /> Submit for review
                              </>
                            ) : (
                              <>
                                <Check className="h-3 w-3" />{" "}
                                {completed && isRetaking ? "Complete retake" : "Complete step"}
                              </>
                            )}
                          </button>
                        </div>
                      )}

                      {completed && !isRetaking && (
                        <div className="space-y-2 border-t border-divider pt-3">
                          <p className="flex items-center gap-1.5 text-xs font-semibold text-accent-dark-green">
                            <Check className="h-3.5 w-3.5" /> Completed{" "}
                            {formatDate(step.completed_at)}
                            {step.verification_status === "verified" && " · verified"}
                          </p>
                          {step.attempts > 0 && (
                            <p className="text-xs text-text-secondary">
                              Recorded attempts: {step.attempts}
                            </p>
                          )}
                          {step.repeatable && (
                            <button
                              onClick={() => startMutation.mutate({ id: step.id, retake: true })}
                              disabled={startMutation.isPending}
                              className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-xs font-semibold text-text-primary disabled:opacity-50"
                            >
                              <RotateCcw className="h-3 w-3" /> Retake this step
                            </button>
                          )}
                        </div>
                      )}

                      {step.history.length > 0 && (
                        <details className="text-xs text-text-secondary">
                          <summary className="cursor-pointer font-semibold text-text-primary">
                            Attempt history ({step.history.length})
                          </summary>
                          <ul className="mt-2 space-y-1">
                            {step.history.map((attempt) => (
                              <li key={attempt.id} className="flex flex-wrap gap-x-2">
                                <span className="font-semibold">
                                  {attempt.status === "completed" ? "Completed" : "Started"}
                                </span>
                                <span>
                                  {formatDate(attempt.completed_at ?? attempt.started_at)}
                                </span>
                                {attempt.verification_status && (
                                  <span className="text-text-secondary">
                                    · {attempt.verification_status.replace(/_/g, " ")}
                                  </span>
                                )}
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>

      {nextLevel && (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <h3 className="text-lg font-extrabold tracking-tight text-text-primary">
            Next level: {nextLevel.replace(/_/g, " ")}
          </h3>
          <p className="mt-2 text-sm text-text-secondary">
            Complete all required activities in your current journey to be promoted to{" "}
            {nextLevel.replace(/_/g, " ").toLowerCase()}.
          </p>
        </section>
      )}

      {codeLoading ? null : code?.passage ? (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <div className="flex items-center gap-2.5">
            <span className="h-7 w-7 rounded-lg bg-accent-dark-green flex items-center justify-center shrink-0">
              <Flame className="h-3.5 w-3.5 text-white" />
            </span>
            <span className="text-xs font-extrabold uppercase tracking-[0.08em] text-accent-dark-green">
              Today&apos;s Code
            </span>
          </div>
          <p className="mt-4 text-lg font-bold text-text-primary leading-snug">{code.passage}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <button
              onClick={handleSave}
              className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold"
            >
              <BookMarked className="h-4 w-4" /> Save
            </button>
            <button
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <Link
              to="/code"
              className="inline-flex items-center gap-1.5 rounded-full bg-bg-card-white border border-divider px-4 py-2 text-sm font-semibold text-text-primary"
            >
              Read more <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </section>
      ) : null}

      {!hasUnlockedRelFi && (
        <section className="rounded-2xl bg-card border border-divider p-5 sm:p-6">
          <h3 className="text-lg font-extrabold tracking-tight text-text-primary">Rel-Fi Games</h3>
          <p className="mt-2 text-sm text-text-secondary">
            Rel-Fi unlocks for the designated journey step. Once it is available, you can play it
            any time from here.
          </p>
          <span className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-lock-gray">
            <Lock className="h-3.5 w-3.5" /> Available at the Rel-Fi step
          </span>
        </section>
      )}

      {steps.some((s) => s.verification_status === "pending") && (
        <p className="flex items-center gap-1.5 text-xs text-text-secondary">
          <AlertCircle className="h-3.5 w-3.5" /> Some steps are awaiting administrator review.
        </p>
      )}
    </div>
  );
}
