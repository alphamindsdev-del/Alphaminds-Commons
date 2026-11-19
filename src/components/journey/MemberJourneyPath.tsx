import { Check, Lock } from "lucide-react";
import { MEMBER_JOURNEY_STAGES, levelIndex, normalizeLevel } from "@/lib/levels";

interface StageProgress {
  level: string;
  completed_count?: number;
  total_count?: number;
}

/**
 * The five-stage AlphaMinds member journey (Seeker → Catalyst).
 *
 * Administrative / community roles (Facilitator, Steward, Chapter Leader,
 * Coordinator) are intentionally not part of this progression.
 */
export function MemberJourneyPath({
  currentLevel,
  progress = [],
  selectedLevel,
  onSelect,
  className,
}: {
  currentLevel?: string | null;
  progress?: StageProgress[];
  selectedLevel?: string | null;
  onSelect?: (level: string) => void;
  className?: string;
}) {
  const currentIndex = levelIndex(currentLevel);
  const selected = selectedLevel ? normalizeLevel(selectedLevel) : null;

  return (
    <section
      className={`rounded-2xl border border-divider bg-card p-5 sm:p-7 ${className ?? ""}`}
      aria-label="The AlphaMinds member journey"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-[0.24em] text-accent-dark-green">
            The AlphaMinds Member Journey
          </p>
          <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-text-primary sm:text-3xl">
            The Journey of Personal Evolution
          </h2>
          <p className="mt-2 max-w-2xl text-sm text-text-secondary">
            Five stages of personal development, from curiosity to meaningful contribution.
          </p>
        </div>
        <span className="rounded-full border border-divider bg-bg-card-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide text-text-secondary">
          Stage {currentIndex + 1} of {MEMBER_JOURNEY_STAGES.length}
        </span>
      </div>

      <div className="mt-5 flex gap-1.5" aria-hidden="true">
        {MEMBER_JOURNEY_STAGES.map((stage, index) => (
          <span
            key={stage.level}
            className={`h-1.5 flex-1 rounded-full ${
              index <= currentIndex ? "bg-accent-purple" : "bg-divider"
            }`}
          />
        ))}
      </div>

      <ol className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {MEMBER_JOURNEY_STAGES.map((stage, index) => {
          const state =
            index < currentIndex ? "complete" : index === currentIndex ? "current" : "upcoming";
          const entry = progress.find((p) => normalizeLevel(p.level) === stage.level);
          const accessible = index <= currentIndex;
          const isSelected = selected === stage.level;

          const shell =
            state === "current"
              ? "border-accent-purple bg-bg-card-white ring-1 ring-accent-purple/30"
              : state === "complete"
                ? isSelected
                  ? "border-accent-purple/50 bg-bg-card-white"
                  : "border-divider bg-bg-card-white"
                : "border-dashed border-divider bg-card opacity-70";

          const card = (
            <>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-extrabold tabular-nums tracking-[0.18em] text-text-secondary">
                  {stage.number}
                </span>
                {state === "complete" ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-accent-purple/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent-purple">
                    <Check className="h-3 w-3" /> Done
                  </span>
                ) : state === "current" ? (
                  <span className="rounded-full bg-accent-purple px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                    You are here
                  </span>
                ) : (
                  <Lock className="h-3.5 w-3.5 text-lock-gray" aria-hidden="true" />
                )}
              </div>
              <p className="mt-3 text-sm font-extrabold uppercase tracking-[0.14em] text-text-primary">
                {stage.title}
              </p>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-accent-purple">
                {stage.action}
              </p>
              <p className="mt-3 text-sm italic leading-relaxed text-text-secondary">
                &ldquo;{stage.statement}&rdquo;
              </p>
              {entry && (entry.total_count ?? 0) > 0 && (
                <p className="mt-3 text-[11px] font-semibold tabular-nums text-text-secondary">
                  {entry.completed_count ?? 0}/{entry.total_count} steps complete
                </p>
              )}
            </>
          );

          return (
            <li key={stage.level} className="flex">
              {onSelect && accessible ? (
                <button
                  type="button"
                  onClick={() => onSelect(stage.level)}
                  aria-current={state === "current" ? "step" : undefined}
                  className={`w-full rounded-xl border p-4 text-left transition hover:border-accent-purple/50 ${shell}`}
                >
                  {card}
                </button>
              ) : (
                <div className={`w-full rounded-xl border p-4 ${shell}`}>{card}</div>
              )}
            </li>
          );
        })}
      </ol>

      <p className="mt-4 text-xs text-text-secondary">
        Community roles such as Facilitator, Steward, Chapter Leader and Coordinator are
        administrative positions, separate from the five personal development stages above.
      </p>
    </section>
  );
}
