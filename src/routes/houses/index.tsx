import { createFileRoute, Link } from "@tanstack/react-router";
import { HOUSES } from "@/lib/constants";
import { useAuthStore } from "@/store/authStore";
import { useHouses } from "@/hooks/useHouses";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/houses/")({
  head: () => ({ meta: [{ title: "The Five Houses · AlphaMinds" }] }),
  component: HousesPage,
});

function HousesPage() {
  const { member } = useAuthStore();
  const { data: housesData, isLoading } = useHouses();
  const apiHouses = (housesData as any)?.data ?? [];

  if (isLoading) {
    return (
      <div className="space-y-10">
        <PageHeader
          eyebrow="Belong Everywhere"
          title="The Five Houses"
          subtitle="Every member belongs to all five — one carries your flag, all five build you."
        />
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 5 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <PageHeader
        eyebrow="Belong Everywhere"
        title="The Five Houses"
        subtitle="Every member belongs to all five — one carries your flag, all five build you."
      />

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {HOUSES.map((h) => {
          const info = apiHouses.find((x: any) => x.house === h.id);
          const roomCount = info?.room_count ?? 0;
          const memberCount = info?.member_count ?? 0;
          const eventCount = info?.event_count ?? 0;
          const isPrimary = member?.primary_house === h.id;
          const initial = h.fullName.replace("House of ", "").charAt(0).toUpperCase();
          return (
            <Link
              key={h.id}
              to="/houses/$houseId"
              params={{ houseId: h.id }}
              className="group relative overflow-hidden rounded-3xl border border-border bg-card card-shadow card-glow"
            >
              {/* Color field */}
              <div
                className="relative h-40 overflow-hidden"
                style={{ background: `linear-gradient(140deg, ${h.color}, ${h.color}99 55%, var(--primary-dark))` }}
              >
                <span className="absolute -bottom-8 -right-2 font-display font-bold text-[9rem] leading-none text-white/[0.14] tracking-tighter select-none">
                  {initial}
                </span>
                <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                  {isPrimary && (
                    <span className="rounded-full bg-white/95 text-text-primary text-[10px] font-black uppercase tracking-widest px-3 py-1">
                      Your House
                    </span>
                  )}
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-black/25 backdrop-blur text-white text-[11px] font-bold">
                    <h.icon className="h-3.5 w-3.5" />
                    {h.dayLabel}
                  </span>
                </div>
                <div className="absolute bottom-4 left-5 right-5">
                  <h2 className="text-display font-semibold text-3xl tracking-tighter text-white leading-none">{h.fullName}</h2>
                </div>
              </div>

              <div className="p-5">
                <p className="text-sm italic text-text-secondary">{h.tagline}</p>
                <p className="mt-2 text-sm text-text-primary leading-relaxed line-clamp-2">{h.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-semibold text-text-secondary">
                    <span className="tabular-nums">{roomCount} rooms</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="tabular-nums">{memberCount.toLocaleString()} members</span>
                    <span className="w-1 h-1 rounded-full bg-border" />
                    <span className="tabular-nums">{eventCount} events</span>
                  </div>
                  <span className="inline-flex items-center gap-1 text-sm font-bold" style={{ color: h.color }}>
                    Explore <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
