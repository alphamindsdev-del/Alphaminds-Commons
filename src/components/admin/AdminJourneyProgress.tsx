import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api";
import {
  AdminTable,
  EmptyRow,
  SectionHeader,
  TInput,
  adminSend,
  fmtDate,
} from "./AdminKit";
import { Check, Clock, ShieldCheck, X } from "lucide-react";

const LEVELS = [
  "SEEKER",
  "EXAMINER",
  "FACILITATOR",
  "STEWARD",
  "CHAPTER_LEADER",
  "COORDINATOR",
] as const;

interface OverviewRow {
  id: string;
  full_name: string;
  email: string;
  membership_level: string;
  completed_count: number;
  pending_count: number;
  required_total: number;
}

interface ProgressStep {
  id: string;
  title: string;
  status: "completed" | "active" | "available" | "locked";
  is_required: boolean;
  verification_status: string | null;
  completion_type: string | null;
  attempts: number;
  completed_at: string | null;
  started_at: string | null;
  completion_rule: string;
}

interface MemberProgress {
  member: OverviewRow;
  journey: { level: string; completed_count: number; total_count: number; activities: ProgressStep[] };
  levels: Array<{ level: string; completed_count: number; total_count: number }>;
  attempts: Array<{
    id: string;
    activity_title: string;
    status: string;
    verification_status: string | null;
    started_at: string;
    completed_at: string | null;
  }>;
}

function label(value: string | null | undefined): string {
  if (!value) return "";
  return value.replace(/_/g, " ").toLowerCase();
}

export function AdminJourneyProgress() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailLevel, setDetailLevel] = useState<string | null>(null);

  const { data: overview, isLoading } = useQuery<{ data: OverviewRow[] }>({
    queryKey: ["admin", "journey-progress-overview"],
    queryFn: () => apiFetch<{ data: OverviewRow[] }>("/v1/admin/journey-progress-overview?limit=100"),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const rows = overview?.data ?? [];
    if (!q) return rows;
    return rows.filter((r) => `${r.full_name} ${r.email}`.toLowerCase().includes(q));
  }, [overview, search]);

  const { data: detail, isLoading: detailLoading } = useQuery<MemberProgress>({
    queryKey: ["admin", "journey-progress", selectedId, detailLevel],
    queryFn: () =>
      apiFetch<MemberProgress>(
        `/v1/admin/members/${selectedId}/journey-progress${detailLevel ? `?level=${detailLevel}` : ""}`,
      ),
    enabled: !!selectedId,
  });

  const review = useMutation({
    mutationFn: ({
      memberId,
      activityId,
      decision,
      note,
    }: {
      memberId: string;
      activityId: string;
      decision: "verified" | "rejected";
      note?: string;
    }) =>
      adminSend(`/v1/admin/members/${memberId}/journey-progress/${activityId}/verify`, "PATCH", {
        decision,
        note,
      }),
    onSuccess: (_res, vars) => {
      toast.success(vars.decision === "verified" ? "Submission verified" : "Submission rejected");
      qc.invalidateQueries({ queryKey: ["admin", "journey-progress"] });
      qc.invalidateQueries({ queryKey: ["admin", "journey-progress-overview"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Review failed"),
  });

  const complete = useMutation({
    mutationFn: ({ memberId, activityId }: { memberId: string; activityId: string }) =>
      adminSend(
        `/v1/admin/members/${memberId}/journey-progress/${activityId}/complete`,
        "PATCH",
        { note: "Completed by administrator" },
      ),
    onSuccess: () => {
      toast.success("Step marked complete");
      qc.invalidateQueries({ queryKey: ["admin", "journey-progress"] });
      qc.invalidateQueries({ queryKey: ["admin", "journey-progress-overview"] });
    },
    onError: (err: any) => toast.error(err.message ?? "Could not complete step"),
  });

  return (
    <div className="mt-10">
      <SectionHeader
        back
        title="Member progress"
        subtitle="See every member's journey, verify submitted evidence, and complete steps on their behalf."
      />

      <div className="mb-4 flex flex-wrap gap-3">
        <div className="min-w-[240px] flex-1">
          <TInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search member name or email…"
          />
        </div>
      </div>

      <AdminTable
        head={
          <tr>
            <th className="text-left px-4 py-3 font-bold">Member</th>
            <th className="text-left px-4 py-3 font-bold">Level</th>
            <th className="text-left px-4 py-3 font-bold">Required steps</th>
            <th className="text-left px-4 py-3 font-bold">Pending review</th>
            <th className="text-right px-4 py-3 font-bold">Actions</th>
          </tr>
        }
      >
        {isLoading ? (
          <EmptyRow colSpan={5} message="Loading member progress…" />
        ) : filtered.length === 0 ? (
          <EmptyRow colSpan={5} message="No members match this search." />
        ) : (
          filtered.map((row) => (
            <tr key={row.id} className="border-t border-border">
              <td className="px-4 py-3">
                <p className="font-semibold text-text-primary">{row.full_name || "Unnamed member"}</p>
                <p className="text-xs text-text-secondary">{row.email}</p>
              </td>
              <td className="px-4 py-3 text-text-secondary">{label(row.membership_level)}</td>
              <td className="px-4 py-3 tabular-nums text-text-primary">
                {row.completed_count} total
                <span className="text-text-secondary"> · {row.required_total} required</span>
              </td>
              <td className="px-4 py-3">
                {row.pending_count > 0 ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-800">
                    <Clock className="h-3 w-3" /> {row.pending_count}
                  </span>
                ) : (
                  <span className="text-xs text-text-secondary">None</span>
                )}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => {
                    setSelectedId(row.id === selectedId ? null : row.id);
                    setDetailLevel(null);
                  }}
                  className="rounded-full border border-divider bg-bg-card-white px-3 py-1.5 text-xs font-semibold text-text-primary hover:border-accent-purple/40"
                >
                  {row.id === selectedId ? "Hide" : "View journey"}
                </button>
              </td>
            </tr>
          ))
        )}
      </AdminTable>

      {selectedId && (
        <div className="mt-5 rounded-2xl border border-divider bg-card p-4 sm:p-5">
          {detailLoading ? (
            <p className="text-sm text-text-secondary">Loading journey…</p>
          ) : !detail ? (
            <p className="text-sm text-text-secondary">Could not load this member's journey.</p>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-extrabold text-text-primary">
                    {detail.member.full_name}
                  </h3>
                  <p className="text-xs text-text-secondary">{detail.member.email}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {detail.levels.map((entry) => (
                    <button
                      key={entry.level}
                      onClick={() => setDetailLevel(entry.level)}
                      className={`rounded-full px-3 py-1.5 text-xs font-bold ${
                        (detailLevel ?? detail.journey.level) === entry.level
                          ? "bg-accent-purple text-white"
                          : "border border-divider bg-bg-card-white text-text-primary"
                      }`}
                    >
                      {label(entry.level)} · {entry.completed_count}/{entry.total_count}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {detail.journey.activities.map((step) => (
                  <div
                    key={step.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-divider bg-bg-card-white/60 p-3"
                  >
                    <div className="min-w-0">
                      <p className="font-semibold text-text-primary">
                        {step.title}
                        {!step.is_required && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wide text-text-secondary">
                            Optional
                          </span>
                        )}
                      </p>
                      <p className="text-xs text-text-secondary">
                        {step.status}
                        {step.verification_status ? ` · ${label(step.verification_status)}` : ""}
                        {step.attempts ? ` · ${step.attempts} attempt(s)` : ""}
                        {step.completed_at ? ` · ${fmtDate(step.completed_at)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {step.status !== "completed" && (
                        <button
                          onClick={() => complete.mutate({ memberId: detail.member.id, activityId: step.id })}
                          disabled={complete.isPending}
                          className="inline-flex items-center gap-1 rounded-full border border-divider bg-bg-card-white px-3 py-1.5 text-xs font-semibold text-text-primary disabled:opacity-50"
                        >
                          <Check className="h-3 w-3" /> Mark complete
                        </button>
                      )}
                      {step.verification_status === "pending" && (
                        <>
                          <button
                            onClick={() =>
                              review.mutate({
                                memberId: detail.member.id,
                                activityId: step.id,
                                decision: "verified",
                              })
                            }
                            disabled={review.isPending}
                            className="inline-flex items-center gap-1 rounded-full btn-accent px-3 py-1.5 text-xs font-bold disabled:opacity-50"
                          >
                            <ShieldCheck className="h-3 w-3" /> Verify
                          </button>
                          <button
                            onClick={() =>
                              review.mutate({
                                memberId: detail.member.id,
                                activityId: step.id,
                                decision: "rejected",
                                note: "Evidence needs to be resubmitted.",
                              })
                            }
                            disabled={review.isPending}
                            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-700 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {detail.attempts.length > 0 && (
                <details className="text-xs text-text-secondary">
                  <summary className="cursor-pointer font-semibold text-text-primary">
                    Recent attempts ({detail.attempts.length})
                  </summary>
                  <ul className="mt-2 space-y-1">
                    {detail.attempts.map((attempt) => (
                      <li key={attempt.id} className="flex flex-wrap gap-x-2">
                        <span className="font-semibold text-text-primary">
                          {attempt.activity_title}
                        </span>
                        <span>{attempt.status}</span>
                        <span>{fmtDate(attempt.completed_at ?? attempt.started_at)}</span>
                        {attempt.verification_status && (
                          <span>· {label(attempt.verification_status)}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
