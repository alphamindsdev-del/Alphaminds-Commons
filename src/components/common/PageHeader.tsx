import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  align = "left",
  actions,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "left" | "center";
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("space-y-3", align === "center" && "text-center mx-auto", className)}>
      {eyebrow && <p className="eyebrow flex items-center gap-2"><span className="h-1.5 w-1.5 rounded-full bg-accent" />{eyebrow}</p>}
      <h1 className="text-display font-semibold text-2xl sm:text-3xl lg:text-[34px] tracking-tight text-text-primary leading-[1.15]">
        {title}
      </h1>
      {subtitle && (
        <p className={cn("text-text-secondary max-w-2xl leading-relaxed", align === "center" && "mx-auto")}>{subtitle}</p>
      )}
      {actions && <div className={cn("pt-2", align === "center" && "flex justify-center")}>{actions}</div>}
    </header>
  );
}

export function SectionHeading({
  kicker,
  title,
  action,
  className,
}: {
  kicker?: string;
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex items-end justify-between gap-4 mb-4", className)}>
      <div>
        {kicker && <p className="eyebrow mb-1.5">{kicker}</p>}
        <h2 className="text-display font-semibold text-lg sm:text-xl tracking-tight text-text-primary leading-[1.2]">
          {title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
