import { createFileRoute, Link } from "@tanstack/react-router";
import { apiFetch } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, ArrowRight, Loader2, Clock } from "lucide-react";
import { PageHeader } from "@/components/common/PageHeader";

export const Route = createFileRoute("/library/")({
  head: () => ({ meta: [{ title: "Library · AlphaMinds" }] }),
  component: LibraryPage,
});

function LibraryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["library"],
    queryFn: () => apiFetch<any>("/v1/library"),
  });

  const articles = data?.data ?? [];

  return (
    <div className="space-y-10 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="The Library"
        title="Read, Reflect, Return"
        subtitle="Curated guides, reflections, and practices from the AlphaMinds community — written to be read slowly and put into practice."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : articles.length === 0 ? (
        <div className="rounded-3xl border-2 border-dashed border-border bg-card/50 p-12 text-center">
          <BookOpen className="h-10 w-10 text-text-secondary mx-auto mb-3" />
          <h3 className="font-bold text-lg text-text-primary">No articles yet</h3>
          <p className="text-sm text-text-secondary mt-1">Articles will appear here once published by the admin team.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-5">
          {articles.map((a: any) => {
            return (
              <article
                key={a.id}
                className="group relative overflow-hidden rounded-3xl border border-border bg-card card-shadow card-glow"
              >
                <div
                  className="relative h-44 overflow-hidden"
                  style={{ background: a.cover_r2_key ? `url(/v1/media/${a.cover_r2_key}) center/cover` : `linear-gradient(135deg, color-mix(in srgb, var(--accent) 40%, transparent), color-mix(in srgb, var(--accent) 13%, transparent) 60%, var(--primary-dark))` }}
                >
                  {!a.cover_r2_key && (
                    <span className="absolute -bottom-6 -right-1 font-display font-bold text-[8rem] leading-none text-white/[0.16] tracking-tighter select-none">
                      {(a.title ?? "A").charAt(0).toUpperCase()}
                    </span>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
                </div>
                <div className="p-5">
                  <h2 className="text-display font-semibold text-2xl tracking-tighter text-text-primary leading-tight group-hover:text-primary transition-colors">{a.title}</h2>
                  <p className="mt-2 text-sm text-text-secondary leading-relaxed line-clamp-2">{a.excerpt ?? (a.body ?? "").slice(0, 150)}</p>
                  <div className="mt-4 flex items-center justify-between text-xs text-text-secondary">
                    <span className="font-semibold">{a.author_name || "AlphaMinds"}</span>
                    {a.read_time_min && (
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" /> {a.read_time_min} min read</span>
                    )}
                  </div>
                  <Link
                    to="/library/$articleId"
                    params={{ articleId: a.id }}
                    className="mt-4 inline-flex items-center gap-1 text-sm font-bold text-primary group-hover:gap-2 transition-all"
                  >
                    Read Article <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
