import { EmptyState } from "@/components/common/EmptyState";

export function ComingSoon({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-8">
      <EmptyState
        icon={<span className="text-3xl">🚧</span>}
        title={title}
        body={subtitle ?? "This section is coming soon. Check back shortly."}
      />
    </div>
  );
}
