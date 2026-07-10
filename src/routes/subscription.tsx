import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useSubscription } from "@/hooks/useSubscription";
import { Check, Sparkles } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/subscription")({
  head: () => ({ meta: [{ title: "Upgrade · AlphaMinds" }] }),
  component: SubscriptionPage,
});

function SubscriptionPage() {
  const { data: subscription } = useSubscription();
  const [billing, setBilling] = useState<"monthly" | "annual">("annual");
  const userTier = (subscription as any)?.tier ?? "free";
  const tiers = [
    { id: "free", name: "Free", monthly: 0, annual: 0, features: ["Daily content & check-in", "Join up to 3 rooms", "Community events (limited)", "Basic progress tracking"], cta: "Current Plan" },
    { id: "basic", name: "Basic", monthly: 9, annual: 86, features: ["Everything in Free", "Unlimited room access", "Full events calendar", "Community leaderboard", "Weekly progress summary"], cta: "Subscribe" },
    { id: "premium", name: "Premium", monthly: 19, annual: 182, features: ["Everything in Basic", "Priority event RSVP", "Personal growth insights", "Monthly 1:1 with guide", "Exclusive content archive", "Ad-free experience"], cta: "Go Premium" },
  ];
  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <header className="text-center">
        <h1 className="font-black text-3xl sm:text-4xl">Upgrade Your AlphaMinds Experience</h1>
        <p className="text-text-secondary mt-2">Choose the plan that fits your journey.</p>
        <div className="mt-6 inline-flex items-center gap-1 rounded-full bg-card border border-border p-1">
          <button onClick={() => setBilling("monthly")} className={cn("px-4 py-2 text-sm font-bold rounded-full", billing === "monthly" && "bg-primary text-white")}>Monthly</button>
          <button onClick={() => setBilling("annual")} className={cn("px-4 py-2 text-sm font-bold rounded-full inline-flex items-center gap-1", billing === "annual" && "bg-primary text-white")}>
            Annual <span className="text-[10px] font-black bg-accent text-primary px-1.5 py-0.5 rounded-full">SAVE 20%</span>
          </button>
        </div>
      </header>

      <div className="grid lg:grid-cols-3 gap-5">
        {tiers.map((t) => {
          const price = billing === "annual" ? Math.round(t.annual / 12) : t.monthly;
          const isPremium = t.id === "premium";
          const isBasic = t.id === "basic";
          return (
            <div key={t.id} className={cn(
              "relative rounded-3xl p-7 border flex flex-col",
              isPremium ? "border-transparent text-white" : "border-border bg-card",
            )}
              style={isPremium ? { background: "linear-gradient(160deg, #28555e 0%, #1e3f47 60%, #0F1923 100%)" } : undefined}
            >
              {isBasic && <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-accent text-primary px-3 py-1 text-xs font-black uppercase tracking-widest">Most Popular</span>}
              <h3 className="font-black text-2xl">{t.name}</h3>
              <p className="mt-3 flex items-baseline gap-1">
                <span className="font-black text-4xl">${price}</span>
                <span className={cn("text-sm font-semibold", isPremium ? "text-white/70" : "text-text-secondary")}>/month</span>
              </p>
              {billing === "annual" && t.id !== "free" && <p className={cn("text-xs mt-1", isPremium ? "text-white/60" : "text-text-secondary")}>billed ${t.annual}/yr</p>}
              <ul className="mt-6 space-y-3 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm">
                    <Check className={cn("h-4 w-4 mt-0.5 shrink-0", isPremium ? "text-accent" : "text-primary")} />
                    <span className={cn(isPremium ? "text-white/90" : "text-text-primary")}>{f}</span>
                  </li>
                ))}
              </ul>
              <button
                disabled={userTier === t.id}
                className={cn(
                  "mt-7 w-full rounded-xl py-3 font-bold transition-transform active:scale-[0.98]",
                  userTier === t.id && "border border-border text-text-secondary",
                  isBasic && "bg-primary text-white",
                  isPremium && "bg-white text-primary-dark",
                )}
              >
                {t.id === "premium" && <Sparkles className="inline h-4 w-4 mr-1" />}
                {userTier === t.id ? "Current Plan" : t.cta}
              </button>
            </div>
          );
        })}
      </div>

      <section className="max-w-2xl mx-auto">
        <h2 className="font-bold text-xl text-center mb-4">Frequently Asked</h2>
        <Accordion type="single" collapsible className="rounded-2xl border border-border bg-card card-shadow">
          <AccordionItem value="1" className="px-5"><AccordionTrigger>Can I cancel any time?</AccordionTrigger><AccordionContent>Yes — your access continues until the end of your billing period, and we don't charge cancellation fees.</AccordionContent></AccordionItem>
          <AccordionItem value="2" className="px-5"><AccordionTrigger>Will my price stay the same?</AccordionTrigger><AccordionContent>Premium subscribers are grandfathered into today's pricing for as long as their subscription stays active.</AccordionContent></AccordionItem>
          <AccordionItem value="3" className="px-5"><AccordionTrigger>What payment methods do you accept?</AccordionTrigger><AccordionContent>Major credit cards, Apple Pay, Google Pay, and bank transfer (for annual plans in select countries).</AccordionContent></AccordionItem>
        </Accordion>
      </section>
    </div>
  );
}
