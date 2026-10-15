import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Brain, HeartPulse, Globe, ArrowRight, X, Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useAuthStore } from "@/store/authStore";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Choose your product · The Commons" },
      { name: "description", content: "Choose where you want to go inside The Commons." },
    ],
  }),
  component: ProductsPage,
});

type ComingSoon = "Alpha Body" | "Alpha World" | null;

function ProductsPage() {
  const { isAuthenticated, isLoading, member, clearSession } = useAuthStore();
  const navigate = useNavigate();
  const [comingSoon, setComingSoon] = useState<ComingSoon>(null);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background flex items-center justify-center">
        <div className="h-8 w-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const products = [
    {
      name: "Alpha Minds",
      tagline: "Your community for human flourishing.",
      description:
        "Houses, chapters, daily practice, events, challenges, the library, and the REL-Fi game.",
      icon: Brain,
      available: true,
      accent: "from-accent/25 via-accent/5 to-transparent",
      iconColor: "text-accent-foreground bg-accent",
      action: () => navigate({ to: "/" }),
    },
    {
      name: "Alpha Body",
      tagline: "Physical practice, vitality, and embodied wellbeing.",
      description: "Alpha Body is being crafted and will open its doors soon.",
      icon: HeartPulse,
      available: false,
      accent: "from-accent-dark-green/30 via-accent-dark-green/5 to-transparent",
      iconColor: "text-white bg-accent-dark-green",
      action: () => setComingSoon("Alpha Body"),
    },
    {
      name: "Alpha World",
      tagline: "Shared spaces, exploration, and collective play.",
      description: "Alpha World is on the horizon and will arrive soon.",
      icon: Globe,
      available: false,
      accent: "from-primary/20 via-primary/5 to-transparent",
      iconColor: "text-primary-foreground bg-primary",
      action: () => setComingSoon("Alpha World"),
    },
  ];

  return (
    <div className="min-h-dvh bg-background flex flex-col">
      <header className="flex items-center justify-between px-6 py-5 border-b border-border">
        <Logo size="md" />
        <button
          onClick={() => {
            clearSession();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-secondary hover:text-text-primary hover:border-text-primary transition-colors"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex-1 flex items-center px-6 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <p className="text-[11px] font-black uppercase tracking-[0.3em] text-text-eyebrow-green">
              The Commons
            </p>
            <h1 className="mt-3 font-display text-3xl sm:text-5xl font-black tracking-tight text-text-primary">
              Where do you want to go?
            </h1>
            <p className="mt-3 text-sm sm:text-base text-text-secondary">
              Welcome back{member?.display_name ? `, ${member.display_name}` : ""}. Choose a product
              to continue.
            </p>
          </motion.div>

          <div className="mt-10 sm:mt-14 grid gap-4 md:grid-cols-3">
            {products.map((p, i) => (
              <motion.button
                key={p.name}
                onClick={p.action}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.1, duration: 0.5 }}
                className={`group relative overflow-hidden rounded-3xl border-2 bg-card p-6 text-left transition-all ${
                  p.available
                    ? "border-accent hover:border-accent hover:-translate-y-1 card-shadow"
                    : "border-border hover:border-text-secondary/40"
                }`}
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${p.accent}`}
                  aria-hidden="true"
                />
                <div className="relative">
                  <div className="flex items-start justify-between gap-3">
                    <span
                      className={`grid h-12 w-12 place-items-center rounded-2xl ${p.iconColor}`}
                    >
                      <p.icon className="h-6 w-6" />
                    </span>
                    {!p.available && (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-subtle px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-text-secondary">
                        <Clock className="h-3 w-3" />
                        Coming soon
                      </span>
                    )}
                    {p.available && (
                      <span className="inline-flex items-center rounded-full bg-accent px-2.5 py-1 text-[10px] font-black uppercase tracking-widest text-accent-foreground">
                        Open
                      </span>
                    )}
                  </div>
                  <h2 className="mt-5 font-display text-2xl font-bold text-text-primary">
                    {p.name}
                  </h2>
                  <p className="mt-1 text-sm font-semibold text-text-primary/80">{p.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {p.description}
                  </p>
                  <span
                    className={`mt-6 inline-flex items-center gap-2 text-sm font-bold ${
                      p.available
                        ? "text-text-primary group-hover:text-accent-foreground"
                        : "text-text-secondary"
                    }`}
                  >
                    {p.available ? "Enter" : "Learn more"}
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </span>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </main>

      <AnimatePresence>
        {comingSoon && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-6"
            onClick={() => setComingSoon(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${comingSoon} coming soon`}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 8 }}
              transition={{ duration: 0.25 }}
              className="relative w-full max-w-sm rounded-3xl border border-border bg-card p-7 text-center card-shadow"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setComingSoon(null)}
                className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full hover:bg-subtle text-text-secondary"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-subtle">
                <Clock className="h-7 w-7 text-text-secondary" />
              </span>
              <h2 className="mt-4 font-display text-2xl font-bold text-text-primary">
                {comingSoon}
              </h2>
              <p className="mt-2 text-sm text-text-secondary">
                is coming soon. We&apos;re building it with the same care as Alpha Minds — check
                back soon.
              </p>
              <button
                onClick={() => setComingSoon(null)}
                className="mt-6 w-full btn-primary rounded-xl py-3 text-sm font-black uppercase tracking-wider"
              >
                Back to products
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
