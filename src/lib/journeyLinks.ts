/**
 * Helpers for journey step links: YouTube extraction (so members get an
 * embedded player) and link classification (YouTube / in-app path / external).
 */

const YT_HOSTS = [
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
];

/**
 * Extract the 11-char video id from any common YouTube URL shape:
 * watch?v=, youtu.be/, /shorts/, /embed/, /live/, /v/, with or without
 * timestamps, tracking params, or mobile hosts. Returns null when the URL
 * is not a recognisable YouTube link.
 */
export function extractYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return null;
  }
  if (!/^https?:$/.test(parsed.protocol)) return null;
  const host = parsed.hostname.toLowerCase();

  if (host === "youtu.be") {
    return validId(parsed.pathname.slice(1).split("/")[0]);
  }
  if (!YT_HOSTS.includes(host)) return null;

  const v = parsed.searchParams.get("v");
  if (v) return validId(v);

  const segments = parsed.pathname.split("/").filter(Boolean); // e.g. ["shorts", "ID"]
  if (segments.length >= 2) {
    const kind = segments[0].toLowerCase();
    if (kind === "shorts" || kind === "embed" || kind === "live" || kind === "v") {
      return validId(segments[1]);
    }
  }
  return null;
}

function validId(id: string | undefined | null): string | null {
  return id && /^[A-Za-z0-9_-]{6,}$/.test(id) ? id : null;
}

export type JourneyLinkKind = "youtube" | "internal" | "external";

export function classifyJourneyLink(url: string | null | undefined): JourneyLinkKind | null {
  if (!url || !url.trim()) return null;
  const trimmed = url.trim();
  if (extractYouTubeId(trimmed)) return "youtube";
  if (trimmed.startsWith("/")) return "internal";
  return "external";
}

/** Normalise a link for href use (adds https:// to bare domains skipped — admins paste full URLs). */
export function journeyLinkHref(url: string): string {
  const trimmed = url.trim();
  if (trimmed.startsWith("/") || /^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}
