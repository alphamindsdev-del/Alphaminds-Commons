import { cn } from "@/lib/utils";

export function TierBadge({ tier, className }: { tier: "free" | "basic" | "premium"; className?: string }) {
  const map = {
    free: "bg-muted text-text-secondary",
    basic: "bg-accent/20 text-primary dark:text-accent",
    premium: "bg-gradient-to-r from-primary to-primary-light text-white",
  };
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider", map[tier], className)}>
      {tier}
    </span>
  );
}
