import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import type { HouseId } from "./constants";

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
    .replace(/[\u2014\u2013\u2015\u2012]+|--/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function getMediaUrl(r2Key: string): string {
  const base = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8787";
  return `${base.replace(/\/v1\/?$/, "")}/v1/media/${r2Key}`;
}

export function timeAgo(input?: string | null): string {
  if (!input) return "";
  const then = new Date(input).getTime();
  if (Number.isNaN(then)) return "";
  const mins = Math.floor((Date.now() - then) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(input).toLocaleDateString();
}

export function mapPost(p: any) {
  return {
    id: p.id as string,
    roomId: (p.room_id ?? p.roomId ?? "") as string,
    author: {
      id: (p.author_id ?? p.author?.id) as string | undefined,
      name: (p.display_name ?? p.author?.name ?? p.author?.display_name ?? p.username ?? "Member") as string,
      username: (p.username ?? p.author?.username ?? "") as string,
      primaryHouse: (p.house ?? p.author?.primaryHouse ?? p.author?.primary_house ?? "wellness") as HouseId,
    },
    content: (p.content ?? "") as string,
    image: p.image as string | undefined,
    timestamp: (p.timestamp ?? timeAgo(p.created_at)) as string,
    reactions: (p.reaction_count ?? p.reactions ?? p.likes ?? 0) as number,
    comments: (p.comment_count ?? p.comments ?? p.reply_count ?? 0) as number,
    poll: p.poll,
  };
}

export function mapComment(c: any) {
  return {
    ...c,
    author: {
      id: (c.author_id ?? c.author?.id) as string | undefined,
      name: (c.display_name ?? c.author?.name ?? c.author?.display_name ?? c.username ?? "Member") as string,
      username: (c.username ?? c.author?.username ?? "") as string,
      primaryHouse: (c.primary_house ?? c.house ?? c.author?.primaryHouse ?? "wellness") as HouseId,
    },
  };
}
