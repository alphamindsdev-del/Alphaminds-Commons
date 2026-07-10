import { Link } from "@tanstack/react-router";
import logo from "@/assets/alphaminds-logo.svg";

export function Logo({ withText = true, size = "md" }: { withText?: boolean; size?: "sm" | "md" | "lg" }) {
  const h = { sm: "h-7", md: "h-9", lg: "h-12" }[size];
  return (
    <Link to="/" className="inline-flex items-center gap-2 group">
      <img src={logo} alt="AlphaMinds" className={`${h} w-auto object-contain`} />
      {withText && (
        <span className="sr-only">AlphaMinds Commons</span>
      )}
    </Link>
  );
}
