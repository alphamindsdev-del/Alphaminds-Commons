import { createFileRoute, Link } from "@tanstack/react-router";
import { HOUSES, houseOfToday } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { useHouses } from "@/hooks/useHouses";
import { SkeletonCard } from "@/components/common/SkeletonCard";

export const Route = createFileRoute("/houses/")({
  head: () => ({ meta: [{ title: "The Five Houses · AlphaMinds" }] }),
  component: HousesPage,
});

function HousesPage() {
  const { member } = useAuthStore();
  const { data: housesData, isLoading } = useHouses();
  const houses = housesData?.houses ?? [];
  const today = houseOfToday();

  if (isLoading) {
    return (
      <div className="space-y-10">
        <header>
          <h1 className="font-black text-3xl sm:text-4xl text-text-primary">The Five Houses</h1>
          <p className="text-text-secondary mt-1">Every member belongs to all five.</p>
        </header>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-black text-3xl sm:text-4xl text-text-primary">The Five Houses</h1>
        <p className="text-text-secondary mt-1">Every member belongs to all five.</p>
      </header>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {HOUSES.map((h) => {
          const roomCount = houses.find((x: any) => x.house === h.id)?.room_count ?? 0;
          const eventCount = houses.find((x: any) => x.house === h.id)?.event_count ?? 0;
          const isPrimary = member?.primary_house === h.id;
          return (
            <Link
              key={h.id}
              to="/houses/$houseId"
              params={{ houseId: h.id }}
              className="relative overflow-hidden rounded-2xl p-6 text-white card-hover"
              style={{ background: `linear-gradient(160deg, ${h.color}, ${h.color}cc, ${h.color}88)` }}
            >
              {isPrimary && (
                <span className="absolute top-3 right-3 rounded-full bg-white/95 text-text-primary text-[10px] font-bold uppercase tracking-widest px-2 py-1">
                  Your Primary House
                </span>
              )}
              <div className="text-5xl mb-3">{h.emoji}</div>
              <h2 className="font-black text-2xl">{h.fullName}</h2>
              <p className="italic text-white/85 mt-1">{h.tagline}</p>
              <p className="text-sm text-white/90 mt-3 leading-relaxed">{h.description}</p>
              <p className="mt-5 text-xs font-bold uppercase tracking-widest text-white/80">
                {roomCount} Rooms · {(180 + roomCount * 60).toLocaleString()} Members · {eventCount} Events
              </p>
              <p className="mt-4 inline-flex items-center gap-1 text-sm font-bold">Explore House →</p>
            </Link>
          );
        })}
      </div>

      <section className="rounded-2xl border border-border bg-card p-6 card-shadow">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-3xl">{today.emoji}</span>
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-text-secondary">This Week's Theme</p>
            <h3 className="font-black text-xl text-text-primary">{today.dayLabel}</h3>
          </div>
        </div>
        <p className="text-text-secondary mt-2">Today's daily content focuses on {today.name.toLowerCase()} — small practices that compound into a flourishing life.</p>
      </section>
    </div>
  );
}
