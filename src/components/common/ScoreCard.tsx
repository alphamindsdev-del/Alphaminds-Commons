import { CircularProgress } from "./CircularProgress";
import { HOUSE_MAP, HouseId } from "@/lib/constants";

export function ScoreCard({ house, value }: { house: HouseId; value: number }) {
  const h = HOUSE_MAP[house];
  const max = 200;
  return (
    <div className="flex-shrink-0 w-32 sm:w-auto rounded-2xl border border-border bg-card p-4 card-shadow flex flex-col items-center gap-2">
      <CircularProgress value={value} max={max} size={56} stroke={5} color={h.color}>
        <span className="text-lg">{h.emoji}</span>
      </CircularProgress>
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-widest font-bold text-text-secondary">{h.name}</div>
        <div className="text-xl font-black tabular-nums" style={{ color: h.color }}>{value}</div>
      </div>
    </div>
  );
}
