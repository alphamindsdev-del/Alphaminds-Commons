import { Env } from '../../../shared/types.js';

export async function sendOtpEmail(env: Env, to: string, otp: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AlphaMinds <noreply@alphaminds.com>',
      to: [to],
      subject: 'Your AlphaMinds OTP Code',
      html: `<p>Your one-time password is: <strong>${otp}</strong></p><p>This code expires in 10 minutes.</p>`,
    }),
  });
  if (!response.ok) {
    console.error('Failed to send email:', await response.text());
  }
}

export async function sendDataExportEmail(env: Env, to: string, data: unknown): Promise<void> {
  const json = JSON.stringify(data, null, 2);
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AlphaMinds <noreply@alphaminds.com>',
      to: [to],
      subject: 'Your AlphaMinds Data Export',
      html: '<p>Your requested data export is attached as a JSON file.</p><p>If you did not request this, you can ignore this email.</p>',
      attachments: [
        { filename: 'alphaminds-data-export.json', content: toBase64(json) },
      ],
    }),
  });
  if (!response.ok) {
    const text = await response.text();
    console.error('Failed to send data export email:', text);
    throw new Error(`Email send failed: ${response.status}`);
  }
}

function toBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export async function sendWeeklySummaryEmail(env: Env, to: string, summaryHtml: string): Promise<void> {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'AlphaMinds <noreply@alphaminds.com>',
      to: [to],
      subject: 'Your AlphaMinds Weekly Summary',
      html: summaryHtml,
    }),
  });
  if (!response.ok) {
    console.error('Failed to send weekly summary:', await response.text());
  }
}
