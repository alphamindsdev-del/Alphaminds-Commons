import { Env } from '../../shared/types.js';
import { handleDailyContentDelivery } from './handlers/dailyContent.js';
import { handleWeeklyReset } from './handlers/weeklyReset.js';
import { handleStreakAudit } from './handlers/streakAudit.js';
import { handleLeaderboardRecalculation } from './handlers/leaderboard.js';
import { handleImpactScoreRecalculation } from './handlers/impactScore.js';
import { handleWeeklySummary } from './handlers/weeklySummary.js';
import { handleD1Backup } from './handlers/d1Backup.js';

export default {
  async scheduled(event: { cron: string; scheduledTime: number }, env: Env, ctx: { waitUntil: (promise: Promise<any>) => void }): Promise<void> {
    const scheduledTime = new Date(event.scheduledTime);
    ctx.waitUntil(
      (async () => {
        switch (event.cron) {
          case '0 5 * * *': // Daily content delivery
            await handleDailyContentDelivery(env, scheduledTime);
            break;
          case '0 0 * * 1': // Weekly reset
            await handleWeeklyReset(env, scheduledTime);
            break;
          case '30 0 * * *': // Streak audit
            await handleStreakAudit(env, scheduledTime);
            break;
          case '0 1 * * *': // Leaderboard recalculation
            await handleLeaderboardRecalculation(env, scheduledTime);
            break;
          case '0 2 * * 1': // Impact score recalculation
            await handleImpactScoreRecalculation(env, scheduledTime);
            break;
          case '0 3 * * 0': // Weekly summary email
            await handleWeeklySummary(env, scheduledTime);
            break;
          case '0 4 * * *': // D1 backup export
            await handleD1Backup(env, scheduledTime);
            break;
          default:
            console.warn(`No handler registered for cron schedule: ${event.cron}`);
        }
      })()
    );
  }
};
