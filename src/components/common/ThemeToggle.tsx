import { useTheme } from "@/hooks/useTheme";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { theme, toggle } = useTheme();
  return (
    <button
      onClick={toggle}
      aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
      className="inline-flex items-center justify-center rounded-full h-10 w-10 bg-subtle hover:bg-border transition-colors text-text-primary"
    >
      {theme === "light" ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {!compact && <span className="sr-only">Toggle theme</span>}
    </button>
  );
}
