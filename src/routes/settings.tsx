import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTheme } from "@/hooks/useTheme";
import { useFontSize } from "@/hooks/useFontSize";
import { TierBadge } from "@/components/common/TierBadge";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { apiFetch } from "@/lib/api";
import { DEFAULT_SETTINGS, type MemberSettings } from "../../workers/shared/settings";
import { toast } from "sonner";
import { X } from "lucide-react";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · AlphaMinds" }] }),
  component: SettingsPage,
});

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <p className="eyebrow px-1 mb-2">{title}</p>
      <div className="rounded-2xl border border-border bg-card divide-y divide-border card-shadow overflow-hidden">{children}</div>
    </section>
  );
}

function Row({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 p-4">
      <div className="font-semibold text-text-primary">{label}</div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <button onClick={onChange} className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors" style={{ background: checked ? "var(--primary)" : "var(--subtle)" }} aria-pressed={checked}>
      <span className="inline-block h-5 w-5 transform rounded-full bg-white transition-transform" style={{ transform: checked ? "translateX(22px)" : "translateX(2px)" }} />
    </button>
  );
}

function DeleteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { clearSession } = useAuthStore();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const handleDelete = async () => {
    if (!password) { toast.error("Enter your password to confirm"); return; }
    setLoading(true);
    try {
      await apiFetch("/v1/me/account", { method: "DELETE", body: JSON.stringify({ password }) });
      toast.success("Account deleted");
      clearSession();
    } catch (err: any) {
      toast.error(err.message ?? "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-xl text-destructive">Delete Account</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>
        <p className="text-sm text-text-secondary mb-4">This is permanent. Enter your password to confirm.</p>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="w-full rounded-[10px] border border-border bg-surface px-4 py-3 text-text-primary mb-4" />
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-border font-bold py-3 text-sm">Cancel</button>
          <button onClick={handleDelete} disabled={loading} className="flex-1 rounded-xl bg-destructive text-white font-bold py-3 text-sm disabled:opacity-50">{loading ? "Deleting..." : "Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function EmailPrefsDialog({ open, onClose, settings, onSave }: { open: boolean; onClose: () => void; settings: MemberSettings; onSave: (patch: Partial<MemberSettings>) => void }) {
  const [weeklyDigest, setWeeklyDigest] = useState(settings.emailWeeklyDigest);
  const [marketing, setMarketing] = useState(settings.emailMarketing);

  useEffect(() => {
    if (open) {
      setWeeklyDigest(settings.emailWeeklyDigest);
      setMarketing(settings.emailMarketing);
    }
  }, [open, settings.emailWeeklyDigest, settings.emailMarketing]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-6 card-shadow" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-black text-xl">Email Preferences</h2>
          <button onClick={onClose} className="text-text-secondary hover:text-text-primary"><X className="h-5 w-5" /></button>
        </div>
        <div className="space-y-4">
          <label className="flex items-center justify-between">
            <span className="text-sm font-semibold">Weekly digest</span>
            <Toggle checked={weeklyDigest} onChange={() => setWeeklyDigest(!weeklyDigest)} />
          </label>
          <label className="flex items-center justify-between">
            <span className="text-sm font-semibold">Marketing emails</span>
            <Toggle checked={marketing} onChange={() => setMarketing(!marketing)} />
          </label>
        </div>
        <button
          onClick={() => { onSave({ emailWeeklyDigest: weeklyDigest, emailMarketing: marketing }); onClose(); }}
          className="w-full rounded-xl bg-primary text-primary-foreground font-bold py-3 mt-4"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function SettingsPage() {
  const { member } = useAuthStore();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const { fontSize, setFontSize } = useFontSize();
  const queryClient = useQueryClient();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [emailPrefsOpen, setEmailPrefsOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const [settings, setSettings] = useState<MemberSettings>(DEFAULT_SETTINGS);

  const { data } = useQuery({
    queryKey: ["member-settings"],
    queryFn: () => apiFetch<{ settings: MemberSettings }>("/v1/me/settings"),
  });

  useEffect(() => {
    if (data?.settings) setSettings(data.settings);
  }, [data]);

  const saveSettings = useMutation({
    mutationFn: (patch: Partial<MemberSettings>) =>
      apiFetch<{ settings: MemberSettings }>("/v1/me/settings", {
        method: "PUT",
        body: JSON.stringify({ settings: patch }),
      }),
    onSuccess: (res) => {
      if (res?.settings) setSettings(res.settings);
      queryClient.invalidateQueries({ queryKey: ["member-settings"] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Couldn't save preference");
      queryClient.invalidateQueries({ queryKey: ["member-settings"] });
    },
  });

  const update = (patch: Partial<MemberSettings>) => {
    setSettings((prev) => ({ ...prev, ...patch }));
    saveSettings.mutate(patch);
  };

  const handleDataExport = async () => {
    setDataLoading(true);
    try {
      await apiFetch("/v1/me/data-export");
      toast.success("Data export requested. Check your email.");
    } catch (err: any) {
      toast.error(err.message ?? "Request failed");
    } finally {
      setDataLoading(false);
    }
  };

  if (!member) return null;

  return (
    <div className="space-y-10 max-w-2xl mx-auto">
      <PageHeader
        eyebrow="Preferences"
        title="Settings"
        subtitle="Tune your account, notifications, appearance, and privacy so the Commons feels like home."
      />

      <Section title="Account">
        <Row label="Profile"><Link to="/profile" className="text-sm font-bold text-primary">Edit →</Link></Row>
        <Row label="Change password"><button onClick={() => navigate({ to: "/forgot-password" })} className="text-sm font-bold text-primary">Update</button></Row>
        <Row label="Email preferences"><button onClick={() => setEmailPrefsOpen(true)} className="text-sm font-bold text-primary">Manage</button></Row>
      </Section>

      <Section title="Notifications">
        <Row label="Push notifications"><Toggle checked={settings.pushNotifications} onChange={() => update({ pushNotifications: !settings.pushNotifications })} /></Row>
        <Row label="Email notifications"><Toggle checked={settings.emailNotifications} onChange={() => update({ emailNotifications: !settings.emailNotifications })} /></Row>
        <Row label="Daily content reminder"><Toggle checked={settings.dailyContentReminder} onChange={() => update({ dailyContentReminder: !settings.dailyContentReminder })} /></Row>
      </Section>

      <Section title="Appearance">
        <Row label="Theme">
          <button onClick={toggle} className="rounded-full border border-border px-3 py-1.5 text-sm font-bold capitalize">{theme}</button>
        </Row>
        <Row label="Font size">
          <div className="flex gap-1 rounded-full bg-subtle p-1">
            {(["sm", "md", "lg"] as const).map((s) => (
              <button key={s} onClick={() => setFontSize(s)} className={`px-3 py-1 rounded-full text-xs font-bold ${fontSize === s ? "bg-primary text-primary-foreground" : "text-text-secondary"}`}>
                {s === "sm" ? "Small" : s === "md" ? "Medium" : "Large"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Privacy">
        <Row label="Profile visibility">
          <div className="flex gap-1 rounded-full bg-subtle p-1">
            {(["public", "members"] as const).map((v) => (
              <button key={v} onClick={() => update({ profileVisibility: v })} className={`px-3 py-1 rounded-full text-xs font-bold capitalize ${settings.profileVisibility === v ? "bg-primary text-primary-foreground" : "text-text-secondary"}`}>{v === "members" ? "Members only" : v}</button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title="Subscription">
        <Row label={<div className="flex items-center gap-2">Current plan <TierBadge tier={member.subscription_tier} /></div>}>
          <Link to="/subscription" className="rounded-xl bg-primary text-primary-foreground font-bold px-3 py-1.5 text-sm">Upgrade</Link>
        </Row>
      </Section>

      <Section title="Data">
        <Row label="Download my data">
          <button onClick={handleDataExport} disabled={dataLoading} className="text-sm font-bold text-primary disabled:opacity-50">{dataLoading ? "Requesting..." : "Request"}</button>
        </Row>
        <div className="p-4">
          <button onClick={() => setDeleteOpen(true)} className="text-sm font-bold text-destructive">Delete account</button>
          <p className="text-xs text-text-secondary mt-1">This is permanent. We'll keep nothing.</p>
        </div>
      </Section>

      <DeleteDialog open={deleteOpen} onClose={() => setDeleteOpen(false)} />
      <EmailPrefsDialog open={emailPrefsOpen} onClose={() => setEmailPrefsOpen(false)} settings={settings} onSave={update} />
    </div>
  );
}
