import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { usePostDetail } from "@/hooks/usePostDetail";
import { usePostComments } from "@/hooks/usePostComments";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP, type HouseId } from "@/lib/constants";
import { PostCard } from "@/components/posts/PostCard";
import { Avatar } from "@/components/common/Avatar";
import { cleanWriteup } from "@/lib/utils";

export const Route = createFileRoute("/rooms/$roomId/posts/$postId")({
  head: () => ({ meta: [{ title: "Post · AlphaMinds" }] }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { roomId, postId } = Route.useParams();
  const { data: postData, isLoading: postLoading } = usePostDetail(postId);
  const { data: commentsData, isLoading: commentsLoading } = usePostComments(postId);
  const { member: authMember } = useAuthStore();
  const post = postData ? {
    id: postData.id, roomId: postData.room_id ?? "", author: {
      id: postData.author?.id, name: postData.author?.display_name ?? postData.author?.name ?? "",
      username: postData.author?.username ?? "", avatar: "", primaryHouse: (postData.author?.primary_house ?? "wellness") as HouseId,
    }, content: postData.content ?? "", title: postData.title ?? "",
    timestamp: postData.created_at ? new Date(postData.created_at).toLocaleDateString() : "",
    likes: postData.likes ?? 0, liked: postData.liked ?? false,
    replyCount: postData.comment_count ?? 0,
    reactions: postData.reactions ?? 0, comments: postData.comment_count ?? 0,
  } : null;
  if (!post) {
    if (postLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
    throw notFound();
  }
  const comments = (commentsData?.pages ?? []).flatMap((p: any) => p.data ?? []).map((c: any) => ({
    id: c.id, content: c.content ?? "", timestamp: c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    author: { id: c.author?.id, name: c.author?.display_name ?? c.author?.name ?? "", avatar: "", primaryHouse: (c.author?.primary_house ?? "wellness") as HouseId },
    replies: (c.replies ?? []).map((r: any) => ({
      id: r.id, content: r.content ?? "", timestamp: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      author: { id: r.author?.id, name: r.author?.display_name ?? r.author?.name ?? "", avatar: "", primaryHouse: (r.author?.primary_house ?? "wellness") as HouseId },
    })),
  }));
  const meColor = HOUSE_MAP[authMember?.primary_house ?? "wellness"].color;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to="/rooms/$roomId" params={{ roomId }} className="text-sm font-semibold text-text-secondary">← Back to room</Link>
      <PostCard post={post} />
      <section>
        <h2 className="font-bold text-lg mb-4">Comments ({comments.length})</h2>
        <div className="space-y-4">
          {comments.map((c) => {
            const ch = HOUSE_MAP[c.author.primaryHouse];
            return (
              <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start gap-3">
                  <Avatar name={c.author.name} size="sm" color={ch.color} />
                  <div className="flex-1">
                    <div className="text-sm"><span className="font-bold">{c.author.name}</span> <span className="text-text-secondary">· {c.timestamp}</span></div>
                    <p className="text-text-primary mt-1">{cleanWriteup(c.content)}</p>
                    {c.replies?.length > 0 && (
                      <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
                        {c.replies.map((r: any) => {
                          const rh = HOUSE_MAP[r.author.primaryHouse as HouseId];
                          return (
                            <div key={r.id} className="flex items-start gap-2">
                              <Avatar name={r.author.name} size="sm" color={rh.color} />
                              <div>
                                <div className="text-sm"><span className="font-bold">{r.author.name}</span> <span className="text-text-secondary">· {r.timestamp}</span></div>
                                <p className="text-text-primary mt-1 text-sm">{cleanWriteup(r.content)}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="sticky bottom-20 md:bottom-4 rounded-2xl border border-border bg-card p-3 card-shadow flex items-center gap-2">
        <Avatar name={authMember?.display_name ?? "Member"} size="sm" color={meColor} />
        <input placeholder="Add a comment…" className="flex-1 bg-transparent outline-none text-sm" />
        <button className="rounded-xl bg-primary text-white font-bold text-sm px-4 py-2">Post</button>
      </div>
    </div>
  );
}
