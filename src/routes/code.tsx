import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { TodayCodeCard } from "@/components/daily/TodayCodeCard";
import { EmptyState } from "@/components/common/EmptyState";
import { SkeletonCard } from "@/components/common/SkeletonCard";
import { useEffect } from "react";
import { Flame, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/code")({
  component: CodePage,
});

function CodePage() {
  const { member } = useAuthStore();
  const { data: code, isLoading, error } = useQuery({
    queryKey: ["code/today"],
    queryFn: () => apiFetch<any>("/v1/code/today"),
    staleTime: 60000,
  });

  useEffect(() => {
    document.title = code?.title ? `${code.title} · AlphaMinds` : "AlphaMinds";
  }, [code?.title]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <SkeletonCard className="w-64" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen p-8 text-center">
        <p className="text-lg text-muted">Could not load today's Code</p>
      </div>
    );
  }

  if (!code) {
    return (
      <div className="min-h-screen p-8 text-center">
        <EmptyState
          icon={<Flame className="h-5 w-5" />}
          title="No Code Today"
          body="Check back tomorrow for a new passage."
        />
      </div>
    );
  }

  return (
    <div className="prose max-w-none mx-auto p-6">
      <div className="mb-6">
        <Link to="/" className="text-primary hover:text-accent transition-colors">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
      </div>

      <TodayCodeCard
        passage={code.passage}
        title={code.title}
        scheduledDate={code.scheduled_date}
        isPublished={code.is_published}
        onSave={async () => {
          if (!member) { window.location.href = "/login"; return; }
          try {
            await apiFetch(`/v1/code/${code.id}/save`, { method: "POST" });
            toast.success("Saved to your collection");
          } catch (e: any) {
            toast.error(e.message ?? "Failed to save");
          }
        }}
        onShare={async () => {
          const url = window.location.origin + "/code";
          if (typeof navigator !== "undefined" && navigator.share) {
            try {
              await navigator.share({ title: code.title, text: code.passage, url });
              return;
            } catch {
              // dismissed — fall through to clipboard
            }
          }
          try {
            await navigator.clipboard.writeText(`${code.passage}\n\n${url}`);
            toast.success("Copied to clipboard");
          } catch {
            toast.error("Could not share");
          }
        }}
      />
    </div>
  );
}