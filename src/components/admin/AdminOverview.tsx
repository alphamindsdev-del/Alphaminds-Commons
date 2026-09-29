import { useQuery } from "@tanstack/react-query";
import { Calendar, FileText, Users, Zap, AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AdminTable, EmptyRow } from "./AdminKit";

interface Stats {
  total_members: number;
  active_today: number;
  upcoming_events: number;
  content_published_today: number;
}

interface CronLog {
  id: string;
  job_name: string;
  scheduled_at: string;
  started_at: string | null;
  completed_at: string | null;
  status: string;
  records_processed: number | null;
  error_message: string | null;
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number | undefined; icon: any; accent: string }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 card-shadow">
      <div className="flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-widest text-text-secondary">{label}</p>
        <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${accent}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-3 font-black text-3xl tabular-nums text-text-primary">{value ?? "—"}</p>
    </div>
  );
}

function statusPill(status: string) {
  if (status === "success") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 text-emerald-600 px-2 py-0.5 text-[11px] font-bold">
        <CheckCircle2 className="h-3 w-3" /> success
      </span>
    );
  }
  if (status === "running") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-500/10 text-sky-600 px-2 py-0.5 text-[11px] font-bold">
        <RefreshCw className="h-3 w-3 animate-spin" /> running
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 text-destructive px-2 py-0.5 text-[11px] font-bold">
      <AlertTriangle className="h-3 w-3" /> {status}
    </span>
  );
}

function fmtDateTime(iso: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export function AdminOverview() {
  const stats = useQuery<Stats>({
    queryKey: ["admin", "stats"],
    queryFn: () => apiFetch<Stats>("/v1/admin/stats"),
    refetchInterval: 60_000,
  });

  const cronLogs = useQuery<{ data: CronLog[] }>({
    queryKey: ["admin", "cron-logs"],
    queryFn: () => apiFetch<{ data: CronLog[] }>("/v1/admin/cron-logs?limit=15"),
    refetchInterval: 60_000,
  });

  return (
    <div className="space-y-8">
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Members" value={stats.data?.total_members} icon={Users} accent="bg-primary/10 text-primary" />
        <StatCard label="Active Today" value={stats.data?.active_today} icon={Zap} accent="bg-amber-500/10 text-amber-600" />
        <StatCard label="Upcoming Events" value={stats.data?.upcoming_events} icon={Calendar} accent="bg-violet-500/10 text-violet-600" />
        <StatCard label="Content Today" value={stats.data?.content_published_today} icon={FileText} accent="bg-emerald-500/10 text-emerald-600" />
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary">Cron Health</h2>
            <p className="text-sm text-text-secondary mt-0.5">Most recent scheduled job runs.</p>
          </div>
          <button
            onClick={() => { stats.refetch(); cronLogs.refetch(); }}
            className="rounded-xl border border-border px-3.5 py-2 text-sm font-bold hover:border-primary/40 transition-colors"
          >
            Refresh
          </button>
        </div>
        <AdminTable
          head={
            <tr>
              <th className="text-left px-4 py-3 font-bold">Job</th>
              <th className="text-left px-4 py-3 font-bold">Started</th>
              <th className="text-left px-4 py-3 font-bold">Status</th>
              <th className="text-right px-4 py-3 font-bold">Records</th>
            </tr>
          }
        >
          {cronLogs.isLoading ? (
            <EmptyRow colSpan={4} message="Loading cron logs…" />
          ) : (cronLogs.data?.data ?? []).length === 0 ? (
            <EmptyRow colSpan={4} message="No cron runs recorded yet." />
          ) : (
            cronLogs.data!.data.map((log) => (
              <tr key={log.id} className="border-t border-border">
                <td className="px-4 py-3 font-semibold text-text-primary">{log.job_name}</td>
                <td className="px-4 py-3 text-text-secondary">{fmtDateTime(log.started_at ?? log.scheduled_at)}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1">
                    {statusPill(log.status)}
                    {log.error_message && <span className="text-[11px] text-destructive max-w-[280px] truncate">{log.error_message}</span>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-text-secondary">{log.records_processed ?? "—"}</td>
              </tr>
            ))
          )}
        </AdminTable>
      </section>
    </div>
  );
}
