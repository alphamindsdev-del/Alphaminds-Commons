import { createFileRoute, Link, notFound, Outlet, useRouterState } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useRoomDetail } from "@/hooks/useRoomDetail";
import { useRoomPosts } from "@/hooks/useRoomPosts";
import { useJoinRoom } from "@/hooks/useJoinRoom";
import { useLeaveRoom } from "@/hooks/useLeaveRoom";
import { useAuthStore } from "@/store/authStore";
import { HouseBadge } from "@/components/common/HouseBadge";
import { PostComposer } from "@/components/posts/PostComposer";
import { PostCard } from "@/components/posts/PostCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Users, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rooms/$roomId")({
  loader: async ({ params }) => params,
  head: () => ({
    meta: [{ title: `Room · AlphaMinds` }],
  }),
  component: RoomDetailPage,
});

function RoomDetailPage() {
  const isPostDetail = useRouterState({
    select: (s) => s.matches.some((m) => m.routeId === "/rooms/$roomId/posts/$postId"),
  });
  const { roomId } = Route.useParams();
  const queryClient = useQueryClient();
  const { data, isLoading } = useRoomDetail(roomId);
  const { data: postsData, isLoading: postsLoading } = useRoomPosts(roomId);
  const { isAuthenticated } = useAuthStore();
  const joinRoom = useJoinRoom();
  const leaveRoom = useLeaveRoom();

  if (isPostDetail) return <Outlet />;

  const room = data?.room;
  const isMember = data?.isMember ?? false;

  if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
  if (!room) throw notFound();

  const feed = (postsData?.pages ?? []).flatMap((p: any) => p.data ?? []);

  async function toggleMembership() {
    if (!room) return;
    if (isMember) {
      await leaveRoom.mutateAsync(roomId).catch((err: any) => {
        toast.error(err.message ?? "Failed to leave room");
        return null;
      });
      toast.success("You left " + room.name);
    } else {
      await joinRoom.mutateAsync(roomId).catch((err: any) => {
        toast.error(err.message ?? "Failed to join room");
        return null;
      });
      toast.success("You joined " + room.name);
    }
    queryClient.invalidateQueries({ queryKey: ["room", roomId] });
  }

  return (
    <div className="space-y-6">
      <header className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 glass border-b border-border">
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-display font-semibold text-2xl tracking-tighter truncate">{room.name}</h1>
              <HouseBadge house={room.house} size="sm" />
            </div>
            <p className="text-xs text-text-secondary inline-flex items-center gap-1">
              <Users className="h-3 w-3" /> {room.memberCount ?? 0} members
            </p>
          </div>
          {isAuthenticated ? (
            <button
              onClick={toggleMembership}
              disabled={joinRoom.isPending || leaveRoom.isPending}
              className={
                isMember
                  ? "text-sm font-semibold px-4 py-2 rounded-xl border border-border hover:bg-subtle transition-colors disabled:opacity-50"
                  : "text-sm font-bold px-4 py-2 rounded-xl bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
              }
            >
              {joinRoom.isPending || leaveRoom.isPending ? "..." : isMember ? "Leave" : "Join room"}
            </button>
          ) : (
            <Link to="/login" className="text-sm font-bold px-4 py-2 rounded-xl bg-primary text-primary-foreground">
              Sign in
            </Link>
          )}
        </div>
      </header>

      {isAuthenticated && <PostComposer roomId={room.id} roomName={room.name} />}

      <div className="space-y-4">
        {postsLoading ? (
          <div className="p-8 text-center text-text-secondary">Loading posts...</div>
        ) : feed.length > 0 ? (
          feed.map((p) => <PostCard key={p.id} post={p} />)
        ) : (
          <EmptyState
            icon={<MessageSquare className="h-6 w-6" />}
            title="No posts yet"
            body={isAuthenticated ? "Start the conversation — be the first to post in this room." : "Sign in to join the conversation."}
            action={isAuthenticated ? undefined : <Link to="/login" className="rounded-xl bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 inline-block">Sign in to post</Link>}
          />
        )}
      </div>
    </div>
  );
}
