import webpush from 'web-push';
import { Env } from '../../../shared/types.js';

export async function sendPushNotification(
  env: Env,
  subscription: webpush.PushSubscription,
  title: string,
  body: string,
  url?: string
): Promise<void> {
  webpush.setVapidDetails(
    'mailto:admin@alphaminds.com',
    env.WEB_PUSH_VAPID_PUBLIC,
    env.WEB_PUSH_VAPID_PRIVATE,
  );
  try {
    await webpush.sendNotification(subscription, JSON.stringify({ title, body, url }));
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}
