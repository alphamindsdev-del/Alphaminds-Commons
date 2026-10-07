import { Link } from "@tanstack/react-router";
import logoMark from "@/assets/alphaminds-logo.png";

function LogoMark({ className }: { className?: string }) {
  return (
    <img
      src={logoMark}
      alt=""
      aria-hidden="true"
      className={`object-contain ${className ?? ""}`}
    />
  );
}

export function Logo({ withText = true, size = "md" }: { withText?: boolean; size?: "sm" | "md" | "lg" }) {
  const mark = { sm: "h-7 w-7", md: "h-8 w-8", lg: "h-10 w-10" }[size];
  const text = { sm: "text-base", md: "text-lg", lg: "text-2xl" }[size];
  return (
    <Link to="/" className="inline-flex items-center gap-2 group text-text-primary" aria-label="AlphaMinds Commons">
      <LogoMark className={`${mark} shrink-0 transition-transform group-hover:scale-105`} />
      {withText && (
        <span className={`${text} font-display font-semibold tracking-tight`}>AlphaMinds</span>
      )}
    </Link>
  );
}
