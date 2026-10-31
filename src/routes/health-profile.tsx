import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity,
  HeartPulse,
  Loader2,
  Lock,
  Ruler,
  Save,
  ShieldCheck,
  Sparkles,
  Weight,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AssetImage } from "@/components/alphabody/AssetImage";
import { BodySilhouette } from "@/components/alphabody/BodySilhouette";

export const Route = createFileRoute("/health-profile")({
  head: () => ({
    meta: [
      { title: "Health Profile · AlphaBody" },
      {
        name: "description",
        content: "Your private health details, vital signs, medical background and health goals.",
      },
    ],
  }),
  component: HealthProfilePage,
});

const PROFILE_IMAGE = "/assets/images/health-profile-body.webp";

interface HealthProfile {
  member_id: string;
  height_cm: number | null;
  weight_kg: number | null;
  blood_type: string | null;
  allergies: string | null;
  conditions: string | null;
  medications: string | null;
  health_goals: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string;
  updated_at: string;
}

interface HealthProfileResponse {
  profile: HealthProfile | null;
  member: { age: number | null; gender: string | null } | null;
}

const BLOOD_TYPES = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];

const emptyForm = {
  height_cm: "",
  weight_kg: "",
  blood_type: "",
  allergies: "",
  conditions: "",
  medications: "",
  health_goals: "",
  emergency_contact_name: "",
  emergency_contact_phone: "",
};

type FormState = typeof emptyForm;

function bmiCategory(bmi: number) {
  if (bmi < 18.5) return { label: "Below range", tone: "text-amber-700" };
  if (bmi < 25) return { label: "Healthy range", tone: "text-[#1F7A4D]" };
  if (bmi < 30) return { label: "Above range", tone: "text-amber-700" };
  return { label: "High range", tone: "text-red-700" };
}

function HealthProfilePage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FormState>(emptyForm);

  const { data, isLoading } = useQuery<HealthProfileResponse>({
    queryKey: ["health/profile"],
    queryFn: () => apiFetch<HealthProfileResponse>("/v1/health/profile"),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const profile = data?.profile;
    if (!profile) return;
    setForm({
      height_cm: profile.height_cm?.toString() ?? "",
      weight_kg: profile.weight_kg?.toString() ?? "",
      blood_type: profile.blood_type ?? "",
      allergies: profile.allergies ?? "",
      conditions: profile.conditions ?? "",
      medications: profile.medications ?? "",
      health_goals: profile.health_goals ?? "",
      emergency_contact_name: profile.emergency_contact_name ?? "",
      emergency_contact_phone: profile.emergency_contact_phone ?? "",
    });
  }, [data?.profile]);

  const save = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ profile: HealthProfile }>("/v1/health/profile", {
        method: "PUT",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Health profile saved");
      queryClient.invalidateQueries({ queryKey: ["health/profile"] });
    },
    onError: (error: Error) => toast.error(error.message || "Could not save your profile"),
  });

  const update = (field: keyof FormState, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const height = form.height_cm ? Number(form.height_cm) : null;
    const weight = form.weight_kg ? Number(form.weight_kg) : null;
    if (height !== null && (height < 30 || height > 300)) {
      toast.error("Height should be between 30 and 300 cm.");
      return;
    }
    if (weight !== null && (weight < 1 || weight > 700)) {
      toast.error("Weight should be between 1 and 700 kg.");
      return;
    }
    save.mutate({
      height_cm: height,
      weight_kg: weight,
      blood_type: form.blood_type || null,
      allergies: form.allergies.trim() || null,
      conditions: form.conditions.trim() || null,
      medications: form.medications.trim() || null,
      health_goals: form.health_goals.trim() || null,
      emergency_contact_name: form.emergency_contact_name.trim() || null,
      emergency_contact_phone: form.emergency_contact_phone.trim() || null,
    });
  };

  const bmi = useMemo(() => {
    const height = Number(form.height_cm);
    const weight = Number(form.weight_kg);
    if (!height || !weight) return null;
    return weight / Math.pow(height / 100, 2);
  }, [form.height_cm, form.weight_kg]);

  const completion = useMemo(() => {
    const values = Object.values(form).filter((value) => value.trim().length > 0);
    return Math.round((values.length / Object.keys(form).length) * 100);
  }, [form]);

  const bmiInfo = bmi ? bmiCategory(bmi) : null;

  return (
    <div className="mx-auto max-w-[960px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#FBEDE9] p-5 sm:p-8">
        <div className="grid items-center gap-4 sm:grid-cols-[1.15fr_0.85fr]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#C94B3B]">
              AlphaBody
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.02] tracking-tight text-[#4A1F18] sm:text-4xl">
              Health Profile
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#7A4A42]">
              Keep your health details in one private place so every conversation, visit and
              decision starts with the full picture.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] font-semibold text-[#C94B3B]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <Lock className="h-3.5 w-3.5" /> Private to you
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> You control sharing
              </span>
            </div>
          </div>
          <div className="relative h-44 overflow-hidden rounded-[22px] bg-white/40 sm:h-56">
            <AssetImage
              src={PROFILE_IMAGE}
              alt=""
              loading="eager"
              className="h-full w-full"
              imgClassName="h-full w-full object-contain object-bottom"
              fallback={<BodySilhouette className="h-full w-full" />}
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <form onSubmit={onSubmit} className="space-y-4">
          <section className="rounded-[24px] border border-divider bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#C94B3B]" />
              <h2 className="font-display text-lg font-bold text-text-primary">Body metrics</h2>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <label className="block">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  <Ruler className="h-3 w-3" /> Height (cm)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={30}
                  max={300}
                  step="0.1"
                  value={form.height_cm}
                  onChange={(event) => update("height_cm", event.target.value)}
                  placeholder="170"
                  className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
              <label className="block">
                <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  <Weight className="h-3 w-3" /> Weight (kg)
                </span>
                <input
                  type="number"
                  inputMode="decimal"
                  min={1}
                  max={700}
                  step="0.1"
                  value={form.weight_kg}
                  onChange={(event) => update("weight_kg", event.target.value)}
                  placeholder="70"
                  className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Blood type
                </span>
                <select
                  value={form.blood_type}
                  onChange={(event) => update("blood_type", event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                >
                  <option value="">Not sure</option>
                  {BLOOD_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="mt-3 text-[11px] text-text-secondary">
              {data?.member?.age ? `Age ${data.member.age}` : "Age not set"}
              {data?.member?.gender ? ` · ${data.member.gender}` : ""} · Update age and gender in
              your account settings.
            </p>
          </section>

          <section className="rounded-[24px] border border-divider bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[#C94B3B]" />
              <h2 className="font-display text-lg font-bold text-text-primary">
                Medical background
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Allergies
                </span>
                <textarea
                  value={form.allergies}
                  onChange={(event) => update("allergies", event.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Medications, foods, environmental triggers…"
                  className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Conditions
                </span>
                <textarea
                  value={form.conditions}
                  onChange={(event) => update("conditions", event.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Diagnoses or ongoing conditions you want on record."
                  className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Medications
                </span>
                <textarea
                  value={form.medications}
                  onChange={(event) => update("medications", event.target.value)}
                  maxLength={2000}
                  rows={2}
                  placeholder="Current medications, supplements or treatments."
                  className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
            </div>
          </section>

          <section className="rounded-[24px] border border-divider bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-[#C94B3B]" />
              <h2 className="font-display text-lg font-bold text-text-primary">
                Goals & emergency contact
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Health goals
                </span>
                <textarea
                  value={form.health_goals}
                  onChange={(event) => update("health_goals", event.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="What does feeling well look like for you right now?"
                  className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Emergency contact name
                  </span>
                  <input
                    value={form.emergency_contact_name}
                    onChange={(event) => update("emergency_contact_name", event.target.value)}
                    maxLength={200}
                    placeholder="Full name"
                    className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                    Emergency contact phone
                  </span>
                  <input
                    type="tel"
                    value={form.emergency_contact_phone}
                    onChange={(event) => update("emergency_contact_phone", event.target.value)}
                    maxLength={50}
                    placeholder="+1 555 000 0000"
                    className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#C94B3B]"
                  />
                </label>
              </div>
            </div>
          </section>

          <button
            type="submit"
            disabled={save.isPending || isLoading}
            className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#C94B3B] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            {save.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {save.isPending ? "Saving…" : "Save health profile"}
          </button>
        </form>

        <aside className="space-y-3">
          <section className="rounded-[24px] border border-divider bg-[#F7F5EE] p-5">
            <h2 className="font-display text-lg font-bold text-text-primary">
              Profile completeness
            </h2>
            <div className="mt-3 flex items-center gap-4">
              <div className="relative h-16 w-16 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-black/5"
                  />
                  <circle
                    cx="18"
                    cy="18"
                    r="15"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 15}
                    strokeDashoffset={2 * Math.PI * 15 * (1 - completion / 100)}
                    className="text-[#C94B3B] transition-all duration-500"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-[#4A1F18]">
                  {completion}%
                </span>
              </div>
              <p className="text-xs leading-relaxed text-text-secondary">
                The more context you add, the more useful your clinic conversations can be.
              </p>
            </div>
          </section>

          <section className="rounded-[24px] border border-divider bg-card p-5">
            <h2 className="font-display text-lg font-bold text-text-primary">BMI estimate</h2>
            {bmi ? (
              <>
                <p className="mt-2 font-display text-3xl font-black text-text-primary">
                  {bmi.toFixed(1)}
                </p>
                <p className={`mt-1 text-xs font-bold ${bmiInfo?.tone}`}>{bmiInfo?.label}</p>
              </>
            ) : (
              <p className="mt-2 text-xs text-text-secondary">
                Add your height and weight to see an estimate.
              </p>
            )}
            <p className="mt-3 text-[10px] leading-relaxed text-text-secondary">
              BMI is a screening tool, not a diagnosis. It does not account for muscle mass, body
              composition or individual health context.
            </p>
          </section>

          <section className="rounded-[24px] border border-divider bg-[#F1F8E8] p-5">
            <h2 className="font-display text-base font-bold text-[#16321F]">Next steps</h2>
            <div className="mt-3 space-y-2">
              <Link
                to="/health-assessment"
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2.5 text-xs font-bold text-[#1F7A4D]"
              >
                Take the health assessment <span>→</span>
              </Link>
              <Link
                to="/wellness-clinic"
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2.5 text-xs font-bold text-[#1F7A4D]"
              >
                Request a clinic visit <span>→</span>
              </Link>
              <Link
                to="/health-records"
                className="flex items-center justify-between rounded-xl bg-white/70 px-3 py-2.5 text-xs font-bold text-[#1F7A4D]"
              >
                Upload a health record <span>→</span>
              </Link>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
