export function unitForMetric(metric: string | null): string {
  switch (metric) {
    case 'steps': return 'steps';
    case 'pages': return 'pages';
    case 'minutes': return 'min';
    case 'entries': return 'entries';
    default: return '';
  }
}

export function challengeDaysLeft(endsAt: string | null, durationDays: number | null): number {
  if (endsAt) {
    const end = new Date(endsAt).getTime();
    if (!Number.isNaN(end)) {
      return Math.max(Math.ceil((end - Date.now()) / 86400000), 0);
    }
  }
  return durationDays ?? 0;
}

export function mapChallenge(r: Record<string, any>) {
  return {
    id: r.id,
    name: r.title,
    slug: r.slug ?? '',
    house: r.house,
    description: r.description ?? '',
    metric: r.metric_type ?? '',
    type: r.challenge_type ?? '',
    target: r.target_value ?? 0,
    unit: unitForMetric(r.metric_type),
    points: r.points_reward ?? 0,
    participants: r.participant_count ?? 0,
    joined: !!r.is_participating,
    daysLeft: challengeDaysLeft(r.ends_at, r.duration_days),
    current: r.current_value ?? 0,
  };
}
