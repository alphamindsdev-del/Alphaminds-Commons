import { createFileRoute, Link, Navigate } from "@tanstack/react-router";
import { ShieldAlert } from "lucide-react";
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

export const Route = createFileRoute("/admin")({
  head: () => ({ meta: [{ title: "Admin · AlphaMinds" }] }),
  component: AdminPage,
});

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "daily", label: "Daily Content" },
  { id: "code", label: "The Code" },
  { id: "events", label: "Events" },
  { id: "rooms", label: "Rooms" },
  { id: "library", label: "Library" },
  { id: "plans", label: "Plans" },
  { id: "journey", label: "Journey" },
  { id: "chapters", label: "Chapters" },
  { id: "members", label: "Members" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function AdminPage() {
  const { isAuthenticated, isLoading, member } = useAuthStore();
  const [tab, setTab] = useState<TabId>("overview");

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
            Your account doesn't have administrator permissions. If you believe this is a mistake, contact a founder.
          </p>
          <Link to="/" className="mt-6 inline-flex rounded-xl bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">
            Back to Commons
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh">
      <div className="sticky top-0 z-30 border-b border-border bg-background/90 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center gap-3">
          <div className="mr-auto">
            <h1 className="font-black text-xl text-text-primary">Admin Dashboard</h1>
            <p className="text-xs text-text-secondary">Full control over content, events and members.</p>
          </div>
          <Link
            to="/rel-fi/admin"
            className="rounded-full bg-violet-500/10 text-violet-400 px-3 py-1.5 text-xs font-black uppercase tracking-widest hover:bg-violet-500/20 transition-colors"
          >
            Rel-Fi Admin
          </Link>
          <Link
            to="/"
            className="rounded-full border border-border px-3 py-1.5 text-xs font-black uppercase tracking-widest text-text-secondary hover:text-text-primary hover:border-primary/40 transition-colors"
          >
            Back to Commons
          </Link>
        </div>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-3 flex gap-2 overflow-x-auto">
          {TABS.map((t) => (
            <TabButton key={t.id} active={tab === t.id} onClick={() => setTab(t.id)}>
              {t.label}
            </TabButton>
          ))}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {tab === "overview" && <AdminOverview />}
        {tab === "daily" && <AdminDailyContent />}
        {tab === "code" && <AdminCode />}
        {tab === "events" && <AdminEvents />}
        {tab === "rooms" && <AdminRooms />}
        {tab === "library" && <AdminLibrary />}
        {tab === "plans" && <AdminPlans />}
        {tab === "journey" && <AdminJourney />}
        {tab === "chapters" && <AdminChapters />}
        {tab === "members" && <AdminMembers />}
      </main>
    </div>
  );
}
