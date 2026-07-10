import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP, HOUSES, type HouseId } from "@/lib/constants";
import { Avatar } from "@/components/common/Avatar";
import { HouseBadge } from "@/components/common/HouseBadge";
import { TierBadge } from "@/components/common/TierBadge";
import { Calendar, Plus, Users as UsersIcon, Sparkles, CheckCircle2, AlertTriangle, Settings, X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { toast } from "sonner";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · AlphaMinds" }] }),
  component: AdminPage,
});

const crons = [
  { name: "Daily Content Publisher", last: "Today, 5:00 AM", status: "ok", records: 1 },
  { name: "Streak Calculator", last: "Today, 12:30 AM", status: "ok", records: 1247 },
  { name: "Event Reminders", last: "Today, 9:00 AM", status: "ok", records: 88 },
  { name: "Challenge Scorer", last: "Today, 1:00 AM", status: "fail", records: 0 },
  { name: "Weekly Digest", last: "Mon, 8:00 AM", status: "ok", records: 1247 },
];

function DailyContentModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [house, setHouse] = useState("wellness");
  const [contentType, setContentType] = useState("insight");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleCreate = async () => {
    if (!title || !body) { toast.error("Title and body are required"); return; }
    setLoading(true);
    try {
      await apiFetch("/v1/admin/daily-content", {
        method: "POST",
        body: JSON.stringify({ house, content_type: contentType, title, body }),
      });
      toast.success("Daily content created");
      onClose();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-card p-6 card-shadow space-y-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h2 className="font-black text-xl">Create Daily Content</h2><button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="h-5 w-5" /></button></div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">House</label>
          <select value={house} onChange={(e) => setHouse(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary">
            {HOUSES.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Type</label>
          <select value={contentType} onChange={(e) => setContentType(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary">
            <option value="insight">Insight</option>
            <option value="challenge">Challenge</option>
            <option value="question">Question</option>
            <option value="wellness_tip">Wellness Tip</option>
            <option value="humanity_action">Humanity Action</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary" />
        </div>
        <div>
          <label className="block text-xs font-bold uppercase tracking-widest text-text-secondary mb-2">Body</label>
          <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary resize-none" />
        </div>
        <button onClick={handleCreate} disabled={loading} className="w-full rounded-xl bg-primary text-white font-bold py-3 disabled:opacity-50">{loading ? "Creating..." : "Create"}</button>
      </div>
    </div>
  );
}

function AdminPage() {
  const { member: authMember } = useAuthStore();
  const [dailyOpen, setDailyOpen] = useState(false);
  const currentMember = authMember ? {
    id: authMember.id, name: authMember.display_name, username: authMember.username,
    primaryHouse: authMember.primary_house, tier: authMember.subscription_tier,
    joinedAt: "", role: authMember.role,
  } : { id: "", name: "Admin", username: "admin", primaryHouse: "wellness" as const, tier: "free" as const, joinedAt: "", role: "admin" };
  const otherMembers: any[] = [];
  const week = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return (
    <div className="space-y-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="font-black text-3xl">Admin Dashboard</h1>
          <p className="text-text-secondary mt-1">Operational health & community ops.</p>
        </div>
        <span className="rounded-full bg-accent/20 text-primary px-3 py-1 text-xs font-black uppercase tracking-widest">Admin</span>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Members", value: "1,247", delta: "+12 today" },
          { label: "Active Today", value: "89", delta: "7% of base" },
          { label: "Events This Month", value: "12", delta: "3 upcoming" },
          { label: "Daily Content Streak", value: "47 days", delta: "✓ all green", green: true },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-border bg-card p-5 card-shadow">
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">{s.label}</p>
            <p className="mt-2 font-black text-2xl">{s.value}</p>
            <p className={`text-xs mt-1 font-semibold ${s.green ? "text-emerald-500" : "text-text-secondary"}`}>{s.delta}</p>
          </div>
        ))}
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <h2 className="font-bold text-lg mb-4">Cron Health</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-text-secondary text-xs uppercase tracking-widest">
              <tr><th className="text-left py-2">Job</th><th className="text-left py-2">Last Run</th><th className="text-left py-2">Status</th><th className="text-right py-2">Records</th></tr>
            </thead>
            <tbody>
              {crons.map((c) => (
                <tr key={c.name} className="border-t border-border">
                  <td className="py-3 font-semibold">{c.name}</td>
                  <td className="py-3 text-text-secondary">{c.last}</td>
                  <td className="py-3">
                    <span className={`inline-flex items-center gap-1 text-xs font-bold rounded-full px-2 py-0.5 ${c.status === "ok" ? "bg-emerald-500/10 text-emerald-600" : "bg-destructive/10 text-destructive"}`}>
                      {c.status === "ok" ? <><CheckCircle2 className="h-3 w-3" /> success</> : <><AlertTriangle className="h-3 w-3" /> failed</>}
                    </span>
                  </td>
                  <td className="py-3 text-right tabular-nums">{c.records.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <h2 className="font-bold text-lg mb-4">Recent Members</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <tbody>
              {[currentMember, ...otherMembers].slice(0, 5).map((m: any) => {
                const h = HOUSE_MAP[m.primaryHouse as HouseId];
                return (
                  <tr key={m.id} className="border-t border-border first:border-t-0">
                    <td className="py-3"><div className="flex items-center gap-3"><Avatar name={m.name} size="sm" color={h.color} /><div className="font-semibold">{m.name}</div></div></td>
                    <td className="py-3 text-text-secondary hidden md:table-cell">@{m.username}</td>
                    <td className="py-3"><HouseBadge house={m.primaryHouse} size="sm" /></td>
                    <td className="py-3"><TierBadge tier={m.tier} /></td>
                    <td className="py-3 text-text-secondary text-xs hidden md:table-cell">Joined {m.joinedAt}</td>
                    <td className="py-3 text-right"><label className="inline-flex items-center gap-2 text-xs font-bold"><input type="checkbox" defaultChecked className="accent-primary" /> Active</label></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <h2 className="font-bold text-lg mb-4">Quick Actions</h2>
        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { Icon: Sparkles, label: "Create Daily Content", onClick: () => setDailyOpen(true) },
            { Icon: Calendar, label: "Create Event" },
            { Icon: Settings, label: "Manage Rooms" },
          ].map(({ Icon, label, onClick }) => (
            <button key={label} onClick={onClick} className="rounded-2xl border border-border bg-card p-5 card-shadow text-left flex items-center gap-3 card-hover">
              <div className="h-10 w-10 rounded-xl bg-primary text-white flex items-center justify-center"><Icon className="h-5 w-5" /></div>
              <span className="font-bold text-text-primary">{label}</span>
              <Plus className="h-4 w-4 ml-auto text-text-secondary" />
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <h2 className="font-bold text-lg mb-4">Daily Content Calendar — This Week</h2>
        <div className="grid grid-cols-7 gap-2">
          {week.map((d, i) => {
            const h = HOUSES.find((x) => x.dayOfWeek === i);
            const scheduled = !!h;
            return (
              <div key={d} className="rounded-xl border border-border p-3 text-center">
                <p className="text-xs font-bold text-text-secondary">{d}</p>
                <div className="mt-2 h-3 w-3 rounded-full mx-auto" style={{ background: scheduled ? (h!.color) : "var(--subtle)" }} />
                <p className="text-[10px] mt-1 text-text-secondary truncate">{scheduled ? h!.name : "—"}</p>
              </div>
            );
          })}
        </div>
      </section>
      <DailyContentModal open={dailyOpen} onClose={() => setDailyOpen(false)} />
    </div>
  );
}
