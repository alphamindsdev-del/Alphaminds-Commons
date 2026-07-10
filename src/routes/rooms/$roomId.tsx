import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useRoomDetail } from "@/hooks/useRoomDetail";
import { useRoomPosts } from "@/hooks/useRoomPosts";
import { useAuthStore } from "@/store/authStore";
import { HouseBadge } from "@/components/common/HouseBadge";
import { PostComposer } from "@/components/posts/PostComposer";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/common/EmptyState";
import { MoreHorizontal, Users, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: async ({ params }) => params,
  head: () => ({
    meta: [{ title: `Room · AlphaMinds` }],
  }),
  component: RoomDetailPage,
});

function RoomDetailPage() {
  const { roomId } = Route.useParams();
  const { data: roomData, isLoading: roomLoading } = useRoomDetail(roomId);
  const { data: postsData, isLoading: postsLoading } = useRoomPosts(roomId);
  const { isAuthenticated } = useAuthStore();
  const room = roomData ? {
    id: roomData.room.id, name: roomData.room.name, house: roomData.room.house,
    description: roomData.room.description ?? "", memberCount: roomData.room.member_count ?? 0,
    lastActivity: roomData.room.last_activity ?? "", lastPostPreview: roomData.room.last_post_preview ?? "",
    unread: roomData.room.unread ?? false, joined: roomData.room.joined ?? false,
  } : null;
  if (!room) {
    if (roomLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const feed = (postsData?.pages ?? []).flatMap((p: any) => p.data ?? []);

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 glass border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-black text-xl truncate">{room.name}</h1>
              <HouseBadge house={room.house} size="sm" />
            </div>
            <p className="text-xs text-text-secondary inline-flex items-center gap-1"><Users className="h-3 w-3" /> {room.memberCount} members</p>
          </div>
          <button className="h-10 w-10 rounded-full hover:bg-subtle flex items-center justify-center" aria-label="Options">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>
      </header>

      {isAuthenticated && <PostComposer roomId={room.id} roomName={room.name} />}

      <div className="space-y-4">
        {feed.length > 0 ? feed.map((p) => <PostCard key={p.id} post={p} />) : (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="No posts yet"
            body={isAuthenticated ? "Start the conversation — be the first to post in this room." : "Sign in to join the conversation."}
            action={isAuthenticated ? undefined : <Link to="/login" className="rounded-xl bg-primary text-white text-sm font-bold px-5 py-2.5 inline-block">Sign in to post</Link>}
          />
        )}
      </div>
    </div>
  );
}
