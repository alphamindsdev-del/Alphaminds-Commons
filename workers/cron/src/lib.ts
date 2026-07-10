import { Env } from '../../shared/types.js';

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

export async function startCronLog(env: Env, jobName: string, scheduledAt: Date): Promise<string> {
  const result = await env.DB.prepare(`
    INSERT INTO cron_execution_logs (job_name, scheduled_at, status)
    VALUES (?, ?, 'running')
    RETURNING id
  `).bind(jobName, scheduledAt.toISOString()).first<{ id: string }>();
  return result!.id;
}

export async function completeCronLog(env: Env, logId: string, recordsProcessed: number): Promise<void> {
  await env.DB.prepare(`
    UPDATE cron_execution_logs
    SET status = 'success', completed_at = CURRENT_TIMESTAMP, records_processed = ?
    WHERE id = ?
  `).bind(recordsProcessed, logId).run();
}

export async function failCronLog(env: Env, logId: string, errorMessage: string): Promise<void> {
  await env.DB.prepare(`
    UPDATE cron_execution_logs
    SET status = 'failed', completed_at = CURRENT_TIMESTAMP, error_message = ?
    WHERE id = ?
  `).bind(errorMessage, logId).run();
}
