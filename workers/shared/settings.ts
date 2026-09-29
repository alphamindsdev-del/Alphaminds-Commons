export interface MemberSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  dailyContentReminder: boolean;
  showScoresOnProfile: boolean;
  profileVisibility: 'public' | 'members';
  emailWeeklyDigest: boolean;
  emailMarketing: boolean;
}

export const DEFAULT_SETTINGS: MemberSettings = {
  pushNotifications: true,
  emailNotifications: false,
  dailyContentReminder: true,
  showScoresOnProfile: true,
  profileVisibility: 'members',
  emailWeeklyDigest: true,
  emailMarketing: false,
};

const VALIDATORS: Record<keyof MemberSettings, (value: unknown) => boolean> = {
  pushNotifications: (v) => typeof v === 'boolean',
  emailNotifications: (v) => typeof v === 'boolean',
  dailyContentReminder: (v) => typeof v === 'boolean',
  showScoresOnProfile: (v) => typeof v === 'boolean',
  profileVisibility: (v) => v === 'public' || v === 'members',
  emailWeeklyDigest: (v) => typeof v === 'boolean',
  emailMarketing: (v) => typeof v === 'boolean',
};

export function parseSettings(raw: unknown): Partial<MemberSettings> {
  if (typeof raw !== 'string' || !raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
  return pickValid(parsed as Record<string, unknown>);
}

export function mergeSettings(current: Partial<MemberSettings>, incoming: Record<string, unknown>): MemberSettings {
  return { ...DEFAULT_SETTINGS, ...current, ...pickValid(incoming) };
}

function pickValid(source: Record<string, unknown>): Partial<MemberSettings> {
  const result: Partial<MemberSettings> = {};
  for (const key of Object.keys(VALIDATORS) as (keyof MemberSettings)[]) {
    if (key in source && VALIDATORS[key](source[key])) {
      (result as Record<string, unknown>)[key] = source[key];
    }
  }
  return result;
}
