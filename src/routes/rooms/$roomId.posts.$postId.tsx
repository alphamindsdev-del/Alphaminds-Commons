import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePostDetail } from "@/hooks/usePostDetail";
import { usePostComments } from "@/hooks/usePostComments";
import { useCreateComment } from "@/hooks/useCreateComment";
import { useAuthStore } from "@/store/authStore";
import { PostCard } from "@/components/posts/PostCard";
import { Avatar } from "@/components/common/Avatar";
import { cleanWriteup } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/rooms/$roomId/posts/$postId")({
  head: () => ({ meta: [{ title: "Post · AlphaMinds" }] }),
  component: PostDetailPage,
});

function PostDetailPage() {
  const { roomId, postId } = Route.useParams();
  const { data: postData, isLoading: postLoading } = usePostDetail(postId);
  const { data: commentsData, isLoading: commentsLoading } = usePostComments(postId);
  const { member: authMember, isAuthenticated } = useAuthStore();
  const createComment = useCreateComment(postId);
  const queryClient = useQueryClient();
  const [text, setText] = useState("");

  if (postLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;
  if (!postData) throw notFound();

  const post = {
    id: postData.id,
    roomId: postData.room_id ?? roomId,
    author: {
      name: postData.author?.name ?? "Member",
      username: postData.author?.username ?? "",
      primaryHouse: (postData.author?.primaryHouse ?? "wellness") as any,
    },
    content: postData.content ?? "",
    timestamp: postData.timestamp ?? "",
    reactions: postData.reactions ?? 0,
    comments: postData.comment_count ?? 0,
    image: postData.image,
    poll: postData.poll,
  };

  const comments = (commentsData?.pages ?? []).flatMap((p: any) => p.data ?? []).map((c: any) => ({
    id: c.id,
    content: c.content ?? "",
    timestamp: c.created_at ? new Date(c.created_at).toLocaleDateString() : "",
    author: {
      id: c.author?.id,
      name: c.author?.name ?? "Member",
      primaryHouse: (c.author?.primaryHouse ?? "wellness") as string,
    },
    replies: (c.replies ?? []).map((r: any) => ({
      id: r.id,
      content: r.content ?? "",
      timestamp: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
      author: {
        id: r.author?.id,
        name: r.author?.name ?? "Member",
        primaryHouse: (r.author?.primaryHouse ?? "wellness") as string,
      },
    })),
  }));
  const meColor = "var(--accent)";

  async function submitComment() {
    const content = text.trim();
    if (!content) return;
    try {
      await createComment.mutateAsync({ content });
      setText("");
      queryClient.invalidateQueries({ queryKey: ["post", postId] });
      toast.success("Comment posted");
    } catch (err: any) {
      toast.error(err.message ?? "Failed to post comment");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <Link to="/rooms/$roomId" params={{ roomId }} className="text-sm font-semibold text-text-secondary">← Back to room</Link>
      <PostCard post={post} />
      <section>
        <h2 className="font-bold text-lg mb-4">Comments ({post.comments})</h2>
        {commentsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-sm text-text-secondary text-center py-6">No comments yet — be the first.</p>
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const ch = "var(--accent)";
              return (
                <div key={c.id} className="rounded-2xl border border-border bg-card p-4">
                  <div className="flex items-start gap-3">
                    <Avatar name={c.author.name} size="sm" color={ch} />
                    <div className="flex-1">
                      <div className="text-sm"><span className="font-bold">{c.author.name}</span> <span className="text-text-secondary">· {c.timestamp}</span></div>
                      <p className="text-text-primary mt-1">{cleanWriteup(c.content)}</p>
                      {c.replies?.length > 0 && (
                        <div className="mt-3 pl-4 border-l-2 border-border space-y-3">
                          {c.replies.map((r: any) => {
                            const rh = "var(--accent)";
                            return (
                              <div key={r.id} className="flex items-start gap-2">
                                <Avatar name={r.author.name} size="sm" color={rh} />
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
        )}
      </section>

      {isAuthenticated ? (
        <div className="sticky bottom-20 md:bottom-4 rounded-2xl border border-border bg-card p-3 card-shadow flex items-center gap-2">
          <Avatar name={authMember?.display_name ?? "Member"} size="sm" color={meColor} />
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submitComment();
              }
            }}
            placeholder="Add a comment…"
            className="flex-1 bg-transparent outline-none text-sm"
          />
          <button
            onClick={submitComment}
            disabled={!text.trim() || createComment.isPending}
            className="rounded-xl bg-primary text-primary-foreground font-bold text-sm px-4 py-2 disabled:opacity-50"
          >
            {createComment.isPending ? "Posting…" : "Post"}
          </button>
        </div>
      ) : (
        <div className="sticky bottom-20 md:bottom-4 rounded-2xl border border-border bg-card p-4 card-shadow text-center text-sm text-text-secondary">
          <Link to="/login" className="font-bold text-primary">Sign in</Link> to join the conversation.
        </div>
      )}
    </div>
  );
}
