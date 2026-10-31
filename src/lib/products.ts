import type { LucideIcon } from "lucide-react";
import { Brain, Globe, HeartPulse } from "lucide-react";

export type ProductId = "body" | "mind" | "world";

export interface ProductDefinition {
  id: ProductId;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  route: "/" | "/alpha-body" | "/alpha-world";
  icon: LucideIcon;
  image: string;
  color: string;
  soft: string;
  available: boolean;
}

export const PRODUCTS: ProductDefinition[] = [
  {
    id: "body",
    name: "Alpha Body",
    shortName: "AlphaBody",
    tagline: "Move well. Feel alive.",
    description:
      "Physical practice, vitality and embodied wellbeing — with the Wellness Clinic at its heart.",
    route: "/alpha-body",
    icon: HeartPulse,
    image: "/product-body.webp",
    color: "#1F7A4D",
    soft: "#E7F5EC",
    available: true,
  },
  {
    id: "mind",
    name: "Alpha Mind",
    shortName: "AlphaMind",
    tagline: "Grow your mind. Find your people.",
    description: "Houses, chapters, daily practice, events, challenges, the library and Rel-Fi.",
    route: "/",
    icon: Brain,
    image: "/product-mind.webp",
    color: "#2563EB",
    soft: "#E8F0FE",
    available: true,
  },
  {
    id: "world",
    name: "Alpha World",
    shortName: "AlphaWorld",
    tagline: "Explore. Connect. Play.",
    description: "Shared spaces, real-world chapters and collective adventures. Opening soon.",
    route: "/alpha-world",
    icon: Globe,
    image: "/product-world.webp",
    color: "#5B4FE0",
    soft: "#EEECFD",
    available: true,
  },
];

export const PRODUCTS_BY_ID = Object.fromEntries(
  PRODUCTS.map((product) => [product.id, product]),
) as Record<ProductId, ProductDefinition>;

export function productForPath(pathname: string): ProductDefinition {
  if (
    pathname.startsWith("/alpha-body") ||
    pathname.startsWith("/wellness-clinic") ||
    pathname.startsWith("/beatlift") ||
    pathname.startsWith("/health-")
  ) {
    return PRODUCTS_BY_ID.body;
  }
  if (pathname.startsWith("/alpha-world")) {
    return PRODUCTS_BY_ID.world;
  }
  return PRODUCTS_BY_ID.mind;
}
