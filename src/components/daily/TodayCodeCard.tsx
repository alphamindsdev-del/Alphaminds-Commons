import { Flame, Shield, Share, Save } from "lucide-react";
import { cn } from "@/lib/utils";

interface TodayCodeCardProps {
  passage: string;
  title: string;
  scheduledDate: string | null;
  isPublished: boolean;
  onSave: () => void;
  onShare: () => void;
}

export const TodayCodeCard = ({
  passage,
  title,
  scheduledDate,
  isPublished,
  onSave,
  onShare,
}: TodayCodeCardProps) => {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-4">
      <div className="px-6 py-4 rounded-2xl bg-card card-shadow border border-border">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-text-secondary uppercase tracking-wider">
              {isPublished ? "Today's Code" : "Unavailable"}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-text-primary">{title}</h2>
            {scheduledDate && (
              <p className="mt-1 text-sm text-text-secondary">
                {scheduledDate}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4 text-accent" />
            <span className="text-xs text-text-secondary">Code</span>
          </div>
        </div>

        <p className="mt-4 text-lg text-text-secondary leading-relaxed whitespace-pre-wrap">
          {passage}
        </p>

        <div className="mt-6 flex flex-col sm:flex-row gap-2">
          <button
            onClick={onSave}
            className="flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <Save className="h-4 w-4" />
            Save
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-2 rounded-md bg-border px-4 py-2 text-sm font-medium text-text-primary hover:bg-border/90 transition-colors">
            <Share className="h-4 w-4" />
            Share
          </button>
        </div>
      </div>
    </div>
  );
};