import { useState } from "react";
import { Avatar } from "@/components/common/Avatar";
import { useAuthStore } from "@/store/authStore";
import { HOUSE_MAP } from "@/lib/constants";
import { useCreatePost } from "@/hooks/useCreatePost";
import { toast } from "sonner";

export function PostComposer({ roomId, roomName }: { roomId: string; roomName: string }) {
  const { member } = useAuthStore();
  const createPost = useCreatePost(roomId);
  if (!member) return null;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const h = HOUSE_MAP[member.primary_house] ?? Object.values(HOUSE_MAP)[0];

  async function submit() {
    if (!text.trim()) return;
    try {
      await createPost.mutateAsync({ content: text, post_type: "text" });
      toast.success("Post shared with " + roomName);
      setText("");
      setOpen(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create post");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4 card-shadow">
      <div className="flex items-start gap-3">
        <Avatar name={member.display_name} size="md" color={h.color} />
        {open ? (
          <div className="flex-1">
            <textarea
              autoFocus
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Share something with ${roomName}...`}
              rows={3}
              className="w-full bg-transparent text-text-primary placeholder:text-text-secondary outline-none resize-none"
            />
            <div className="flex justify-end gap-2 mt-2">
              <button onClick={() => setOpen(false)} className="text-sm font-semibold px-3 py-1.5 rounded-lg hover:bg-subtle">
                Cancel
              </button>
              <button onClick={submit} className="text-sm font-bold px-4 py-1.5 rounded-lg bg-primary text-white">
                Post
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setOpen(true)}
            className="flex-1 text-left text-text-secondary px-3 py-2.5 rounded-xl bg-subtle hover:bg-border transition-colors"
          >
            Share something with {roomName}...
          </button>
        )}
      </div>
    </div>
  );
}
