import { createFileRoute, Navigate, useNavigate } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { ArrowRight, Clock, LogOut } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { useAuthStore } from "@/store/authStore";
import { PRODUCTS, type ProductDefinition } from "@/lib/products";

export const Route = createFileRoute("/products")({
  head: () => ({
    meta: [
      { title: "Choose your world · The Commons" },
      { name: "description", content: "Choose where you want to go inside The Commons." },
    ],
  }),
  component: ProductsPage,
});

function objectPosition(product: ProductDefinition) {
  if (product.id === "body") return "68% 50%";
  if (product.id === "mind") return "72% 50%";
  return "50% 50%";
}

function ProductStatus({
  product,
  onImage = false,
}: {
  product: ProductDefinition;
  onImage?: boolean;
}) {
  if (!product.available) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[9px] font-black uppercase tracking-widest text-white backdrop-blur-sm">
        <Clock className="h-3 w-3" />
        Soon
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-widest ${
        onImage ? "bg-white/90 backdrop-blur-sm" : "text-white"
      }`}
      style={onImage ? { color: product.color } : { backgroundColor: product.color }}
    >
      Open
    </span>
  );
}

function MobileProductCard({
  product,
  onOpen,
  className,
  rotate,
}: {
  product: ProductDefinition;
  onOpen: () => void;
  className: string;
  rotate: string;
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
      className={`absolute overflow-hidden rounded-[26px] border-2 text-left shadow-[0_18px_45px_-22px_rgba(0,0,0,0.65)] transition active:scale-[0.98] disabled:cursor-not-allowed ${className} ${rotate}`}
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
      <div className="relative flex h-full flex-col justify-between p-4 text-white">
        <div className="flex items-start justify-between gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 backdrop-blur-sm">
            <Icon className="h-4 w-4" />
          </span>
          <ProductStatus product={product} onImage />
        </div>
        <div>
          <p className="font-display text-[21px] font-black leading-none tracking-tight">
            {product.shortName}
          </p>
          <p className="mt-1.5 text-[10px] font-semibold leading-snug text-white/80">
            {product.tagline}
          </p>
          <span className="mt-3 inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-white">
            {product.available ? "Enter" : "Coming soon"}
            {product.available && <ArrowRight className="h-3 w-3" />}
          </span>
        </div>
      </div>
    </button>
  );
}

function ProductsPage() {
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

  const openProduct = (product: ProductDefinition) => {
    if (!product.available) return;
    navigate({ to: product.route });
  };

  const body = PRODUCTS[0]!;
  const mind = PRODUCTS[1]!;
  const world = PRODUCTS[2]!;

  return (
    <div className="flex min-h-dvh flex-col overflow-hidden bg-background sm:overflow-visible">
      <header className="flex shrink-0 items-center justify-between border-b border-border px-4 py-3 sm:px-6 sm:py-5">
        <Logo size="sm" />
        <button
          onClick={() => {
            clearSession();
            navigate({ to: "/" });
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-border px-3 py-2 text-sm font-semibold text-text-secondary transition-colors hover:border-text-primary hover:text-text-primary"
          title="Log out"
        >
          <LogOut className="h-4 w-4" />
          <span className="hidden sm:inline">Log out</span>
        </button>
      </header>

      <main className="flex flex-1 flex-col justify-center px-4 py-4 sm:px-6 sm:py-16">
        <div className="mx-auto w-full max-w-5xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="text-center"
          >
            <p className="text-[10px] font-black uppercase tracking-[0.3em] text-text-eyebrow-green sm:text-[11px]">
              The Commons
            </p>
            <h1 className="mt-2 font-display text-[30px] font-black leading-[1.05] tracking-tight text-text-primary sm:mt-3 sm:text-5xl">
              Choose your world.
            </h1>
            <p className="mx-auto mt-2 max-w-md text-[12px] leading-relaxed text-text-secondary sm:mt-3 sm:text-base">
              Three worlds. One community.
              {member?.display_name ? ` Welcome back, ${member.display_name.split(" ")[0]}.` : ""}{" "}
              Where will you begin?
            </p>
          </motion.div>

          {/* Mobile: overlapping, scroll-free product stage */}
          <div className="relative mx-auto mt-3 h-[320px] w-full max-w-[360px] sm:hidden">
            <MobileProductCard
              product={body}
              onOpen={() => openProduct(body)}
              className="left-0 top-7 z-10 h-[190px] w-[58%]"
              rotate="-rotate-6"
            />
            <MobileProductCard
              product={world}
              onOpen={() => openProduct(world)}
              className="bottom-0 left-[7%] z-20 h-[180px] w-[57%]"
              rotate="rotate-3"
            />
            <MobileProductCard
              product={mind}
              onOpen={() => openProduct(mind)}
              className="right-0 top-16 z-30 h-[210px] w-[60%]"
              rotate="rotate-2"
            />
          </div>

          <div className="mx-auto mt-1 max-w-[340px] text-center sm:hidden">
            <p className="text-[11px] font-semibold leading-relaxed text-text-secondary">
              Tap a world to switch. Your journey, profile and community follow you across all
              three.
            </p>
          </div>

          {/* Desktop: clean three-column product grid */}
          <div className="mt-14 hidden gap-4 sm:grid md:grid-cols-3">
            {PRODUCTS.map((product, index) => {
              const Icon = product.icon;
              return (
                <motion.button
                  key={product.id}
                  type="button"
                  onClick={() => openProduct(product)}
                  disabled={!product.available}
                  initial={{ opacity: 0, y: 18 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.08 + index * 0.08, duration: 0.45 }}
                  className={`group relative h-[380px] overflow-hidden rounded-3xl border-2 text-left shadow-[0_22px_60px_-30px_rgba(0,0,0,0.5)] transition-all ${
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
                  <div className="relative flex h-full flex-col justify-between p-6 text-white">
                    <div className="flex items-start justify-between gap-3">
                      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/20 backdrop-blur-sm">
                        <Icon className="h-6 w-6" />
                      </span>
                      <ProductStatus product={product} onImage />
                    </div>
                    <div>
                      <h2 className="font-display text-3xl font-black tracking-tight">
                        {product.shortName}
                      </h2>
                      <p className="mt-1 text-sm font-semibold text-white/90">
                        {product.tagline}
                      </p>
                      <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
                        {product.description}
                      </p>
                      <span className="mt-6 inline-flex items-center gap-2 text-sm font-bold text-white">
                        {product.available ? "Enter" : "Coming soon"}
                        {product.available && (
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
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
