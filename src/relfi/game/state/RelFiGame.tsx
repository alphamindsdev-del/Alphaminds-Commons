import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { SoundToggle } from "../components/SoundToggle";
import { Landing } from "../screens/Landing";
import { Lobby } from "../screens/Lobby";
import { RoleReveal } from "../screens/RoleReveal";
import { Statement } from "../screens/Statement";
import { Reveal } from "../screens/Reveal";
import { LeaderboardScreen } from "../screens/LeaderboardScreen";
import { Final } from "../screens/Final";
import { useGame } from "./store";
import { useAuth } from "./auth-store";
import { useEmbeddedAutoLogin } from "./useEmbeddedAuth";
import { relfiSocket } from "../lib/ws";
import { startBackground, stopBackground } from "../audio/sound";
import { cn } from "@relfi/game/lib/utils";
import { Avatar } from "../components/Avatar";
import { ArrowLeft, LogOut, RotateCcw } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";

export type RelFiGameProps = {
  mode?: "standalone" | "embedded";
  containerMode?: "fullscreen" | "contained";
  authToken?: string;
};

export function RelFiGame({
  mode = "standalone",
  containerMode = "fullscreen",
  authToken,
}: RelFiGameProps) {
  const phase = useGame((s) => s.phase);
  const applyWsEvent = useGame((s) => s.applyWsEvent);
  const tryReconnect = useGame((s) => s.tryReconnect);
  const soundOn = useGame((s) => s.soundOn);
  const user = useAuth((s) => s.user);
  const loadSession = useAuth((s) => s.loadSession);
  const initialized = useAuth((s) => s.initialized);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();
  const { authError, retry } = useEmbeddedAutoLogin(mode === "embedded");

  useEffect(() => {
    if (initialized && phase === "landing") {
      tryReconnect();
    }
  }, [initialized]);

  useEffect(() => {
    const unsub = relfiSocket.onServerEvent((event) => {
      applyWsEvent(event);
    });
    return unsub;
  }, [applyWsEvent]);

  // Background music: starts once a game begins (autoplay-safe — it is kicked
  // off from user-gesture screens and retried on sound toggle). Stops when the
  // player returns to landing or leaves the game.
  useEffect(() => {
    if (soundOn && phase !== "landing") {
      startBackground();
    } else {
      stopBackground();
    }
  }, [soundOn, phase]);

  useEffect(() => () => stopBackground(), []);

  const handleBackToCommons = () => {
    navigate({ to: "/" });
  };

  const handleLogout = () => {
    logout();
    navigate({ to: "/" });
  };

  return (
    <div
      className={cn(
        "relfi-root relative isolate bg-hero",
        containerMode === "fullscreen"
          ? "h-[100dvh] w-full overflow-x-hidden overflow-y-auto"
          : "min-h-[720px] overflow-hidden rounded-3xl",
      )}
    >
      <div className="fixed left-4 top-4 z-40 flex items-center gap-2">
        {mode === "embedded" && containerMode === "fullscreen" && (
          <button
            onClick={handleBackToCommons}
            className="p-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:bg-card transition-colors"
            title="Back to The Commons"
            aria-label="Back to The Commons"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        {user && (
          <Avatar
            name={user.display_name}
            hue={user.id.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % 360}
            size={32}
            avatarUrl={user.avatar_url}
          />
        )}
        <SoundToggle />
        {user && mode === "embedded" && containerMode === "fullscreen" && (
          <button
            onClick={handleLogout}
            className="p-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border hover:bg-card transition-colors text-destructive"
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut className="h-5 w-5" />
          </button>
        )}
      </div>

      {authError && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-4 py-2 rounded-xl bg-destructive/90 text-destructive-foreground text-sm backdrop-blur-sm">
          <span>{authError}</span>
          <button
            onClick={retry}
            className="inline-flex items-center gap-1 rounded-lg bg-destructive-foreground/20 px-2 py-1 text-xs font-bold hover:bg-destructive-foreground/30 transition-colors"
          >
            <RotateCcw className="h-3 w-3" />
            Retry
          </button>
        </div>
      )}

      <AnimatePresence mode="wait">
        <motion.div
          key={phase}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.35, ease: [0.2, 0.9, 0.3, 1] }}
        >
          {phase === "landing" && <Landing />}
          {phase === "lobby" && <Lobby />}
          {phase === "role-reveal" && <RoleReveal />}
          {phase === "statement" && <Statement />}
          {phase === "reveal" && <Reveal />}
          {phase === "leaderboard" && <LeaderboardScreen />}
          {phase === "final" && <Final />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
