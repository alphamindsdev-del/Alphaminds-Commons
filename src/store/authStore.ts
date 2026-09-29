import { create } from "zustand";
import type { Tier } from "../../workers/shared/constants";
import type { HouseId } from "../lib/constants";
import { setApiToken, apiFetch } from "../lib/api";

const AUTH_TOKEN_KEY = "am-auth-token";

interface Member {
  id: string;
  email: string;
  username: string;
  display_name: string;
  avatar_url?: string | null;
  cover_photo_url?: string | null;
  primary_house: HouseId;
  secondary_houses?: string[];
  role: string;
  chapter_id: string | null;
  subscription_tier: Tier;
  email_verified: boolean;
  membership_level?: string;
}

interface AuthState {
  member: Member | null;
  token: string | null;
  subscriptionTier: Tier;
  isAuthenticated: boolean;
  isLoading: boolean;
  setSession: (token: string, member: Member) => void;
  setMember: (member: Member) => void;
  clearSession: () => void;
  setLoading: (loading: boolean) => void;
  restoreSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  member: null,
  token: null,
  subscriptionTier: "free",
  isAuthenticated: false,
  isLoading: true,
  setSession: (token: string, member: Member) => {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    setApiToken(token);
    set({
      token,
      member,
      subscriptionTier: member.subscription_tier,
      isAuthenticated: true,
      isLoading: false,
    });
  },
  setMember: (member: Member) => set({ member }),
  clearSession: () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setApiToken(null);
    set({
      token: null,
      member: null,
      subscriptionTier: "free",
      isAuthenticated: false,
      isLoading: false,
    });
  },
  setLoading: (isLoading: boolean) => set({ isLoading }),
  restoreSession: async () => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY);
    if (!savedToken) {
      set({ isLoading: false });
      return;
    }
    setApiToken(savedToken);
    set({ token: savedToken, isLoading: true });
    try {
      const data = await apiFetch<any>("/v1/auth/me");
      const member: Member = {
        id: data.member?.id ?? data.id,
        email: data.member?.email ?? data.email,
        username: data.member?.username ?? data.username,
        display_name: data.member?.display_name ?? data.display_name,
        avatar_url: data.member?.avatar_url ?? data.avatar_url,
        cover_photo_url: data.member?.cover_photo_url ?? data.cover_photo_url,
        primary_house: data.member?.primary_house ?? data.primary_house,
        secondary_houses: data.member?.secondary_houses ?? data.secondary_houses,
        role: data.member?.role ?? data.role,
        chapter_id: data.member?.chapter_id ?? data.chapter_id,
        subscription_tier: data.member?.subscription_tier ?? data.subscription_tier ?? "free",
        email_verified: data.member?.email_verified ?? data.email_verified ?? false,
        membership_level: data.member?.membership_level ?? data.membership_level ?? "SEEKER",
      };
      set({
        member,
        subscriptionTier: member.subscription_tier,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      setApiToken(null);
      set({ token: null, member: null, isAuthenticated: false, isLoading: false });
    }
  },
}));
