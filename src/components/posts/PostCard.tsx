import { Link } from "@tanstack/react-router";
import type { HouseId } from "@/lib/constants";
import { useToggleReaction } from "@/hooks/useToggleReaction";
import { toast } from "sonner";

interface Post {
  id: string;
  roomId: string;
  author: { name: string; username: string; primaryHouse: HouseId };
  content: string;
  image?: string;
  timestamp: string;
  reactions: number;
  comments: number;
  poll?: { question: string; options: { label: string; votes: number }[] };
}
import { Avatar } from "@/components/common/Avatar";
import { cleanWriteup } from "@/lib/utils";
import { Heart, MessageCircle, Share2 } from "lucide-react";

export function PostCard({ post }: { post: Post }) {
  const toggleReaction = useToggleReaction(post.id);

  const handleLike = async () => {
    try {
      await toggleReaction.mutateAsync({ emoji: "heart" });
    } catch (err: any) {
      toast.error(err.message ?? "Failed to react");
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/rooms/${post.roomId}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard");
    } catch {
      toast.error("Failed to copy link");
    }
  };

  return (
    <article className="rounded-2xl border border-border bg-card p-5 card-shadow">
      <header className="flex items-center gap-3 mb-3">
        <Avatar name={post.author.name} size="md" color="var(--accent)" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-text-primary truncate">{post.author.name}</span>
            <span className="text-xs text-text-secondary truncate">@{post.author.username}</span>
          </div>
          <span className="text-xs text-text-secondary">{post.timestamp}</span>
        </div>
      </header>

      <p className="text-text-primary leading-relaxed whitespace-pre-wrap">{cleanWriteup(post.content)}</p>

      {post.image && (
        <div
          className="mt-4 h-56 rounded-xl"
          style={{ background: `linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 40%, transparent), var(--primary))` }}
        />
      )}

      {post.poll && (
        <div className="mt-4 space-y-2">
          <p className="font-semibold text-text-primary">{post.poll.question}</p>
          {post.poll.options.map((o, i) => {
            const total = post.poll!.options.reduce((a, b) => a + b.votes, 0);
            const pct = Math.round((o.votes / total) * 100);
            return (
              <button key={i} className="relative w-full text-left rounded-xl border border-border p-3 overflow-hidden hover:border-primary transition-colors">
                <div className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
                <div className="relative flex items-center justify-between">
                  <span className="text-sm font-semibold text-text-primary">{o.label}</span>
                  <span className="text-xs font-bold text-primary">{pct}% · {o.votes}</span>
                </div>
              </button>
            );
          })}
          <p className="text-xs text-text-secondary">{post.poll.options.reduce((a, b) => a + b.votes, 0)} votes</p>
        </div>
      )}

      <footer className="mt-4 flex items-center gap-4 text-sm text-text-secondary">
        <button onClick={handleLike} className="inline-flex items-center gap-1.5 hover:text-destructive transition-colors">
          <Heart className="h-4 w-4" /> {post.reactions}
        </button>
        <Link
          to="/rooms/$roomId/posts/$postId"
          params={{ roomId: post.roomId, postId: post.id }}
          className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
        >
          <MessageCircle className="h-4 w-4" /> {post.comments}
        </Link>
        <button onClick={handleShare} className="ml-auto inline-flex items-center gap-1.5 hover:text-primary transition-colors" aria-label="Share">
          <Share2 className="h-4 w-4" />
        </button>
      </footer>
    </article>
  );
}
