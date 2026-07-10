import { Env } from '../../../shared/types.js';
import { formatDate, startCronLog, completeCronLog, failCronLog } from '../lib.js';

export async function handleD1Backup(env: Env, scheduledTime: Date): Promise<void> {
  const logId = await startCronLog(env, 'd1_backup', scheduledTime);
  try {
    const today = formatDate(scheduledTime);
    let fileSize = 0;

    if (env.CF_ACCOUNT_ID && env.CF_API_TOKEN && env.DB_ID) {
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${env.DB_ID}/export`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.CF_API_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ output_format: 'sql' }),
        }
      );

      if (res.ok) {
        const data = await res.json<{ success: boolean; result: { filename: string; file_size: number; upload_url: string } }>();
        if (data.success && data.result) {
          const downloadRes = await fetch(data.result.upload_url);
          if (downloadRes.ok) {
            const blob = await downloadRes.blob();
            await env.BACKUP_BUCKET.put(`d1-backups/${today}.sql`, blob);
            fileSize = data.result.file_size;
          }
        }
      } else {
        const text = await res.text();
        console.error(`D1 backup API call failed: ${text}`);
        await env.ALPHAMINDS_SESSIONS.put(
          `admin:alert:d1_backup:${today}`,
          JSON.stringify({ job: 'd1_backup', error: `API call failed: ${text}`, at: scheduledTime.toISOString() }),
          { expirationTtl: 172800 }
        );
      }
    }

    await completeCronLog(env, logId, fileSize);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    await env.ALPHAMINDS_SESSIONS.put(
      `admin:alert:d1_backup:${formatDate(scheduledTime)}`,
      JSON.stringify({ job: 'd1_backup', error: String(error), at: scheduledTime.toISOString() }),
      { expirationTtl: 172800 }
    );
    throw error;
  }
}
