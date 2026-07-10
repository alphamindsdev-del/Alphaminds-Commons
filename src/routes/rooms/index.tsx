import { createFileRoute, Link } from "@tanstack/react-router";
import { useRooms } from "@/hooks/useRooms";
import { RoomCard } from "@/components/rooms/RoomCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { MessageSquare, Search } from "lucide-react";

export const Route = createFileRoute("/rooms/")({
  head: () => ({ meta: [{ title: "My Rooms · AlphaMinds" }] }),
  component: RoomsPage,
});

function RoomsPage() {
  const { data: roomsData, isLoading } = useRooms("global");
  const rooms = (roomsData?.data ?? []).map((r: any) => ({
    ...r, joined: r.joined ?? false,
    memberCount: r.member_count ?? 0, lastActivity: r.last_activity ?? "",
    lastPostPreview: r.last_post_preview ?? "", unread: r.unread ?? false,
  }));
  const joined = rooms.filter((r: any) => r.joined);
  const discover = rooms.filter((r: any) => !r.joined);

  if (isLoading) {
    return (
      <div className="space-y-10">
        <header>
          <h1 className="font-black text-3xl sm:text-4xl text-text-primary">My Rooms</h1>
          <p className="text-text-secondary mt-1">Conversations that show up for you, regularly.</p>
        </header>
        <div className="grid sm:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <header>
        <h1 className="font-black text-3xl sm:text-4xl text-text-primary">My Rooms</h1>
        <p className="text-text-secondary mt-1">Conversations that show up for you, regularly.</p>
      </header>

      <section>
        <h2 className="font-bold text-lg mb-4">Active Rooms</h2>
        {joined.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">{joined.map((r: any) => <RoomCard key={r.id} room={r} />)}</div>
        ) : (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="No active rooms yet"
            body="Join a room from the Discover section below to start engaging."
          />
        )}
      </section>

      <section>
        <h2 className="font-bold text-lg mb-4">Discover Rooms</h2>
        {discover.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">{discover.map((r: any) => <RoomCard key={r.id} room={r} suggested />)}</div>
        ) : (
          <EmptyState
            icon={<Search className="h-6 w-6" />}
            title="No rooms to discover"
            body="You've joined all available rooms. Check back later for new ones."
            action={<Link to="/houses" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Browse Houses</Link>}
          />
        )}
      </section>
    </div>
  );
}
