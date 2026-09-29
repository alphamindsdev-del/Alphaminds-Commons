import { Sprout, Handshake, Dumbbell, Clapperboard, Heart, type LucideIcon } from "lucide-react";

export type HouseId = "becoming" | "connection" | "wellness" | "fun" | "humanity";

export interface House {
  id: HouseId;
  name: string;
  fullName: string;
  icon: LucideIcon;
  color: string;
  colorSoft: string;
  tagline: string;
  description: string;
  dayOfWeek: number; // 0=Sun..6=Sat
  dayLabel: string;
}

export const HOUSES: House[] = [
  {
    id: "becoming",
    name: "Becoming",
    fullName: "House of Becoming",
    icon: Sprout,
    color: "#6366F1",
    colorSoft: "#EEF2FF",
    tagline: "Grow into who you're meant to be.",
    description: "Mindset, learning, and personal mastery. This is where you sharpen your edges.",
    dayOfWeek: 1,
    dayLabel: "Monday Becoming Day",
  },
  {
    id: "connection",
    name: "Connection",
    fullName: "House of Connection",
    icon: Handshake,
    color: "#EC4899",
    colorSoft: "#FDF2F8",
    tagline: "We rise by lifting each other.",
    description: "Relationships, conversation, and meaningful belonging. Show up, be seen, connect.",
    dayOfWeek: 2,
    dayLabel: "Tuesday Connection Day",
  },
  {
    id: "wellness",
    name: "Wellness",
    fullName: "House of Wellness",
    icon: Dumbbell,
    color: "#10B981",
    colorSoft: "#ECFDF5",
    tagline: "Honor the body that carries you.",
    description: "Movement, rest, nourishment, and breath. The body knows the way home.",
    dayOfWeek: 4,
    dayLabel: "Thursday Wellness Day",
  },
  {
    id: "fun",
    name: "Fun",
    fullName: "House of Fun",
    icon: Clapperboard,
    color: "#F59E0B",
    colorSoft: "#FFFBEB",
    tagline: "Joy is a serious practice.",
    description: "Music, dance, games, adventures, and creative expression. Laugh, play, explore, and celebrate life together.",
    dayOfWeek: 5,
    dayLabel: "Friday Fun Day",
  },
  {
    id: "humanity",
    name: "Humanity",
    fullName: "House of Humanity",
    icon: Heart,
    color: "#EF4444",
    colorSoft: "#FEF2F2",
    tagline: "We belong to each other.",
    description: "Service, justice, and showing up for the world beyond yourself.",
    dayOfWeek: 0,
    dayLabel: "Sunday Humanity Day",
  },
];

export const HOUSE_MAP: Record<HouseId, House> = HOUSES.reduce(
  (acc, h) => ({ ...acc, [h.id]: h }),
  {} as Record<HouseId, House>,
);

export function houseOfToday(): House {
  const dow = new Date().getDay();
  return HOUSES.find((h) => h.dayOfWeek === dow) ?? HOUSES[2];
}
