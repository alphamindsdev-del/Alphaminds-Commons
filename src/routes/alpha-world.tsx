import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Globe } from "lucide-react";
import { ProductSwitcher } from "@/components/layout/ProductSwitcher";

export const Route = createFileRoute("/alpha-world")({
  head: () => ({
    meta: [
      { title: "AlphaWorld · The Commons" },
      { name: "description", content: "AlphaWorld is taking shape." },
    ],
  }),
  component: AlphaWorldPage,
});

function AlphaWorldPage() {
  return (
    <div className="mx-auto max-w-[720px] space-y-8 pb-6">
      <ProductSwitcher showLabel={false} className="max-w-md" />
      <section className="rounded-3xl border-2 border-[#5B4FE0] bg-[#EEECFD] p-8 text-center">
        <span className="mx-auto grid h-16 w-16 place-items-center rounded-3xl bg-[#5B4FE0] text-white">
          <Globe className="h-8 w-8" />
        </span>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.2em] text-[#5B4FE0]">
          AlphaWorld
        </p>
        <h1 className="mt-2 font-display text-3xl font-black tracking-tight text-text-primary">
          A wider world is taking shape.
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-text-secondary">
          Shared spaces, real-world chapters and collective adventures are being prepared. Until
          then, AlphaBody and AlphaMind are open.
        </p>
        <Link
          to="/products"
          className="mt-6 inline-flex items-center gap-2 rounded-full bg-[#5B4FE0] px-5 py-2.5 text-sm font-bold text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Choose another world
        </Link>
      </section>
    </div>
  );
}
