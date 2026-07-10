import { HOUSE_MAP, HouseId } from "@/lib/constants";
import { cn } from "@/lib/utils";

export function HouseBadge({
  house,
  size = "md",
  className,
  showEmoji = true,
}: {
  house: HouseId;
  size?: "sm" | "md" | "lg";
  className?: string;
  showEmoji?: boolean;
}) {
  const h = HOUSE_MAP[house];
  const sizes = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-1 gap-1.5",
    lg: "text-sm px-3 py-1.5 gap-2",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full font-semibold whitespace-nowrap",
        sizes[size],
        className,
      )}
      style={{
        background: `${h.color}15`,
        color: h.color,
        border: `1px solid ${h.color}30`,
      }}
    >
      {showEmoji && <span>{h.emoji}</span>}
      {h.name}
    </span>
  );
}
