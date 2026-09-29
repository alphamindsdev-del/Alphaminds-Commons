import { Link } from "@tanstack/react-router";
import type { HouseId } from "@/lib/constants";

interface Room {
  id: string;
  name: string;
  house: HouseId;
  description?: string;
  memberCount?: number;
  lastActivity?: string;
  lastPostPreview?: string;
  unread?: boolean;
  joined?: boolean;
  member_count?: number;
  last_activity?: string;
  last_post_preview?: string;
}
import { HouseBadge } from "@/components/common/HouseBadge";
import { useJoinRoom } from "@/hooks/useJoinRoom";
import { useAuthStore } from "@/store/authStore";
import { queryClient } from "@/lib/queryClient";
import { toast } from "@/components/common/Toast";
import { Users, Loader2 } from "lucide-react";

export function RoomCard({ room, suggested = false }: { room: Room; suggested?: boolean }) {
  const joinRoom = useJoinRoom();
  const { member } = useAuthStore();
  const memberCount = room.memberCount ?? room.member_count ?? 0;
  const lastActivity = room.lastActivity ?? room.last_activity ?? "";
  const lastPostPreview = room.lastPostPreview ?? room.last_post_preview ?? "";
  return (
    <Link
      to="/rooms/$roomId"
      params={{ roomId: room.id }}
      className="group block rounded-2xl border border-border bg-card p-4 card-shadow card-hover"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-text-primary truncate">{room.name}</h3>
            {room.unread && <span className="h-2 w-2 rounded-full bg-accent shrink-0" />}
          </div>
          <p className="text-xs text-text-secondary mt-0.5 inline-flex items-center gap-1">
            <Users className="h-3 w-3" /> {memberCount} members{lastActivity ? ` · ${lastActivity}` : ""}
          </p>
        </div>
        <HouseBadge house={room.house} size="sm" />
      </div>
      {suggested ? (
        <p className="text-sm text-text-secondary line-clamp-2">{room.description}</p>
      ) : (
        <p className="text-sm text-text-primary line-clamp-2">{lastPostPreview || room.description || ""}</p>
      )}
      {suggested && (
        <button
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!member) {
              window.location.href = "/login";
              return;
            }
            joinRoom.mutate(room.id, {
              onSuccess: () => {
                queryClient.invalidateQueries({ queryKey: ["houses"] });
                toast.success(`Joined ${room.name}`);
              },
              onError: (err: any) => toast.error(err.message ?? "Failed to join room"),
            });
          }}
          disabled={joinRoom.isPending}
          className="mt-3 w-full rounded-xl py-2 text-sm font-bold bg-primary text-primary-foreground disabled:opacity-60"
        >
          {joinRoom.isPending ? <><Loader2 className="h-3 w-3 inline animate-spin" /> Joining…</> : "Join Room"}
        </button>
      )}
    </Link>
  );
}
