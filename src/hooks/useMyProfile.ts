import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../lib/api";
import type { Badge, MyProfileResponse } from "../lib/types";

export function useMyProfile() {
  return useQuery<MyProfileResponse>({
    queryKey: ["me", "profile"],
    queryFn: async () => {
      const data = await apiFetch<{
        member: Record<string, unknown>;
        stats: Record<string, unknown>;
        houses: Array<Record<string, unknown>>;
        badges: Array<Record<string, unknown>>;
      }>("/v1/me/profile");
      const member = data.member ?? {};
      const stats = data.stats ?? {};

      const badges: Badge[] = (data.badges ?? []).map((b) => ({
        id: (b.badge_id ?? b.id) as string,
        name: b.name as string,
        icon: (b.icon_r2_key ?? b.icon) as string | undefined,
        earned_at: b.awarded_at as string | undefined,
        earnedAt: b.awarded_at as string | undefined,
      }));

      return {
        id: member.id as string,
        display_name: member.display_name as string,
        username: member.username as string,
        email: member.email as string,
        bio: member.bio as string | undefined,
        avatar_url: member.avatar_r2_key as string | null | undefined,
        cover_photo_url: member.cover_photo_r2_key as string | null | undefined,
        primary_house: member.primary_house as import("../lib/constants").HouseId,
        secondary_houses: (data.houses ?? [])
          .filter((h) => !h.is_primary)
          .map((h) => h.house as string),
        chapter_id: member.chapter_id as string | null | undefined,
        role: member.role as string | undefined,
        email_verified: member.email_verified as boolean | undefined,
        created_at: member.created_at as string | undefined,
        joined_at: member.created_at as string | undefined,
        chapter: member.chapter_id as string | undefined,
        streak: (stats.current_streak_days ?? 0) as number,
        total_points: (stats.total_points ?? 0) as number,
        challenges_completed: (stats.challenges_completed ?? 0) as number,
        events_attended: (stats.events_attended ?? 0) as number,
        scores: {
          wellness: (stats.wellness_score ?? 0) as number,
          becoming: (stats.becoming_score ?? 0) as number,
          connection: (stats.connection_score ?? 0) as number,
          fun: (stats.play_score ?? 0) as number,
          humanity: (stats.humanity_score ?? 0) as number,
        },
        badges,
      };
    },
  });
}
