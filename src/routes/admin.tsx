import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { Brain, Globe, HeartPulse, LayoutDashboard, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import { TabButton } from "@/components/admin/AdminKit";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminDailyContent } from "@/components/admin/AdminDailyContent";
import { AdminCode } from "@/components/admin/AdminCode";
import { AdminEvents } from "@/components/admin/AdminEvents";
import { AdminRooms } from "@/components/admin/AdminRooms";
import { AdminLibrary } from "@/components/admin/AdminLibrary";
import { AdminPlans } from "@/components/admin/AdminPlans";
import { AdminJourney } from "@/components/admin/AdminJourney";
import { AdminChapters } from "@/components/admin/AdminChapters";
import { AdminMembers } from "@/components/admin/AdminMembers";
import { AdminClinic } from "@/components/admin/AdminClinic";
import { AdminHealthAssessment } from "@/components/admin/AdminHealthAssessment";
import { AdminRealFi } from "@/components/admin/AdminRealFi";

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin | The Commons" }] }),
  component: AdminPage,
});

type AdminFocus = "general" | "mind" | "body" | "world";

const TABS = [
  { id: "overview", label: "Overview", focus: "general" },
  { id: "members", label: "Members", focus: "general" },
  { id: "daily", label: "Daily Content", focus: "mind" },
  { id: "code", label: "The Code", focus: "mind" },
  { id: "events", label: "Events", focus: "mind" },
  { id: "rooms", label: "Rooms", focus: "mind" },
  { id: "library", label: "Library", focus: "mind" },
  { id: "plans", label: "Plans", focus: "mind" },
  { id: "journey", label: "Journey", focus: "mind" },
  { id: "chapters", label: "Chapters", focus: "mind" },
  { id: "beatlift", label: "BeatLift", focus: "body" },
  { id: "assessment", label: "Health Assessment", focus: "body" },
  { id: "clinic", label: "Clinic Requests", focus: "body" },
  { id: "world", label: "AlphaWorld", focus: "world" },
  { id: "relfi", label: "RealFi Game", focus: "world" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const FOCUS_TABS: Record<AdminFocus, readonly TabId[]> = {
  general: ["overview", "members"],
  mind: ["daily", "code", "events", "rooms", "library", "plans", "journey", "chapters"],
  body: ["beatlift", "assessment", "clinic"],
  world: ["events", "rooms", "library", "relfi"],
};

const FOCUS_LABELS: Record<AdminFocus, string> = {
  general: "General",
  mind: "AlphaMind",
  body: "AlphaBody",
  world: "AlphaWorld",
};

const FOCUS_ICONS: Record<AdminFocus, typeof LayoutDashboard> = {
  general: LayoutDashboard,
  mind: Brain,
  body: HeartPulse,
  world: Globe,
};

function AdminPage() {
  const { isAuthenticated, isLoading, member } = useAuthStore();
  const [tab, setTab] = useState<TabId>("overview");
  const [focus, setFocus] = useState<AdminFocus>("general");

  const tabs = FOCUS_TABS[focus];
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const role = member?.role ?? "";
  if (role !== "admin" && role !== "founder") {
    return (
      <div className="min-h-[70vh] flex items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto h-14 w-14 rounded-2xl bg-destructive/10 text-destructive flex items-center justify-center">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-text-primary">Admin access required</h1>
          <p className="mt-2 text-sm text-text-secondary">
            Your account doesn't have administrator permissions. If you believe this is a mistake,
            contact a founder.
          </p>
          <Link
            to="/"
            className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground"
          >
            Back to Commons
          </Link>
        </div>
      </div>
    );
  }

  const renderTab = (id: TabId) => {
    switch (id) {
      case "overview": {
        return <AdminOverview />;
      }
      case "members": {
        return <AdminMembers />;
      }
      case "daily": {
        return <AdminDailyContent />;
      }
      case "code": {
        return <AdminCode />;
      }
      case "events": {
        return <AdminEvents />;
      }
      case "rooms": {
        return <AdminRooms />;
      }
      case "library": {
        return <AdminLibrary />;
      }
      case "plans": {
        return <AdminPlans />;
      }
      case "journey": {
        return <AdminJourney />;
      }
      case "chapters": {
        return <AdminChapters />;
      }
      case "beatlift": {
        return (
          <AdminEvents
            title="BeatLift & Movement"
            subtitle="Movement, strength, and community sessions."
          />
        );
      }
      case "assessment": {
        return <AdminHealthAssessment />;
      }
      case "clinic": {
        return <AdminClinic />;
      }
      case "world": {
        return <AdminEvents />;
      }
      case "relfi": {
        return <AdminRealFi />;
      }
      default: {
        return <AdminOverview />;
      }
    }
  };

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <h1 className="font-black text-xl text-text-primary">Admin Dashboard</h1>
              <p className="text-xs text-text-secondary">Full control over content, events and members.</p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <Link
                to="/rel-fi/admin"
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-full bg-violet-500/10 text-violet-400 px-4 py-2.5 text-xs font-black uppercase tracking-widest hover:bg-violet-500/20 transition-colors sm:w-auto"
              >
                RealFi Game Admin
              </Link>
              <Link
                to="/"
                className="inline-flex w-full items-center justify-center rounded-full border border-border px-4 py-2.5 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors sm:w-auto"
              >
                Back to Commons
              </Link>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            {(Object.keys(FOCUS_TABS) as AdminFocus[]).map((focusOption) => {
              const Icon = FOCUS_ICONS[focusOption];
              const selected = focus === focusOption;
              return (
                <button
                  key={focusOption}
                  type="button"
                  onClick={() => {
                    setFocus(focusOption);
                    setTab(FOCUS_TABS[focusOption][0]);
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold transition-colors ${
                    selected
                      ? "bg-primary text-primary-foreground"
                      : "border border-border text-text-secondary hover:text-text-primary hover:border-primary/40"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {FOCUS_LABELS[focusOption]}
                </button>
              );
            })}
          </div>

          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <TabButton key={t} active={tab === activeTab} onClick={() => setTab(t)}>
                {TABS.find((item) => item.id === t)?.label ?? t}
              </TabButton>
            ))}
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{renderTab(activeTab)}</main>
    </div>
  );
}
