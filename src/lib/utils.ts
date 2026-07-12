import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function cleanWriteup(text: string): string {
  return text
    .replace(/\u2014|\u2013|--/g, ", ")
    .replace(/\u2015|\u2012/g, " ")
    .trim();
}
