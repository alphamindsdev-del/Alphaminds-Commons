import { createFileRoute, Link } from "@tanstack/react-router";
import { useRooms } from "@/hooks/useRooms";
import { RoomCard } from "@/components/rooms/RoomCard";
import { EmptyState } from "@/components/common/EmptyState";
import { PageHeader } from "@/components/common/PageHeader";
import { useAuthStore } from "@/store/authStore";
import { Loader2, MessagesSquare } from "lucide-react";

export const Route = createFileRoute("/rooms/")({
  head: () => ({ meta: [{ title: "Rooms · AlphaMinds" }] }),
  component: RoomsPage,
});

function RoomsPage() {
  const { isAuthenticated } = useAuthStore();
  const { data, isLoading } = useRooms(isAuthenticated ? "global" : "");
  const rooms = (data?.data ?? data?.rooms ?? []) as any[];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Rooms"
        title="Find your people"
        subtitle="Every room is a conversation worth having — join one, or start posting in the rooms you're part of."
      />

      {!isAuthenticated ? (
        <EmptyState
          icon={<MessagesSquare className="h-6 w-6" />}
          title="Sign in to browse rooms"
          body="Rooms are where the community talks, shares, and supports each other."
          action={<Link to="/login" className="rounded-xl bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 inline-block">Sign in</Link>}
        />
      ) : isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : rooms.length === 0 ? (
        <EmptyState
          icon={<MessagesSquare className="h-6 w-6" />}
          title="No rooms yet"
          body="Rooms will appear here once created by the admin team."
        />
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {rooms.map((r) => (
            <RoomCard key={r.id} room={r} suggested={!r.is_member} />
          ))}
        </div>
      )}
    </div>
  );
}
