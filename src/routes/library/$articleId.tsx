import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { EmptyState } from "@/components/common/EmptyState";

export const Route = createFileRoute("/library/$articleId")({
  loader: async ({ params }) => params,
  head: () => ({ meta: [{ title: `Library · AlphaMinds` }] }),
  component: ArticleDetailPage,
});

function ArticleDetailPage() {
  const { articleId } = Route.useParams();
  const { data: article, isLoading, isError } = useQuery({
    queryKey: ["library-article", articleId],
    queryFn: () => apiFetch<any>(`/v1/library/${articleId}`),
    enabled: !!articleId,
    retry: false,
  });

  if (isLoading) return <div className="p-8 text-center text-text-secondary">Loading...</div>;

  if (isError || !article) {
    return (
      <EmptyState
        icon={<BookOpen className="h-6 w-6" />}
        title="Article not found"
        body="This article may have been unpublished or removed."
        action={<Link to="/library" className="rounded-xl bg-primary text-primary-foreground text-sm font-bold px-5 py-2.5 inline-block">Back to Library</Link>}
      />
    );
  }

  const body = (article.body ?? "") as string;

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <Link to="/library" className="inline-flex items-center gap-1 text-sm font-semibold text-text-secondary hover:text-text-primary transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </Link>
      <article>
        {article.cover_r2_key && (
          <div className="relative overflow-hidden rounded-3xl">
            <img src={`/v1/media/${article.cover_r2_key}`} alt={article.title} className="w-full max-h-80 object-cover" />
          </div>
        )}
        <div className="flex items-center gap-2 mb-4 mt-6">
          {article.read_time_min && (
            <span className="text-xs text-text-secondary flex items-center gap-1">
              <Clock className="h-3 w-3" /> {article.read_time_min} min read
            </span>
          )}
        </div>
        <h1 className="text-display font-semibold text-4xl sm:text-5xl tracking-tighter text-text-primary leading-[1.02]">{article.title}</h1>
        {article.author_name && <p className="mt-2 text-sm text-text-secondary font-semibold">By {article.author_name}</p>}
        {article.excerpt && (
          <p className="mt-5 text-lg text-text-secondary leading-relaxed border-l-2 pl-4" style={{ borderColor: "var(--accent)" }}>{article.excerpt}</p>
        )}
        <div className="mt-8 space-y-4">
          {body.split("\n").filter((p: string) => p.trim()).map((p: string, i: number) => (
            <p
              key={i}
              className={i === 0 ? "first-letter:font-display first-letter:font-bold first-letter:text-5xl first-letter:float-left first-letter:mr-3 first-letter:mt-1 text-text-primary leading-relaxed" : "text-text-primary leading-relaxed"}
            >
              {p}
            </p>
          ))}
        </div>
      </article>
    </div>
  );
}
