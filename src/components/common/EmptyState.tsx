import type { ReactNode } from "react";

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-12 px-6">
      <div className="h-16 w-16 rounded-full bg-subtle flex items-center justify-center text-3xl mb-4">{icon ?? "✨"}</div>
      <h3 className="font-bold text-lg text-text-primary">{title}</h3>
      {body && <p className="text-sm text-text-secondary mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
