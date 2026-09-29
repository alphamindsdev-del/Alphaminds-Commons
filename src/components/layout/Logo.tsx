import { Link } from "@tanstack/react-router";

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <path
        d="M16 3 L6 29 M16 3 L26 29 M13 23.5 L19 23.5"
        stroke="currentColor"
        strokeWidth="4.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <circle cx="25" cy="25" r="3.2" fill="#C6FA3C" />
    </svg>
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
