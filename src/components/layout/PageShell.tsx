import { useState, type ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { MobileSidebar } from "./MobileSidebar";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuthStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = pathname.startsWith("/admin");
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      {!isAdmin && <Sidebar />}
      {!isAdmin && <TopBar onMenuClick={() => setMobileOpen(true)} />}
      {!isAdmin && <MobileSidebar open={mobileOpen} onClose={() => setMobileOpen(false)} />}
      <main className={isAdmin ? "pb-0" : isAuthenticated ? "md:pl-[64px] lg:pl-[240px] pb-24 md:pb-8" : "pb-24 md:pb-8"}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className={isAdmin ? "" : "max-w-6xl mx-auto px-4 sm:px-6 lg:px-10 py-8 sm:py-10"}
        >
          {children}
        </motion.div>
      </main>
      {!isAdmin && <BottomNav />}
    </div>
  );
}
