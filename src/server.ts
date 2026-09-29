import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";
import apiApp from "../workers/api/src/index";
import { handleDailyContentDelivery } from "../workers/cron/src/handlers/dailyContent.js";
import { handleWeeklyReset } from "../workers/cron/src/handlers/weeklyReset.js";
import { handleStreakAudit } from "../workers/cron/src/handlers/streakAudit.js";
import { handleLeaderboardRecalculation } from "../workers/cron/src/handlers/leaderboard.js";
import { handleD1Backup } from "../workers/cron/src/handlers/d1Backup.js";

declare const globalThis: {
  __env__?: Record<string, unknown>;
};

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!body.includes('"unhandled":true') || !body.includes('"message":"HTTPError"')) {
    return response;
  }

  const captured = consumeLastCapturedError();
  const err =
    captured instanceof Error
      ? captured
      : new Error(`h3 swallowed SSR error. Body:\n${body}`);
  console.error(err);
  return new Response(renderErrorPage(err), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

export async function scheduled(
  event: { cron: string; scheduledTime: number },
  env: unknown,
  ctx: { waitUntil: (promise: Promise<any>) => void }
): Promise<void> {
  const scheduledTime = new Date(event.scheduledTime);
  ctx.waitUntil(
    (async () => {
      switch (event.cron) {
        case '0 5 * * *':
          await handleDailyContentDelivery(env as any, scheduledTime);
          break;
        case '0 0 * * 1':
          await handleWeeklyReset(env as any, scheduledTime);
          break;
        case '30 0 * * *':
          await handleStreakAudit(env as any, scheduledTime);
          break;
        case '0 1 * * *':
          await handleLeaderboardRecalculation(env as any, scheduledTime);
          break;
        case '0 4 * * *':
          await handleD1Backup(env as any, scheduledTime);
          break;
        default:
          console.warn(`No handler registered for cron schedule: ${event.cron}`);
      }
    })()
  );
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    const url = new URL(request.url);
    const bindings = env ?? (globalThis.__env__ ?? {});

    if (url.pathname.startsWith("/v1/") || url.pathname === "/v1") {
      try {
        return await apiApp.fetch(request, bindings, ctx as any);
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err instanceof Error ? err.message : String(err) }),
          { status: 500, headers: { "content-type": "application/json" } },
        );
      }
    }

    try {
      const handler = await getServerEntry();
      const response = await handler.fetch(request, bindings, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(error), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
