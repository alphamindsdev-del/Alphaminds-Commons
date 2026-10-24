import { useNavigate, useRouterState } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PRODUCTS, productForPath } from "@/lib/products";

export function ProductSwitcher({
  className,
  showLabel = true,
}: {
  className?: string;
  showLabel?: boolean;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const active =
    pathname === "/focus" || pathname === "/products" ? null : productForPath(pathname);

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {showLabel && (
        <p className="px-1 text-[10px] font-black uppercase tracking-[0.18em] text-text-secondary">
          Switch focus
        </p>
      )}
      <div
        role="tablist"
        aria-label="Choose a focus"
        className="flex w-full flex-nowrap items-center gap-1 rounded-2xl border border-divider bg-card p-1 sm:gap-1.5 sm:p-1.5"
      >
        {PRODUCTS.map((product) => {
          const Icon = product.icon;
          const selected = active?.id === product.id;
          return (
            <button
              key={product.id}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-disabled={!product.available}
              title={product.available ? product.name : `${product.name} — coming soon`}
              onClick={() => {
                if (!product.available) return;
                navigate({ to: product.route });
              }}
              className={cn(
                "inline-flex min-h-[36px] min-w-0 flex-1 basis-0 items-center justify-center gap-1 whitespace-nowrap rounded-xl px-1.5 py-1.5 text-[11px] font-bold transition sm:gap-1.5 sm:px-3 sm:text-xs",
                selected ? "text-white shadow-sm" : "text-text-secondary hover:text-text-primary",
                !product.available && "cursor-not-allowed opacity-55",
              )}
              style={selected ? { backgroundColor: product.color } : undefined}
            >
              <Icon className="hidden h-3.5 w-3.5 shrink-0 sm:block" />
              <span className="truncate">{product.shortName}</span>
              {!product.available && (
                <span className="hidden rounded-full bg-subtle px-1.5 py-0.5 text-[8px] font-black uppercase tracking-wide sm:inline">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
