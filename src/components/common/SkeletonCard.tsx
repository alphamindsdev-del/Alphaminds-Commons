export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`rounded-2xl border border-border bg-card p-4 animate-pulse ${className}`}>
      <div className="h-4 w-1/3 rounded bg-subtle mb-3" />
      <div className="h-3 w-full rounded bg-subtle mb-2" />
      <div className="h-3 w-2/3 rounded bg-subtle" />
    </div>
  );
}
