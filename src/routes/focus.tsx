import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useAuthStore } from "@/store/authStore";
import { PRODUCTS, type ProductDefinition } from "@/lib/products";

export const Route = createFileRoute("/focus")({
  head: () => ({
    meta: [
      { title: "Choose your focus · The Commons" },
      {
        name: "description",
        content: "Choose your focus inside The Commons: AlphaBody, AlphaMind or AlphaWorld.",
      },
    ],
  }),
  component: FocusPage,
});

function objectPosition(product: ProductDefinition) {
  if (product.id === "body") return "68% 50%";
  if (product.id === "mind") return "72% 50%";
  return "50% 50%";
}

function FocusStatus({
  product,
  onImage = false,
}: {
  product: ProductDefinition;
  onImage?: boolean;
}) {
  if (!product.available) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-white backdrop-blur-sm lg:px-2.5 lg:py-1 lg:text-[9px]">
        <Clock className="h-2.5 w-2.5 lg:h-3 lg:w-3" />
        Soon
      </span>
    );
  }
  const label = product.id === "world" ? "Preview" : "Open";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[8px] font-black uppercase tracking-widest lg:px-2.5 lg:py-1 lg:text-[9px] ${
        onImage ? "bg-white/90 backdrop-blur-sm" : "text-white"
      }`}
      style={onImage ? { color: product.color } : { backgroundColor: product.color }}
    >
      {label}
    </span>
  );
}

function MobileFocusCard({
  product,
  onOpen,
  className,
  rotate,
  contentClassName = "p-3",
}: {
  product: ProductDefinition;
  onOpen: () => void;
  className: string;
  rotate: string;
  contentClassName?: string;
}) {
  const Icon = product.icon;
  return (
    <button
      type="button"
      onClick={onOpen}
      disabled={!product.available}
      aria-label={
        product.available ? `Enter ${product.name}` : `${product.name} is coming soon`
      }
      className={`absolute touch-manipulation overflow-hidden rounded-[24px] border-2 text-left shadow-[0_18px_45px_-22px_rgba(0,0,0,0.65)] transition active:scale-[0.98] disabled:cursor-not-allowed ${className} ${rotate}`}
      style={{ borderColor: product.color }}
    >
      <img
        src={product.image}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
        style={{ objectPosition: objectPosition(product) }}
        loading="eager"
      />
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/5"
        aria-hidden="true"
      />
      <div className={`relative flex h-full flex-col justify-between text-white ${contentClassName}`}>
        <div className="flex items-start justify-between gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </span>
          <FocusStatus product={product} onImage />
        </div>
        <div>
          <p className="font-display text-[20px] font-black leading-none tracking-tight">
            {product.shortName}
          </p>
          <p className="mt-1 text-[10px] font-semibold leading-snug text-white/80">
            {product.tagline}
          </p>
          <span className="mt-2.5 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white">
            {product.available ? "Enter" : "Coming soon"}
            {product.available && <ArrowRight className="h-3 w-3" />}
          </span>
        </div>
      </div>
    </button>
  );
}

function FocusPage() {
  const { isAuthenticated, isLoading, member, clearSession } = useAuthStore();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const openFocus = (product: ProductDefinition) => {
    if (!product.available) return;
    navigate({ to: product.route });
  };

  const body = PRODUCTS[0]!;
  const mind = PRODUCTS[1]!;
  const world = PRODUCTS[2]!;

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-2.5 sm:px-6 sm:py-4 lg:py-5">
        <Logo size="sm" />
        <button
          onClick={() => {
            clearSession();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-2.5 py-2 text-xs font-semibold text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary sm:px-3 sm:text-sm"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center px-4 py-3 sm:px-6 sm:py-8 lg:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.28em] text-text-eyebrow-green sm:text-[10px] lg:text-[11px]">
              The Commons
            </p>
            <h1 className="mt-1.5 font-display text-[28px] font-black leading-[1.02] tracking-tight text-text-primary sm:mt-2 sm:text-4xl lg:mt-3 lg:text-5xl">
              Where will you <span className="text-text-eyebrow-green">focus</span>?
            </h1>
            <p className="mx-auto mt-1.5 max-w-md text-[11px] leading-snug text-text-secondary sm:mt-2 sm:text-sm lg:mt-3 lg:text-base">
              Three focus areas. One community.
              {member?.display_name ? ` Welcome back, ${member.display_name.split(" ")[0]}.` : ""}{" "}
              Choose where to begin.
            </p>
          </motion.div>

          {/* Small mobile: intentional layered composition, no-scroll by default */}
          <div className="relative mx-auto mt-2 h-[300px] w-full max-w-[360px] sm:hidden">
            <MobileFocusCard
              product={body}
              onOpen={() => openFocus(body)}
              className="left-0 top-0 z-10 h-[145px] w-[52%]"
              rotate="-rotate-6"
              contentClassName="p-3 pr-8"
            />
            <MobileFocusCard
              product={world}
              onOpen={() => openFocus(world)}
              className="bottom-0 left-0 z-20 h-[145px] w-[52%]"
              rotate="rotate-3"
              contentClassName="p-3 pr-8"
            />
            <MobileFocusCard
              product={mind}
              onOpen={() => openFocus(mind)}
              className="right-0 top-[45px] z-30 h-[190px] w-[52%]"
              rotate="rotate-2"
            />
          </div>

          <div className="mx-auto mt-1 max-w-[340px] text-center sm:hidden">
            <p className="text-[11px] font-semibold leading-relaxed text-text-secondary">
              You can switch spaces anytime.
            </p>
          </div>

          {/* Tablet and desktop: all three focus cards visible together */}
          <div className="mt-6 hidden gap-2.5 sm:grid sm:grid-cols-3 md:gap-3 lg:mt-14 lg:gap-4">
            {PRODUCTS.map((product, index) => {
              const Icon = product.icon;
              return (
                <motion.button
                  key={product.id}
                  type="button"
                  onClick={() => openFocus(product)}
                  disabled={!product.available}
                  aria-label={
                    product.available
                      ? `Enter ${product.name}`
                      : `${product.name} is coming soon`
                  }
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.08, duration: 0.45 }}
                  className={`group relative h-[300px] overflow-hidden rounded-2xl border-2 text-left shadow-[0_22px_60px_-30px_rgba(0,0,0,0.5)] transition-all md:h-[320px] lg:h-[380px] lg:rounded-3xl ${
                    product.available
                      ? "hover:-translate-y-1"
                      : "cursor-not-allowed opacity-85"
                  }`}
                  style={{ borderColor: product.color }}
                >
                  <img
                    src={product.image}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    style={{ objectPosition: objectPosition(product) }}
                    loading="eager"
                  />
                  <div
                    className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10"
                    aria-hidden="true"
                  />
                  <div className="relative flex h-full flex-col justify-between p-4 text-white lg:p-6">
                    <div className="flex items-start justify-between gap-2 lg:gap-3">
                      <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur-sm lg:h-12 lg:w-12 lg:rounded-2xl">
                        <Icon className="h-4 w-4 lg:h-6 lg:w-6" />
                      </span>
                      <FocusStatus product={product} onImage />
                    </div>
                    <div>
                      <h2 className="font-display text-xl font-black tracking-tight md:text-2xl lg:text-3xl">
                        {product.shortName}
                      </h2>
                      <p className="mt-0.5 text-[11px] font-semibold text-white/90 lg:mt-1 lg:text-sm">
                        {product.tagline}
                      </p>
                      <p className="mt-2 text-[11px] leading-relaxed text-white/70 lg:mt-3 lg:text-sm">
                        {product.description}
                      </p>
                      <span className="mt-3 inline-flex items-center gap-2 text-xs font-bold text-white lg:mt-6 lg:text-sm">
                        {product.available ? "Enter" : "Coming soon"}
                        {product.available && (
                          <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1 lg:h-4 lg:w-4" />
                        )}
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
