import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("am-theme") as Theme | null;
  return stored ?? "light";
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(() => getInitial());

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    window.localStorage.setItem("am-theme", t);
  };

  return {
    theme,
    toggle: () => setTheme(theme === "light" ? "dark" : "light"),
    setTheme,
  };
}
