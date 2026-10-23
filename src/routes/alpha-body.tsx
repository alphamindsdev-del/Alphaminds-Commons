import { createFileRoute, Link } from "@tanstack/react-router";
import { Activity, Apple, ArrowRight, HeartPulse, Moon, Sparkles } from "lucide-react";
import { PageHeader, SectionHeading } from "@/components/common/PageHeader";
import { ProductSwitcher } from "@/components/layout/ProductSwitcher";

export const Route = createFileRoute("/alpha-body")({
  head: () => ({
    meta: [
      { title: "AlphaBody · The Commons" },
      {
        name: "description",
        content: "Movement, vitality and embodied wellbeing — with the Wellness Clinic at its heart.",
      },
    ],
  }),
  component: AlphaBodyPage,
});

const pillars = [
  {
    icon: Activity,
    title: "Move",
    copy: "Find a rhythm of movement that fits your life — strength, mobility, breath and play, built to last.",
  },
  {
    icon: Moon,
    title: "Restore",
    copy: "Sleep, stillness and recovery are part of the work. Learn how to downshift and come back to yourself.",
  },
  {
    icon: Apple,
    title: "Nourish",
    copy: "Simple, grounded guidance for feeding your body well without noise, guilt or fad diets.",
  },
] as const;

function AlphaBodyPage() {
  return (
    <div className="mx-auto max-w-[900px] space-y-8 pb-6">
      <ProductSwitcher showLabel={false} className="max-w-md" />

      <PageHeader
        eyebrow="AlphaBody"
        title="Your body is part of the journey."
        subtitle="Movement, vitality and embodied wellbeing — with the Wellness Clinic at its heart."
      />

      <section className="relative overflow-hidden rounded-3xl border-2 border-[#1F7A4D] bg-[#E7F5EC] p-6 sm:p-8">
        <div
          className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[#1F7A4D]/10 blur-3xl"
          aria-hidden="true"
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#1F7A4D] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white">
              <HeartPulse className="h-3.5 w-3.5" />
              Now open
            </span>
            <h2 className="mt-4 font-display text-2xl font-black tracking-tight text-text-primary sm:text-3xl">
              Care for the body that carries your purpose.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:text-base">
              AlphaBody brings physical practice and whole-person care into The Commons. Start with
              the Wellness Clinic, then build a rhythm you can return to every day.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <a
                href="#wellness-clinic"
                className="inline-flex items-center gap-1.5 rounded-full bg-[#1F7A4D] px-4 py-2.5 text-sm font-bold text-white"
              >
                Explore the Wellness Clinic <ArrowRight className="h-4 w-4" />
              </a>
              <Link
                to="/journey"
                className="inline-flex items-center gap-1.5 rounded-full border border-[#1F7A4D]/30 bg-white/70 px-4 py-2.5 text-sm font-bold text-text-primary"
              >
                Continue your journey
              </Link>
            </div>
          </div>
          <div className="hidden h-36 w-36 shrink-0 place-items-center rounded-[32px] bg-[#1F7A4D] text-white sm:grid">
            <HeartPulse className="h-16 w-16" strokeWidth={1.4} />
          </div>
        </div>
      </section>

      <section
        id="wellness-clinic"
        className="scroll-mt-24 rounded-3xl border border-divider bg-card p-6 sm:p-8"
      >
        <div className="flex items-start gap-3">
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#1F7A4D] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#1F7A4D]">
              AlphaBody
            </p>
            <h2 className="font-display text-2xl font-black tracking-tight text-text-primary">
              The Wellness Clinic
            </h2>
          </div>
        </div>
        <p className="mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
          A calm, practical space to check in with yourself. The clinic is built around three
          everyday pillars — move, restore and nourish — so care becomes a rhythm, not a reset.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {pillars.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.title}
                className="rounded-2xl border border-divider bg-bg-card-white/70 p-4"
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-[#E7F5EC] text-[#1F7A4D]">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-3 font-display text-lg font-bold text-text-primary">
                  {pillar.title}
                </h3>
                <p className="mt-1.5 text-xs leading-relaxed text-text-secondary">{pillar.copy}</p>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex flex-wrap gap-2 border-t border-divider pt-5">
          <Link
            to="/plans"
            className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-bg-card-white px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Explore plans <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            to="/events"
            className="inline-flex items-center gap-1.5 rounded-full border border-divider bg-bg-card-white px-4 py-2 text-sm font-semibold text-text-primary"
          >
            Find a wellness event <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>

      <section className="rounded-3xl border border-divider bg-card p-6 sm:p-8">
        <SectionHeading
          kicker="A daily practice"
          title="Small, repeatable care."
          className="mb-0"
        />
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-text-secondary">
          You do not need a perfect routine. Five minutes of movement, ten minutes of stillness and
          one nourishing meal is a real beginning. AlphaBody helps you keep showing up.
        </p>
      </section>
    </div>
  );
}
