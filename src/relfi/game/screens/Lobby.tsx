import { motion } from "framer-motion";
import { Play, Users, LogOut, AlertCircle, Eye, Copy, Check, ChevronDown, ArrowRight, ArrowLeft, Share2 } from "lucide-react";
import { useState, useEffect } from "react";
import { useGame } from "../state/store";
import { useAuth } from "../state/auth-store";
import { RoomCodeDisplay } from "../components/RoomCodeDisplay";
import { Avatar } from "../components/Avatar";
import { ConfirmModal } from "../components/ConfirmModal";
import { cn } from "../lib/utils";

export function Lobby() {
  const roomCode = useGame((s) => s.roomCode);
  const players = useGame((s) => s.players);
  const connected = useGame((s) => s.connected);
  const error = useGame((s) => s.error);
  const hostStartGame = useGame((s) => s.hostStartGame);
  const playerReady = useGame((s) => s.playerReady);
  const resetGame = useGame((s) => s.resetGame);
  const user = useAuth((s) => s.user);
  const hostUserId = useGame((s) => s.hostUserId);
  const youReady = players.find((p) => user && p.id === user.id)?.ready ?? false;
  const isHost = user && hostUserId === user.id;
  const mode = useGame((s) => s.mode);
  const isSolo = mode === "solo";
  const nonHostReady = players.filter((p) => p.id !== hostUserId).every((p) => p.ready);
  const minPlayers = isSolo ? 1 : mode === 'seer_skeptic' ? 2 : 3;
  const canStart = !!isHost && players.length >= minPlayers && connected && (isSolo || nonHostReady);
  const [dismissedError, setDismissedError] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [showBroadcast, setShowBroadcast] = useState(false);
  const [step, setStep] = useState<1 | 2>(isSolo ? 2 : 1);

  useEffect(() => {
    if (error) setDismissedError(false)
  }, [error])

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 pt-16 pb-12">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            {isSolo ? "Solo game" : `Waiting room · Step ${step} of 2`}
          </div>
          <h1 className="font-display text-3xl font-bold md:text-4xl">
            {isSolo ? "You're playing solo" : step === 1 ? "Get everyone in" : "Ready up"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setConfirmLeave(true)}
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground hover:bg-card"
          >
            <LogOut className="h-3.5 w-3.5" /> Leave
          </button>
          <div className="hidden text-right md:block">
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Players</div>
            <div className="font-display text-lg">{players.length}</div>
            <div className="text-xs text-muted-foreground">
              {isSolo ? "Just you" : `${minPlayers} needed to start`}
            </div>
          </div>
        </div>
      </div>

      {!isSolo && (
        <div className="mt-6 flex items-center gap-2">
          {[1, 2].map((i) => (
            <div key={i} className="h-1.5 flex-1 rounded-full bg-card overflow-hidden">
              <motion.div
                className="h-full bg-primary"
                initial={false}
                animate={{ width: step >= i ? "100%" : "0%" }}
                transition={{ duration: 0.4 }}
              />
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        open={confirmLeave}
        title="Leave game?"
        message="You will be disconnected from this room."
        onConfirm={() => { setConfirmLeave(false); resetGame() }}
        onCancel={() => setConfirmLeave(false)}
      />

      {error && !dismissedError && (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            onClick={() => setDismissedError(true)}
            className="text-xs font-semibold uppercase tracking-widest hover:underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {step === 1 && !isSolo && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-col"
        >
          <div className="mt-8">
            <RoomCodeDisplay code={roomCode} />
          </div>

          <div className="mt-4">
            <button
              onClick={() => setShowBroadcast(!showBroadcast)}
              className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary hover:underline"
            >
              <Eye className="h-3.5 w-3.5" />
              {showBroadcast ? "Hide Broadcast" : "Share Broadcast"}
              <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showBroadcast && "rotate-180")} />
            </button>
            <div className={cn("overflow-hidden transition-all", !showBroadcast && "max-h-0")}>
              <BroadcastLink roomCode={roomCode} />
            </div>
          </div>

          <div className="mt-8 flex items-center gap-2 rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
            <Users className="h-4 w-4 shrink-0 text-primary" />
            <span className="flex-1">
              {players.length === 0
                ? "Share the code or QR so others can join. You can continue now and watch players arrive."
                : `${players.length} ${players.length === 1 ? "player has" : "players have"} joined.`}
            </span>
          </div>

          <div className="mt-auto pt-10">
            <button
              onClick={() => setStep(2)}
              className="inline-flex w-full items-center justify-center gap-3 rounded-2xl bg-primary-gradient px-8 py-5 font-display text-lg font-bold text-primary-foreground shadow-lock transition-transform hover:scale-[1.01]"
            >
              Continue <ArrowRight className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}

      {(step === 2 || isSolo) && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="flex flex-1 flex-col"
        >
          <div className="mt-8">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Players ({players.length})
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex items-center gap-3 rounded-2xl border bg-card p-3"
                >
                  <Avatar name={p.name} hue={p.avatarHue} connected={p.connected} />
                  <div className="min-w-0">
                    <div className="truncate font-semibold">
                      {p.name}
                      {user && p.id === user.id && <span className="ml-1 text-xs text-primary">(you)</span>}
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                      {p.ready ? "ready" : p.connected ? "getting ready" : "disconnected"}
                    </div>
                  </div>
                </motion.div>
              ))}
              {players.length === 0 && (
                <div className="col-span-2 rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground sm:col-span-3 md:col-span-4">
                  {isSolo ? "Loading the table…" : "No players yet — go back and share your code."}
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto flex flex-col gap-3 pt-10 sm:flex-row">
            {!isSolo && (
              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border px-8 py-5 font-display text-base font-semibold text-muted-foreground hover:bg-card"
              >
                <ArrowLeft className="h-4 w-4" /> Invite
              </button>
            )}
            <button
              onClick={playerReady}
              className={`inline-flex flex-1 items-center justify-center gap-3 rounded-2xl border px-8 py-5 font-display text-base font-bold ${
                youReady ? "bg-primary/20 border-primary text-primary" : "hover:bg-card"
              }`}
            >
              {youReady ? "Ready!" : "Ready up"}
            </button>
            <button
              onClick={hostStartGame}
              disabled={!canStart}
              className="inline-flex flex-1 items-center justify-center gap-3 rounded-2xl bg-primary-gradient px-8 py-5 font-display text-lg font-bold text-primary-foreground shadow-lock transition-transform hover:scale-[1.01] disabled:opacity-40 disabled:cursor-not-allowed disabled:shadow-none"
            >
              <Play className="h-5 w-5" fill="currentColor" />
              {!isHost
                ? players.length < minPlayers
                  ? `Need ${minPlayers - players.length} more`
                  : "Waiting for players…"
                : players.length < minPlayers
                  ? `Need ${minPlayers - players.length} more`
                  : isSolo
                    ? "Start solo game"
                    : "Start the game"}
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
}

function BroadcastLink({ roomCode }: { roomCode: string }) {
  const [copied, setCopied] = useState(false);
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const broadcastUrl = `${origin}/rel-fi/broadcast/${roomCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(broadcastUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
        <Share2 className="h-3.5 w-3.5" />
        Broadcast View
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Share this link to let others watch the game on Zoom, TikTok Live, or any screen share.
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={broadcastUrl}
          className="flex-1 rounded-lg border bg-background/50 px-3 py-2 text-xs font-mono outline-none"
          onClick={(e) => e.currentTarget.select()}
        />
        <button
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold hover:bg-card"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
