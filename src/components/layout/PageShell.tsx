import type { ReactNode } from "react";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";
import { motion } from "framer-motion";
import { useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/store/authStore";

export function PageShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { isAuthenticated } = useAuthStore();
  return (
    <div className="min-h-dvh bg-background text-text-primary">
      <Sidebar />
      <TopBar />
      <main className={isAuthenticated ? "md:pl-[64px] lg:pl-[240px] pb-24 md:pb-8" : "pb-24 md:pb-8"}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
          className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
        >
          {children}
        </motion.div>
      </main>
      <BottomNav />
    </div>
  );
}
