import { useEffect, useState } from "react";

export type Theme = "light" | "dark";

function getInitial(): Theme {
  if (typeof window === "undefined") return "light";
  const stored = window.localStorage.getItem("am-theme") as Theme | null;
  return stored ?? "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const t = getInitial();
    setTheme(t);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.documentElement.classList.toggle("dark", theme === "dark");
    window.localStorage.setItem("am-theme", theme);
  }, [theme]);

  return {
    theme,
    toggle: () => setTheme((t) => (t === "light" ? "dark" : "light")),
    setTheme,
  };
}
