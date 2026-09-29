import { cn, initials } from "@/lib/utils";

export function Avatar({
  name,
  size = "md",
  className,
  color,
}: {
  name: string;
  size?: "sm" | "md" | "lg" | "xl" | "2xl";
  className?: string;
  color?: string;
}) {
  const sizes = {
    sm: "h-8 w-8 text-xs",
    md: "h-10 w-10 text-sm",
    lg: "h-14 w-14 text-base",
    xl: "h-24 w-24 text-2xl",
    "2xl": "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
  };
  return (
    <div
      className={cn(
        "inline-flex items-center justify-center rounded-full font-bold text-white shrink-0",
        sizes[size],
        className,
      )}
      style={{ background: color ?? "linear-gradient(135deg,var(--primary-dark),var(--primary-light))" }}
      aria-label={name}
    >
      {initials(name)}
    </div>
  );
}
