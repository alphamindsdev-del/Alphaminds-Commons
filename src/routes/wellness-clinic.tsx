import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  CalendarDays,
  CheckCircle2,
  Clock,
  HeartPulse,
  Loader2,
  MapPin,
  Send,
  ShieldCheck,
  Stethoscope,
  Video,
} from "lucide-react";
import { apiFetch } from "@/lib/api";
import { AssetImage } from "@/components/alphabody/AssetImage";

export const Route = createFileRoute("/wellness-clinic")({
  head: () => ({
    meta: [
      { title: "Wellness Clinic · AlphaBody" },
      {
        name: "description",
        content: "Request a personal or group wellness consultation with a qualified clinician.",
      },
    ],
  }),
  component: WellnessClinicPage,
});

const CLINIC_IMAGE = "/assets/images/wellness-clinic.webp";

interface ClinicRequest {
  id: string;
  preferred_date: string | null;
  preferred_time: string | null;
  mode: "in_person" | "virtual";
  reason: string;
  contact_phone: string | null;
  status: "requested" | "scheduled" | "completed" | "cancelled";
  admin_notes: string | null;
  created_at: string;
}

const statusStyles: Record<ClinicRequest["status"], string> = {
  requested: "bg-amber-100 text-amber-800",
  scheduled: "bg-blue-100 text-blue-800",
  completed: "bg-[#EAF5DF] text-[#1F7A4D]",
  cancelled: "bg-subtle text-text-secondary",
};

function WellnessClinicPage() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"in_person" | "virtual">("in_person");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [reason, setReason] = useState("");
  const [phone, setPhone] = useState("");

  const { data, isLoading } = useQuery<{ data: ClinicRequest[] }>({
    queryKey: ["health/clinic/requests"],
    queryFn: () => apiFetch<{ data: ClinicRequest[] }>("/v1/health/clinic/requests"),
    staleTime: 30_000,
  });

  const createRequest = useMutation({
    mutationFn: (payload: Record<string, unknown>) =>
      apiFetch<{ request: ClinicRequest }>("/v1/health/clinic/requests", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
    onSuccess: () => {
      toast.success("Consultation request sent");
      setReason("");
      setPreferredDate("");
      setPreferredTime("");
      setPhone("");
      setMode("in_person");
      queryClient.invalidateQueries({ queryKey: ["health/clinic/requests"] });
    },
    onError: (error: Error) => {
      toast.error(error.message || "Could not send your request");
    },
  });

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (reason.trim().length < 5) {
      toast.error("Please share a little more about what you need.");
      return;
    }
    createRequest.mutate({
      mode,
      preferred_date: preferredDate || undefined,
      preferred_time: preferredTime || undefined,
      reason: reason.trim(),
      contact_phone: phone.trim() || undefined,
    });
  };

  const requests = data?.data ?? [];

  return (
    <div className="mx-auto max-w-[960px] space-y-5 pb-6">
      <section className="relative overflow-hidden rounded-[26px] bg-[#E8F1F7] p-5 sm:p-8">
        <div className="grid items-center gap-4 sm:grid-cols-[1.1fr_0.9fr]">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#2F6B8F]">
              AlphaBody Care
            </p>
            <h1 className="mt-2 font-display text-3xl font-black leading-[1.02] tracking-tight text-[#17384A] sm:text-4xl">
              Wellness Clinic
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-relaxed text-[#4A6474]">
              Personal and group doctor visits, clinical consultations and follow-up. Tell us what
              you need and the care team will confirm the next available time.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-[11px] font-semibold text-[#2F6B8F]">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <ShieldCheck className="h-3.5 w-3.5" /> Confidential
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/70 px-3 py-1.5">
                <Stethoscope className="h-3.5 w-3.5" /> Qualified clinicians
              </span>
            </div>
          </div>
          <div className="relative h-44 overflow-hidden rounded-[22px] bg-white/50 sm:h-56">
            <AssetImage
              src={CLINIC_IMAGE}
              alt="A clinician in a calm consultation setting"
              loading="eager"
              className="h-full w-full"
              imgClassName="h-full w-full object-cover object-center"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#ffffff,#d8e8f2_75%)]">
                  <span className="grid h-20 w-20 place-items-center rounded-3xl bg-white/80 text-[#2F6B8F] shadow-sm">
                    <Stethoscope className="h-10 w-10" />
                  </span>
                </div>
              }
            />
          </div>
        </div>
      </section>

      <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[24px] border border-divider bg-card p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5 text-[#2F6B8F]" />
            <h2 className="font-display text-xl font-bold text-text-primary">Request a visit</h2>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            This is a request, not a confirmed appointment. The clinic will contact you to schedule.
          </p>

          <form onSubmit={onSubmit} className="mt-5 space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Visit type
              </span>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {[
                  { value: "in_person" as const, label: "In person", icon: MapPin },
                  { value: "virtual" as const, label: "Virtual", icon: Video },
                ].map((option) => {
                  const selected = mode === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setMode(option.value)}
                      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-sm font-semibold transition ${
                        selected
                          ? "border-[#2F6B8F] bg-[#E8F1F7] text-[#17384A]"
                          : "border-divider bg-white text-text-primary"
                      }`}
                    >
                      <option.icon className="h-4 w-4" /> {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Preferred date
                </span>
                <input
                  type="date"
                  value={preferredDate}
                  min={new Date().toISOString().slice(0, 10)}
                  onChange={(event) => setPreferredDate(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#2F6B8F]"
                />
              </label>
              <label className="block">
                <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                  Preferred time
                </span>
                <input
                  type="time"
                  value={preferredTime}
                  onChange={(event) => setPreferredTime(event.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#2F6B8F]"
                />
              </label>
            </div>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                What would you like to discuss?
              </span>
              <textarea
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                required
                minLength={5}
                maxLength={2000}
                rows={4}
                placeholder="Share your concern, question or goal. Please avoid sensitive details you are not comfortable putting in writing."
                className="mt-1.5 w-full resize-none rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#2F6B8F]"
              />
            </label>

            <label className="block">
              <span className="text-[11px] font-bold uppercase tracking-wider text-text-secondary">
                Contact phone <span className="font-normal normal-case">(optional)</span>
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={50}
                placeholder="+1 555 000 0000"
                className="mt-1.5 w-full rounded-xl border border-divider bg-white px-3 py-2.5 text-sm text-text-primary outline-none focus:border-[#2F6B8F]"
              />
            </label>

            <button
              type="submit"
              disabled={createRequest.isPending}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#2F6B8F] px-4 py-3 text-sm font-bold text-white disabled:opacity-60"
            >
              {createRequest.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              {createRequest.isPending ? "Sending…" : "Send request"}
            </button>
          </form>
        </section>

        <section className="space-y-3">
          <div className="rounded-[24px] border border-divider bg-[#F7F5EE] p-5">
            <h2 className="font-display text-lg font-bold text-text-primary">Your requests</h2>
            {isLoading ? (
              <div className="mt-3 h-20 animate-pulse rounded-xl bg-subtle" />
            ) : requests.length === 0 ? (
              <div className="mt-4 rounded-xl border border-dashed border-divider bg-white/60 p-4 text-center">
                <Clock className="mx-auto h-6 w-6 text-[#2F6B8F]" />
                <p className="mt-2 text-sm font-semibold text-text-primary">No requests yet</p>
                <p className="mt-1 text-xs text-text-secondary">
                  Send your first request and the clinic will follow up.
                </p>
              </div>
            ) : (
              <div className="mt-3 space-y-2.5">
                {requests.map((request) => (
                  <div key={request.id} className="rounded-xl border border-divider bg-white p-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-text-primary">
                          {request.mode === "virtual" ? "Virtual visit" : "In-person visit"}
                        </p>
                        <p className="mt-0.5 text-[11px] text-text-secondary">
                          {request.preferred_date
                            ? new Date(`${request.preferred_date}T00:00:00`).toLocaleDateString(
                                "en-US",
                                {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                },
                              )
                            : "Flexible date"}
                          {request.preferred_time ? ` · ${request.preferred_time}` : ""}
                        </p>
                      </div>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-wider ${statusStyles[request.status]}`}
                      >
                        {request.status}
                      </span>
                    </div>
                    <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-text-secondary">
                      {request.reason}
                    </p>
                    {request.admin_notes && (
                      <p className="mt-2 rounded-lg bg-[#E8F1F7] px-2.5 py-2 text-[11px] text-[#17384A]">
                        <span className="font-bold">Clinic note:</span> {request.admin_notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-[24px] border border-[#CFE4B8] bg-[#F1F8E8] p-5">
            <div className="flex items-center gap-2">
              <HeartPulse className="h-5 w-5 text-[#1F7A4D]" />
              <h2 className="font-display text-lg font-bold text-[#16321F]">Before you request</h2>
            </div>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-[#4A5A45]">
              {[
                "For emergencies, contact local emergency services immediately.",
                "The clinic does not replace your regular doctor or specialist.",
                "You can update your health profile before your visit.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#4C8C2E]" />
                  {item}
                </li>
              ))}
            </ul>
            <Link
              to="/health-profile"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-bold text-[#1F7A4D]"
            >
              Update health profile <CalendarDays className="h-3.5 w-3.5" />
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
