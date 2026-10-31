import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowRight,
  ArrowUpRight,
  BookMarked,
  FileText,
  HeartPulse,
  Quote,
  Share2,
  Stethoscope,
} from "lucide-react";
import { ProductSwitcher } from "@/components/layout/ProductSwitcher";
import { AssetImage } from "@/components/alphabody/AssetImage";
import { BodySilhouette } from "@/components/alphabody/BodySilhouette";
import { useAuthStore } from "@/store/authStore";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/alpha-body")({
  head: () => ({
    meta: [
      { title: "AlphaBody · The Commons" },
      {
        name: "description",
        content:
          "Build a healthier, stronger and longer life with lifestyle medicine, movement and whole-person care.",
      },
    ],
  }),
  component: AlphaBodyPage,
});

const HERO_IMAGE = "/assets/images/Sunlit Outdoor Fitness Portrait.webp";
const BEATLIFT_IMAGE = "/assets/images/BeatLift_ Strength in Motion.webp";
const HID_IMAGE = "/assets/images/HID Health Gauge and Growth Chart.webp";
const CLINIC_IMAGE = "/assets/images/wellness-clinic.webp";
const RECORDS_IMAGE = "/assets/images/health-records.webp";
const PROFILE_IMAGE = "/assets/images/health-profile-body.webp";

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function ArrowButton({ tone = "lime" }: { tone?: "lime" | "dark" }) {
  return (
    <span
      aria-hidden="true"
      className={
        tone === "lime"
          ? "grid h-8 w-8 place-items-center rounded-full bg-accent text-accent-foreground shadow-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
          : "grid h-8 w-8 place-items-center rounded-full bg-white text-[#14140F] shadow-sm transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
      }
    >
      <ArrowUpRight className="h-4 w-4" strokeWidth={2.4} />
    </span>
  );
}

type FeatureRoute = "/beatlift" | "/health-assessment" | "/wellness-clinic" | "/health-records";

function FeatureCardShell({
  to,
  className,
  children,
  label,
}: {
  to: FeatureRoute;
  className?: string;
  children: ReactNode;
  label: string;
}) {
  return (
    <Link
      to={to}
      aria-label={label}
      className={`group relative flex min-h-[214px] flex-col overflow-hidden rounded-[22px] border border-black/[0.04] card-shadow transition duration-200 hover:-translate-y-0.5 ${className ?? ""}`}
    >
      {children}
    </Link>
  );
}

function BeatLiftCard() {
  return (
    <FeatureCardShell
      to="/beatlift"
      label="Open BeatLift — fitness, strength training and movement"
      className="justify-between bg-[#0B0F0B] p-4 text-white"
    >
      <AssetImage
        src={BEATLIFT_IMAGE}
        alt=""
        className="absolute inset-0 h-full w-full"
        imgClassName="h-full w-full object-cover object-[78%_center] opacity-90"
        fallback={
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_35%,#33452a,#0b0f0b_70%)]" />
        }
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/35 to-black/5" />
      <div className="relative z-10 max-w-[80%]">
        <p className="text-[9px] font-black uppercase tracking-[0.22em] text-accent">BeatLift</p>
        <h2 className="mt-1.5 font-display text-xl font-black leading-[1.05] tracking-tight text-white">
          BeatLift
        </h2>
        <p className="mt-2 text-[11px] leading-snug text-white/70">
          Fitness, strength training and movement.
        </p>
      </div>
      <div className="relative z-10 mt-auto flex justify-end">
        <ArrowButton />
      </div>
    </FeatureCardShell>
  );
}

function HidCard() {
  return (
    <FeatureCardShell
      to="/health-assessment"
      label="Open the HID Personal Health Assessment"
      className="bg-[#EAF5DF]"
    >
      <div className="relative h-[92px] overflow-hidden bg-[#EAF5DF] sm:h-[112px]">
        <AssetImage
          src={HID_IMAGE}
          alt=""
          className="h-full w-full"
          imgClassName="h-full w-full object-cover object-center"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[#EAF5DF]">
              <span className="grid h-12 w-12 place-items-center rounded-full border-[6px] border-[#7BC043] text-[#1F5B2E]">
                <HeartPulse className="h-5 w-5" />
              </span>
            </div>
          }
        />
      </div>
      <div className="relative flex flex-1 flex-col p-4">
        <p className="text-[8px] font-black uppercase tracking-[0.16em] text-[#4C8C2E]">
          HID / Lifespan Meter
        </p>
        <h2 className="mt-1 font-display text-[15px] font-black leading-[1.1] tracking-tight text-[#16321F]">
          Personal Health Assessment
        </h2>
        <p className="mt-1.5 text-[10.5px] leading-snug text-[#4A5A45]">
          Understand your current health, identify your risks and discover ways to improve your
          lifespan.
        </p>
        <div className="mt-auto flex justify-end pt-2">
          <ArrowButton />
        </div>
      </div>
    </FeatureCardShell>
  );
}

function WellnessClinicCard() {
  return (
    <FeatureCardShell
      to="/wellness-clinic"
      label="Open the Wellness Clinic"
      className="bg-[#E8F1F7]"
    >
      <div className="relative h-[92px] overflow-hidden bg-[#D8E8F2] sm:h-[112px]">
        <AssetImage
          src={CLINIC_IMAGE}
          alt="A clinician in a calm consultation setting"
          className="h-full w-full"
          imgClassName="h-full w-full object-cover object-center"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#ffffff,#d8e8f2_75%)]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/80 text-[#2F6B8F] shadow-sm">
                <Stethoscope className="h-6 w-6" />
              </span>
            </div>
          }
        />
      </div>
      <div className="relative flex flex-1 flex-col p-4">
        <h2 className="font-display text-[15px] font-black leading-[1.1] tracking-tight text-[#17384A]">
          Wellness Clinic
        </h2>
        <p className="mt-1.5 text-[10.5px] leading-snug text-[#4A6474]">
          Personal and group doctor visits, clinical consultations and follow-up.
        </p>
        <div className="mt-auto flex justify-end pt-2">
          <ArrowButton />
        </div>
      </div>
    </FeatureCardShell>
  );
}

function HealthRecordsCard() {
  return (
    <FeatureCardShell
      to="/health-records"
      label="Open your Health Records"
      className="bg-[#EDEAF8]"
    >
      <div className="relative h-[92px] overflow-hidden bg-[#E1DDF5] sm:h-[112px]">
        <AssetImage
          src={RECORDS_IMAGE}
          alt="A medical records folder illustration"
          className="h-full w-full"
          imgClassName="h-full w-full object-cover object-center"
          fallback={
            <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_50%_20%,#ffffff,#e1ddf5_75%)]">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-[#5B4FE0] text-white shadow-sm">
                <FileText className="h-6 w-6" />
              </span>
            </div>
          }
        />
      </div>
      <div className="relative flex flex-1 flex-col p-4">
        <h2 className="font-display text-[15px] font-black leading-[1.1] tracking-tight text-[#2D255C]">
          Health Records
        </h2>
        <p className="mt-1.5 text-[10.5px] leading-snug text-[#5B5478]">
          Upload and organise medical reports, lab results, prescriptions and other medical
          documents securely.
        </p>
        <div className="mt-auto flex justify-end pt-2">
          <ArrowButton />
        </div>
      </div>
    </FeatureCardShell>
  );
}

function HealthProfileCard() {
  return (
    <Link
      to="/health-profile"
      aria-label="Open your Health Profile"
      className="group relative flex min-h-[132px] items-center gap-3 overflow-hidden rounded-[22px] border border-[#E9B7AD]/40 bg-[#FBEDE9] p-4 card-shadow transition duration-200 hover:-translate-y-0.5 sm:min-h-[150px] sm:p-6"
    >
      <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-[#E86A5A]/15 text-[#C94B3B] sm:h-12 sm:w-12">
        <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6" />
      </span>
      <div className="relative z-10 max-w-[62%] sm:max-w-[58%]">
        <h2 className="font-display text-lg font-black tracking-tight text-[#4A1F18] sm:text-xl">
          Health Profile
        </h2>
        <p className="mt-1 text-[10.5px] leading-snug text-[#7A4A42] sm:text-xs">
          Your personal health details, vital signs, height, weight, allergies, diagnoses and health
          goals.
        </p>
      </div>
      <div className="pointer-events-none absolute bottom-0 right-3 top-0 flex w-[30%] items-end justify-center opacity-90 sm:right-6 sm:w-[26%]">
        <AssetImage
          src={PROFILE_IMAGE}
          alt=""
          className="h-full w-full"
          imgClassName="h-full w-full object-contain object-bottom"
          fallback={<BodySilhouette className="h-full w-full" />}
        />
      </div>
      <div className="relative z-10 ml-auto self-end pb-1">
        <ArrowButton />
      </div>
    </Link>
  );
}

interface TodayCode {
  id: string | null;
  title: string | null;
  passage: string | null;
  scheduled_date: string | null;
  is_published: boolean;
}

function TodaysCodeCard() {
  const { member } = useAuthStore();
  const [saved, setSaved] = useState(false);
  const { data: code, isLoading } = useQuery<TodayCode>({
    queryKey: ["code/today"],
    queryFn: () => apiFetch<TodayCode>("/v1/code/today"),
    staleTime: 60_000,
  });

  const passage = code?.passage ?? "";
  const title = code?.title ?? "Today's Code";
  const isPublished = Boolean(code?.is_published && passage);
  const byline = code?.scheduled_date
    ? `The Code • ${new Date(`${code.scheduled_date}T00:00:00`).toLocaleDateString("en-US", {
        month: "long",
        day: "numeric",
      })}`
    : "The Code";

  const handleSave = async () => {
    if (!code?.id || saved) return;
    if (!member) {
      window.location.href = "/login";
      return;
    }
    try {
      await apiFetch(`/v1/code/${code.id}/save`, { method: "POST" });
      setSaved(true);
      toast.success("Saved to your collection");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save");
    }
  };

  const handleShare = async () => {
    if (!passage) return;
    const url = `${window.location.origin}/code`;
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title, text: passage, url });
        return;
      } catch {
        // Dismissed — fall back to copying.
      }
    }
    try {
      await navigator.clipboard.writeText(`${passage}\n\n${url}`);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Could not share");
    }
  };

  return (
    <section className="rounded-[22px] border border-divider bg-[#F7F5EE] p-5 sm:p-6">
      <div className="flex items-center gap-2.5">
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#1F7A4D] text-white">
          <Quote className="h-4 w-4" />
        </span>
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1F7A4D]">
          Today&apos;s Code
        </span>
      </div>

      {isLoading ? (
        <div className="mt-4 space-y-2">
          <div className="h-4 w-11/12 animate-pulse rounded-full bg-subtle" />
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-subtle" />
        </div>
      ) : isPublished ? (
        <>
          <p className="mt-4 font-display text-lg font-bold leading-snug text-text-primary sm:text-xl">
            <span className="mr-1 text-[#1F7A4D]">“</span>
            {passage}
            <span className="text-[#1F7A4D]">”</span>
          </p>
          <p className="mt-3 text-[11px] text-text-secondary">{byline}</p>
        </>
      ) : (
        <p className="mt-4 text-sm text-text-secondary">
          No Code has been published for today yet. Check back soon.
        </p>
      )}

      <div className="mt-5 flex flex-wrap gap-2">
        <Link
          to="/code"
          className="inline-flex items-center gap-1.5 rounded-full btn-accent px-4 py-2 text-sm font-bold"
        >
          Read more <ArrowRight className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={handleSave}
          disabled={!isPublished || saved}
          className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
        >
          <BookMarked className="h-4 w-4" /> {saved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={!isPublished}
          className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-white px-4 py-2 text-sm font-semibold text-text-primary disabled:opacity-50"
        >
          <Share2 className="h-4 w-4" /> Share
        </button>
      </div>
    </section>
  );
}

function AlphaBodyPage() {
  const { member } = useAuthStore();
  const displayName = member?.display_name?.trim() || "there";
  const firstName = displayName.split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-[960px] space-y-4 pb-6 sm:space-y-5">
      <ProductSwitcher showLabel={false} className="w-full" />

      <section className="relative overflow-hidden rounded-[26px] bg-[#EDEDE4] p-4 sm:p-7">
        <div className="grid grid-cols-[1.05fr_0.95fr] items-center gap-3 sm:gap-8">
          <div className="relative z-10 min-w-0">
            <p className="text-[9px] font-black uppercase tracking-[0.22em] text-[#4C8C2E] sm:text-[10px]">
              AlphaBody
            </p>
            <h1 className="mt-1.5 font-display text-[23px] font-black leading-[1.02] tracking-tight text-text-primary sm:text-[34px]">
              {greeting()},<br className="sm:hidden" /> {firstName}
            </h1>
            <p className="mt-2.5 max-w-md text-[11px] leading-relaxed text-text-secondary sm:text-sm">
              Build a healthier, stronger and longer life with lifestyle medicine.
            </p>
          </div>
          <div className="relative h-[168px] overflow-hidden rounded-[20px] sm:h-[250px] sm:rounded-[24px]">
            <AssetImage
              src={HERO_IMAGE}
              alt="An athletic woman outdoors in soft natural greenery"
              loading="eager"
              className="h-full w-full"
              imgClassName="h-full w-full object-cover object-[64%_center]"
              fallback={
                <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_70%_30%,#BFD8A8,#4E7B3A_70%)]">
                  <HeartPulse className="h-12 w-12 text-white/80" />
                </div>
              }
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#EDEDE4] via-[#EDEDE4]/20 to-transparent" />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <BeatLiftCard />
        <HidCard />
        <WellnessClinicCard />
        <HealthRecordsCard />
      </div>

      <HealthProfileCard />

      <TodaysCodeCard />
    </div>
  );
}
