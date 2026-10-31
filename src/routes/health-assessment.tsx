import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  HeartPulse,
  Info,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AssetImage } from "@/components/alphabody/AssetImage";

export const Route = createFileRoute("/health-assessment")({
  head: () => ({
    meta: [
      { title: "Personal Health Assessment · AlphaBody" },
      {
        name: "description",
        content:
          "A private, self-reported snapshot of your lifestyle, wellbeing and health habits.",
      },
    ],
  }),
  component: HealthAssessmentPage,
});

const HID_IMAGE = "/assets/images/HID Health Gauge and Growth Chart.webp";

interface AssessmentOption {
  label: string;
  value: number;
}

interface AssessmentQuestion {
  id: string;
  prompt: string;
  options: AssessmentOption[];
}

interface AssessmentResult {
  id?: string;
  score: number;
  band: string;
  message: string;
  answered?: number;
  total_questions?: number;
  completed_at?: string;
  created_at?: string;
  question_set_version?: string;
}

interface AssessmentResponse {
  available: boolean;
  question_set?: {
    id: string;
    version: string;
    title: string;
    description?: string;
    questions: AssessmentQuestion[];
  };
  latest_result: AssessmentResult | null;
  disclaimer?: string;
}

const DEFAULT_DISCLAIMER =
  "This is a self-reported wellbeing snapshot. It is not a medical diagnosis, clinical risk score or lifespan prediction.";

function ScoreRing({ score }: { score: number }) {
  const radius = 46;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.max(0, Math.min(100, score)) / 100) * circumference;
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          className="text-black/5"
        />
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className="text-[#4C8C2E] transition-all duration-700"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-3xl font-black text-[#16321F]">{score}</span>
        <span className="text-[9px] font-bold uppercase tracking-wider text-[#4C8C2E]">of 100</span>
      </div>
    </div>
  );
}

function ResultCard({ result, onRetake }: { result: AssessmentResult; onRetake: () => void }) {
  const date = result.completed_at ?? result.created_at;
  return (
    <section className="overflow-hidden rounded-[26px] border border-[#CFE4B8] bg-[#F1F8E8]">
      <div className="flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
        <ScoreRing score={result.score} />
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4C8C2E]">
            Your wellbeing snapshot
          </p>
          <h2 className="mt-1 font-display text-2xl font-black tracking-tight text-[#16321F]">
            {result.band}
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-[#4A5A45]">{result.message}</p>
          {date && (
            <p className="mt-3 text-[11px] text-[#6B7A65]">
              Completed{" "}
              {new Date(date).toLocaleDateString("en-US", {
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
          )}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-[#CFE4B8] bg-white/50 px-5 py-3 sm:px-7">
        <button
          type="button"
          onClick={onRetake}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#1F7A4D] px-4 py-2 text-sm font-bold text-white"
        >
          <RotateCcw className="h-4 w-4" /> Retake assessment
        </button>
        <Link
          to="/health-profile"
          className="inline-flex items-center gap-1.5 rounded-full border border-[#CFE4B8] bg-white px-4 py-2 text-sm font-semibold text-[#16321F]"
        >
          Health profile <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}

function HealthAssessmentPage() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [current, setCurrent] = useState(0);
  const [retaking, setRetaking] = useState(false);
  const [submitted, setSubmitted] = useState<AssessmentResult | null>(null);

  const { data, isLoading } = useQuery<AssessmentResponse>({
    queryKey: ["health/assessment"],
    queryFn: () => apiFetch<AssessmentResponse>("/v1/health/assessment"),
    staleTime: 30_000,
  });

  const { data: historyData } = useQuery<{ data: AssessmentResult[] }>({
    queryKey: ["health/assessment/history"],
    queryFn: () => apiFetch<{ data: AssessmentResult[] }>("/v1/health/assessment/history"),
    staleTime: 30_000,
  });

  const questions = useMemo(
    () => data?.question_set?.questions ?? [],
    [data?.question_set?.questions],
  );
  const latest = submitted ?? data?.latest_result ?? null;
  const showQuestionnaire = Boolean(
    data?.available && questions.length > 0 && (!latest || retaking),
  );

  const answeredCount = useMemo(
    () => questions.filter((q) => answers[q.id] !== undefined).length,
    [answers, questions],
  );
  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const question = questions[current];
  const currentAnswer = question ? answers[question.id] : undefined;
  const isLast = current === questions.length - 1;

  const submit = useMutation({
    mutationFn: () =>
      apiFetch<{ result: AssessmentResult; disclaimer?: string }>("/v1/health/assessment/submit", {
        method: "POST",
        body: JSON.stringify({
          question_set_id: data?.question_set?.id,
          answers,
        }),
      }),
    onSuccess: (response) => {
      setSubmitted(response.result);
      setRetaking(false);
      queryClient.invalidateQueries({ queryKey: ["health/assessment"] });
      queryClient.invalidateQueries({ queryKey: ["health/assessment/history"] });
      toast.success("Your snapshot has been saved");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not save your assessment");
    },
  });

  const startRetake = () => {
    setAnswers({});
    setCurrent(0);
    setSubmitted(null);
    setRetaking(true);
  };

  const selectAnswer = (value: number) => {
    if (!question) return;
    setAnswers((prev) => ({ ...prev, [question.id]: value }));
  };

  const next = () => {
    if (!isLast && currentAnswer !== undefined) setCurrent((value) => value + 1);
  };

  const previous = () => setCurrent((value) => Math.max(0, value - 1));

  const finish = () => {
    if (answeredCount !== questions.length) {
      toast.error("Please answer every question before submitting.");
      return;
    }
    submit.mutate();
  };

  return (
    <div className="mx-auto max-w-[960px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#EAF5DF] p-5 sm:p-8">
        <div className="grid items-center gap-4 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#4C8C2E]">
              HID / Lifespan Meter
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.02] tracking-tight text-[#16321F] sm:text-4xl">
              Personal Health Assessment
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#4A5A45]">
              A private, self-reported snapshot of how your sleep, movement, nutrition, stress and
              recovery are tracking. Use it to notice patterns and choose one next step.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#4C8C2E]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Private to you
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <Sparkles className="h-3.5 w-3.5" /> About 3 minutes
              </span>
            </div>
          </div>
          <div className="relative h-44 overflow-hidden rounded-[22px] bg-white/50 sm:h-56">
            <AssetImage
              src={HID_IMAGE}
              alt="HID health gauge and growth chart"
              loading="eager"
              className="h-full w-full"
              imgClassName="h-full w-full object-contain object-center p-2"
              fallback={
                <div className="flex h-full w-full items-center justify-center">
                  <HeartPulse className="h-16 w-16 text-[#4C8C2E]/70" />
                </div>
              }
            />
          </div>
        </div>
      </section>

      <div className="flex items-start gap-2 rounded-2xl border border-amber-200/70 bg-amber-50 px-4 py-3 text-[11px] leading-relaxed text-amber-900">
        <Info className="mt-0.5 h-4 w-4 shrink-0" />
        <p>{data?.disclaimer ?? DEFAULT_DISCLAIMER}</p>
      </div>

      {isLoading ? (
        <div className="h-64 animate-pulse rounded-[24px] border border-divider bg-subtle" />
      ) : latest && !retaking ? (
        <ResultCard result={latest} onRetake={startRetake} />
      ) : showQuestionnaire && question ? (
        <section className="rounded-[26px] border border-divider bg-card p-5 sm:p-7">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#4C8C2E]">
                {data?.question_set?.title ?? "Health self-reflection"}
              </p>
              <p className="mt-1 text-xs text-text-secondary">
                Question {current + 1} of {questions.length}
              </p>
            </div>
            {retaking && (
              <button
                type="button"
                onClick={() => setRetaking(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-text-secondary"
              >
                <ArrowLeft className="h-3.5 w-3.5" /> Cancel
              </button>
            )}
          </div>

          <div className="mt-4 h-2 overflow-hidden rounded-full bg-subtle">
            <div
              className="h-full rounded-full bg-[#4C8C2E] transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          <h2 className="mt-6 font-display text-xl font-bold leading-snug text-text-primary sm:text-2xl">
            {question.prompt}
          </h2>

          <div className="mt-5 space-y-2.5">
            {question.options.map((option) => {
              const selected = currentAnswer === option.value;
              return (
                <button
                  key={`${question.id}-${option.value}`}
                  type="button"
                  onClick={() => selectAnswer(option.value)}
                  className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3.5 text-left text-sm font-semibold transition ${
                    selected
                      ? "border-[#4C8C2E] bg-[#EAF5DF] text-[#16321F]"
                      : "border-divider bg-white text-text-primary hover:border-[#4C8C2E]/50"
                  }`}
                >
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border ${
                      selected
                        ? "border-[#4C8C2E] bg-[#4C8C2E] text-white"
                        : "border-divider text-transparent"
                    }`}
                  >
                    <Check className="h-3.5 w-3.5" />
                  </span>
                  {option.label}
                </button>
              );
            })}
          </div>

          <div className="mt-6 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={previous}
              disabled={current === 0}
              className="inline-flex items-center gap-1.5 rounded-full border border-divider px-4 py-2.5 text-sm font-semibold text-text-primary disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" /> Back
            </button>
            {isLast ? (
              <button
                type="button"
                onClick={finish}
                disabled={answeredCount !== questions.length || submit.isPending}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1F7A4D] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                {submit.isPending ? "Saving…" : "See my snapshot"}{" "}
                <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={next}
                disabled={currentAnswer === undefined}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1F7A4D] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
              >
                Next <ArrowRight className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      ) : (
        <section className="rounded-[26px] border border-dashed border-divider bg-subtle/40 p-8 text-center">
          <HeartPulse className="mx-auto h-9 w-9 text-[#4C8C2E]" />
          <h2 className="mt-3 font-display text-xl font-bold text-text-primary">
            Assessment coming soon
          </h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-text-secondary">
            Our care team is preparing the next self-reflection set. In the meantime, you can update
            your health profile or request a clinic conversation.
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Link
              to="/health-profile"
              className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
            >
              Open health profile
            </Link>
            <Link
              to="/wellness-clinic"
              className="rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary"
            >
              Talk to the clinic
            </Link>
          </div>
        </section>
      )}

      {(historyData?.data?.length ?? 0) > 1 && (
        <section className="rounded-[24px] border border-divider bg-card p-5">
          <h2 className="font-display text-lg font-bold text-text-primary">Your check-ins</h2>
          <div className="mt-3 divide-y divide-divider">
            {historyData!.data.slice(0, 5).map((item) => (
              <div
                key={item.id ?? item.completed_at}
                className="flex items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-text-primary">{item.band}</p>
                  <p className="text-[11px] text-text-secondary">
                    {new Date(item.completed_at ?? item.created_at ?? "").toLocaleDateString(
                      "en-US",
                      {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      },
                    )}
                  </p>
                </div>
                <span className="rounded-full bg-[#EAF5DF] px-3 py-1 text-xs font-bold text-[#1F7A4D]">
                  {item.score}/100
                </span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
