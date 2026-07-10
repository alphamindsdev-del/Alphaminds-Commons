import { createFileRoute, notFound } from "@tanstack/react-router";
import { useMemberProfile } from "@/hooks/useMemberProfile";
import { HOUSE_MAP, HOUSES } from "@/lib/constants";
import { Avatar } from "@/components/common/Avatar";
import { HouseBadge } from "@/components/common/HouseBadge";
import { ProgressBar } from "@/components/common/ProgressBar";

export const Route = createFileRoute("/profile/$username")({
  head: ({ params }) => ({ meta: [{ title: `@${params.username} · AlphaMinds` }] }),
  component: MemberProfilePage,
});

function MemberProfilePage() {
  const { username } = Route.useParams();
  const { data: memberData, isLoading } = useMemberProfile(username);
  const m = memberData ? {
    name: memberData.display_name ?? memberData.name ?? username,
    username: memberData.username ?? username,
    primaryHouse: memberData.primary_house ?? "wellness",
    bio: memberData.bio ?? "",
    chapter: memberData.chapter ?? "",
    scores: memberData.scores ?? { wellness: 0, becoming: 0, connection: 0, play: 0, humanity: 0 },
  } : null;
  if (!m) {
    if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const primary = HOUSE_MAP[m.primaryHouse];
  return (
    <div className="space-y-8">
      <div className="-mx-4 sm:-mx-6 lg:-mx-8">
        <div className="h-40 sm:h-56" style={{ background: `linear-gradient(135deg, ${primary.color}, ${primary.color}99, #1e3f47)` }} />
        <div className="px-4 sm:px-6 lg:px-8 -mt-12 flex flex-col sm:flex-row sm:items-end gap-4">
          <div className="ring-4 ring-background rounded-full"><Avatar name={m.name} size="xl" color={primary.color} /></div>
          <div className="flex-1">
            <h1 className="font-black text-3xl">{m.name}</h1>
            <p className="text-text-secondary">@{m.username} · {m.chapter}</p>
            <p className="mt-2 text-text-primary">{m.bio}</p>
            <div className="mt-3"><HouseBadge house={m.primaryHouse} /></div>
          </div>
          <button className="rounded-xl bg-primary text-white font-bold px-4 py-2 text-sm">Follow</button>
        </div>
      </div>
      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <h2 className="font-bold text-lg mb-4">Five Houses Score</h2>
        <div className="space-y-3">
          {HOUSES.map((h) => (
            <ProgressBar key={h.id} value={m.scores[h.id]} max={250} color={h.color} label={`${h.emoji} ${h.name}`} />
          ))}
        </div>
      </section>
    </div>
  );
}
