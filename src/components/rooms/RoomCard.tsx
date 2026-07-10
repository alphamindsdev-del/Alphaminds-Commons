import { Link } from "@tanstack/react-router";
import type { HouseId } from "@/lib/constants";

interface Room {
  id: string;
  name: string;
  house: HouseId;
  description: string;
  memberCount: number;
  lastActivity: string;
  lastPostPreview: string;
  unread: boolean;
  joined: boolean;
}
import { HouseBadge } from "@/components/common/HouseBadge";
import { Users } from "lucide-react";

export function RoomCard({ room, suggested = false }: { room: Room; suggested?: boolean }) {
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
            <Users className="h-3 w-3" /> {room.memberCount} members · {room.lastActivity}
          </p>
        </div>
        <HouseBadge house={room.house} size="sm" />
      </div>
      {suggested ? (
        <p className="text-sm text-text-secondary line-clamp-2">{room.description}</p>
      ) : (
        <p className="text-sm text-text-primary line-clamp-2">{room.lastPostPreview}</p>
      )}
      {suggested && (
        <button className="mt-3 w-full rounded-xl py-2 text-sm font-bold bg-primary text-white">
          Join Room
        </button>
      )}
    </Link>
  );
}
