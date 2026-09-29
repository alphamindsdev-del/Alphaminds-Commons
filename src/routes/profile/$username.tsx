import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useMemberProfile } from "@/hooks/useMemberProfile";
import { HOUSE_MAP, HOUSES } from "@/lib/constants";
import { Avatar } from "@/components/common/Avatar";
import { HouseBadge } from "@/components/common/HouseBadge";
import { ProgressBar } from "@/components/common/ProgressBar";
import { getMediaUrl } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

export const Route = createFileRoute("/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} · AlphaMinds` }] }),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { username } = Route.useParams();
  const { data: memberData, isLoading } = useMemberProfile(username);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();
  const followMutation = useMutation({
    mutationFn: () => apiFetch(`/v1/members/${username}/follow`, { method: memberData?.is_following ? "DELETE" : "POST" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["member", username] });
    },
    onError: (err: any) => {
      toast.error(err?.message ?? "Couldn't update follow");
    },
  });
  const m = memberData ? {
    name: memberData.display_name ?? memberData.name ?? username,
    username: memberData.username ?? username,
    primaryHouse: memberData.primary_house ?? "wellness",
    bio: memberData.bio ?? "",
    chapter: memberData.chapter ?? "",
    avatarUrl: memberData.avatar_url ?? null,
    coverPhotoUrl: memberData.cover_photo_url ?? null,
    scores: memberData.scores ?? { wellness: 0, becoming: 0, connection: 0, fun: 0, humanity: 0 },
  } : null;
  if (!m) {
    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const primary = HOUSE_MAP[m.primaryHouse] ?? HOUSE_MAP.wellness;
  const showFollow = isAuthenticated && !memberData?.is_self;
  return (
    <div className="space-y-8">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="relative z-0 h-40 sm:h-56 overflow-hidden" style={m.coverPhotoUrl ? undefined : { background: `linear-gradient(135deg, ${primary.color}, ${primary.color}99, var(--primary-dark))` }}>
          {m.coverPhotoUrl ? (
            <img src={getMediaUrl(m.coverPhotoUrl)} alt="Cover" className="h-full w-full object-cover" />
          ) : (
            <>
              <span className="absolute -top-8 -right-4 font-display font-bold text-[12rem] sm:text-[16rem] leading-none text-white/[0.09] tracking-tighter select-none pointer-events-none">
                {m.name.charAt(0).toUpperCase()}
              </span>
              <div className="absolute -top-24 -right-24 h-72 w-72 rounded-full blur-3xl opacity-30 bg-white" />
              <div className="absolute -bottom-32 -left-16 h-64 w-64 rounded-full blur-3xl opacity-20 bg-accent" />
            </>
          )}
        </div>
        <div className="px-4 sm:px-6 lg:px-8 -mt-10 relative z-10 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="ring-4 ring-background rounded-full relative z-10">
            {m.avatarUrl ? (
              <img src={getMediaUrl(m.avatarUrl)} alt={m.name} className="h-24 w-24 rounded-full object-cover" />
            ) : (
              <Avatar name={m.name} size="xl" color={primary.color} />
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-display font-semibold text-4xl tracking-tighter leading-none">{m.name}</h1>
            <p className="text-text-secondary mt-1">@{m.username}{m.chapter ? ` · ${m.chapter}` : ""}</p>
            {typeof memberData?.follower_count === "number" && (
              <p className="text-xs font-bold uppercase tracking-wider text-text-secondary mt-1">
                {memberData.follower_count} {memberData.follower_count === 1 ? "follower" : "followers"} · {memberData.following_count ?? 0} following
              </p>
            )}
            {m.bio && <p className="mt-2 text-text-primary">{m.bio}</p>}
            <div className="mt-3"><HouseBadge house={m.primaryHouse} /></div>
          </div>
          {showFollow && (
            <button
              onClick={() => followMutation.mutate()}
              disabled={followMutation.isPending}
              className={memberData?.is_following
                ? "rounded-xl border border-border font-bold px-6 py-2.5 text-sm self-start sm:self-auto disabled:opacity-50"
                : "rounded-xl btn-primary font-bold px-6 py-2.5 text-sm self-start sm:self-auto disabled:opacity-50"}
            >
              {memberData?.is_following ? "Following" : "Follow"}
            </button>
          )}
        </div>
      </div>
      <section className="rounded-3xl border border-border bg-card p-6 card-shadow">
        <h2 className="text-display font-semibold text-2xl tracking-tighter mb-4">Five Houses Score</h2>
        <div className="space-y-3">
          {HOUSES.map((h) => (
            <ProgressBar key={h.id} value={m.scores[h.id]} max={250} color={h.color} label={<span className="font-semibold">{h.name}</span>} />
          ))}
        </div>
      </section>
    </div>
  );
}
