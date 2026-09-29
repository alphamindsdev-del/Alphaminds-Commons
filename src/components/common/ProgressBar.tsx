import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function ProgressBar({
  value = 0,
  max = 100,
  color = "var(--primary)",
  label,
  showValue = true,
  className,
}: {
  value?: number;
  max?: number;
  color?: string;
  label?: ReactNode;
  showValue?: boolean;
  className?: string;
}) {
  const pct = Math.min(100, Math.round(((value ?? 0) / (max ?? 100)) * 100));
  return (
    <div className={cn("w-full", className)}>
      {(label || showValue) && (
        <div className="flex items-center justify-between mb-1.5">
          {label && <span className="text-xs font-semibold text-text-secondary">{label}</span>}
          {showValue && (
            <span className="text-xs font-bold tabular-nums" style={{ color }}>
              {value.toLocaleString()} / {max.toLocaleString()}
            </span>
          )}
        </div>
      )}
      <div className="h-2 w-full overflow-hidden rounded-full bg-subtle">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: color }}
        />
      </div>
    </div>
  );
}
