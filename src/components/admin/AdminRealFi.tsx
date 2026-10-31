import { useNavigate } from "@tanstack/react-router";
import { ExternalLink, Gamepad2, ShieldCheck, Video } from "lucide-react";
import { SectionHeader } from "./AdminKit";

/**
 * RealFi (Rel-Fi) game administration panel.
 *
 * Gives Commons admins a single entry point into the RealFi game content
 * management (decks, questions/fictions, clues, how-to-play tutorial) and links
 * straight into the RealFi admin console at /rel-fi/admin, which is where the
 * admin signs in via the embedded AlphaMinds → RealFi SSO and uploads content.
 */
export function AdminRealFi() {
  const navigate = useNavigate();

  const openRealFiAdmin = () => {
    navigate({ to: "/rel-fi/admin" });
  };

  const openRealFiTutorial = () => {
    navigate({ to: "/rel-fi/tutorial" });
  };

  return (
    <div className="space-y-8">
      <SectionHeader
        back
        title="RealFi Game"
        subtitle="Manage the Rel-Fi social deduction game: decks, questions, clues and the how-to-play video."
      />

      <section className="rounded-2xl border border-border bg-card card-shadow p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 shrink-0 rounded-2xl bg-violet-500/10 text-violet-500 flex items-center justify-center">
              <Gamepad2 className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-text-primary">RealFi Games</h3>
              <p className="mt-1 text-sm text-text-secondary">
                The social deduction party game. Admins manage decks, question cards (the fictions
                and their clues), answers, and the tutorial video from inside the RealFi admin
                console.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            <button
              type="button"
              onClick={openRealFiAdmin}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-sm font-bold text-white transition-opacity hover:opacity-90 sm:w-auto"
            >
              <ShieldCheck className="h-4 w-4" />
              Open RealFi Admin
            </button>
            <button
              type="button"
              onClick={openRealFiTutorial}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-bold text-text-primary transition-colors hover:border-violet-500/40 hover:text-violet-500 sm:w-auto"
            >
              <Video className="h-4 w-4" />
              Rel-Fi Tutorial
            </button>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-2 rounded-xl border border-dashed border-border bg-subtle/50 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-text-secondary">
            Admins sign in through the embedded AlphaMinds → RealFi session and land straight in the
            RealFi admin console to upload questions and fictions.
          </p>
          <button
            type="button"
            onClick={openRealFiAdmin}
            className="inline-flex w-full items-center justify-center gap-1.5 text-xs font-bold text-violet-500 hover:underline sm:w-auto"
          >
            Go to RealFi admin <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </section>
    </div>
  );
}
