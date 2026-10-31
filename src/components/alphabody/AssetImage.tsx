import { useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface AssetImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  fallback: ReactNode;
  loading?: "lazy" | "eager";
}

/**
 * Renders a public asset and swaps to a designed fallback if the file has not
 * been supplied yet. This keeps the layout intact without a broken-image icon.
 */
export function AssetImage({
  src,
  alt,
  className,
  imgClassName,
  fallback,
  loading = "lazy",
}: AssetImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={cn("flex items-center justify-center overflow-hidden", className)}
        role="img"
        aria-label={alt}
      >
        {fallback}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      className={cn(className, imgClassName)}
    />
  );
}
