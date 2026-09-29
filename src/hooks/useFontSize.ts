import { useEffect, useState } from "react";

export type FontSize = "sm" | "md" | "lg";

const SIZES: Record<FontSize, string> = { sm: "15px", md: "16px", lg: "17.5px" };

export function applyFontSize(size: FontSize) {
  if (typeof document === "undefined") return;
  document.documentElement.style.fontSize = SIZES[size] ?? SIZES.md;
}

function getStored(): FontSize {
  if (typeof window === "undefined") return "md";
  const stored = window.localStorage.getItem("am-font-size") as FontSize | null;
  return stored && stored in SIZES ? stored : "md";
}

export function useFontSize() {
  const [fontSize, setFontSizeState] = useState<FontSize>(() => getStored());

  useEffect(() => {
    applyFontSize(fontSize);
  }, [fontSize]);

  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
    window.localStorage.setItem("am-font-size", size);
  };

  return { fontSize, setFontSize };
}
