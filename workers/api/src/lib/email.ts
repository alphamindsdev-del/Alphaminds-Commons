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
