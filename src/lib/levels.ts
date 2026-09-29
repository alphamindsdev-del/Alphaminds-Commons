export const MEMBERSHIP_LEVELS = [
  "SEEKER",
  "EXAMINER",
  "FACILITATOR",
  "STEWARD",
  "CHAPTER_LEADER",
  "COORDINATOR",
] as const;

export const EXAMINER_INDEX = 1;

export function levelIndex(level?: string | null): number {
  const idx = MEMBERSHIP_LEVELS.indexOf((level ?? "SEEKER") as (typeof MEMBERSHIP_LEVELS)[number]);
  return idx < 0 ? 0 : idx;
}

export function levelCopy(level: string): { article: "a" | "an"; label: string } {
  const label = level.replace(/_/g, " ").toLowerCase();
  return { article: /^[aeiou]/.test(label) ? "an" : "a", label };
}
