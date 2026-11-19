/**
 * The AlphaMinds member journey: five personal-development stages.
 *
 * Administrative / community positions (Facilitator, Steward, Chapter Leader,
 * Coordinator) are NOT stages of personal growth and deliberately live outside
 * this list — see ADMIN_ROLES below. They are stored separately on the member
 * record and are never rendered as part of the growth progression.
 */

export const MEMBERSHIP_LEVELS = [
  "SEEKER",
  "EXAMINER",
  "ARCHITECT",
  "BUILDER",
  "CATALYST",
] as const;

export type MembershipLevel = (typeof MEMBERSHIP_LEVELS)[number];

export interface MemberJourneyStage {
  level: MembershipLevel;
  number: string;
  title: string;
  action: string;
  statement: string;
}

export const MEMBER_JOURNEY_STAGES: MemberJourneyStage[] = [
  {
    level: "SEEKER",
    number: "01",
    title: "Seeker",
    action: "Discover",
    statement: "I want to understand life, myself and what is possible.",
  },
  {
    level: "EXAMINER",
    number: "02",
    title: "Examiner",
    action: "Question",
    statement: "I want to examine what I know, what I believe and what I accept as true.",
  },
  {
    level: "ARCHITECT",
    number: "03",
    title: "Architect",
    action: "Design",
    statement: "I want to consciously design the person I become and the life I live.",
  },
  {
    level: "BUILDER",
    number: "04",
    title: "Builder",
    action: "Develop",
    statement: "I want to develop my abilities and turn my intentions into reality.",
  },
  {
    level: "CATALYST",
    number: "05",
    title: "Catalyst",
    action: "Contribute",
    statement: "I want to use my capabilities to create positive change in the lives of others.",
  },
];

/** Administrative / community positions — separate from the growth journey. */
export const ADMIN_ROLES = ["FACILITATOR", "STEWARD", "CHAPTER_LEADER", "COORDINATOR"] as const;

export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
  FACILITATOR: "Facilitator",
  STEWARD: "Steward",
  CHAPTER_LEADER: "Chapter Leader",
  COORDINATOR: "Coordinator",
};

/**
 * Codes used before the journey was split from administrative roles. Members
 * whose stored level predates that migration are mapped onto the equivalent
 * development stage so their progress is never lost.
 */
export const LEGACY_LEVEL_MAP: Record<string, MembershipLevel> = {
  FACILITATOR: "ARCHITECT",
  STEWARD: "BUILDER",
  CHAPTER_LEADER: "CATALYST",
  COORDINATOR: "CATALYST",
};

export const LEVEL_LABELS: Record<MembershipLevel, string> = {
  SEEKER: "Seeker",
  EXAMINER: "Examiner",
  ARCHITECT: "Architect",
  BUILDER: "Builder",
  CATALYST: "Catalyst",
};

export const EXAMINER_INDEX = 1;

export function normalizeLevel(level?: string | null): MembershipLevel {
  const raw = (level ?? "SEEKER").toUpperCase();
  const mapped = LEGACY_LEVEL_MAP[raw] ?? raw;
  return (MEMBERSHIP_LEVELS as readonly string[]).includes(mapped)
    ? (mapped as MembershipLevel)
    : "SEEKER";
}

export function levelIndex(level?: string | null): number {
  const idx = MEMBERSHIP_LEVELS.indexOf(normalizeLevel(level));
  return idx < 0 ? 0 : idx;
}

export function levelLabel(level?: string | null): string {
  return LEVEL_LABELS[normalizeLevel(level)];
}

export function isAdminRole(value?: string | null): boolean {
  return (ADMIN_ROLES as readonly string[]).includes((value ?? "").toUpperCase());
}

export function adminRoleLabel(role?: string | null): string {
  if (!role) return "";
  const key = role.toUpperCase() as AdminRole;
  return ADMIN_ROLE_LABELS[key] ?? role.replace(/_/g, " ").toLowerCase();
}

export function levelCopy(level: string): { article: "a" | "an"; label: string } {
  const label = levelLabel(level).toLowerCase();
  return { article: /^[aeiou]/.test(label) ? "an" : "a", label };
}
