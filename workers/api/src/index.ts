import { Hono } from 'hono';
import { Env } from '../../shared/types.js';
import { authRouter } from './routes/auth.js';
import { membersRouter } from './routes/members.js';
import { housesRouter } from './routes/houses.js';
import { roomsRouter, chapterRoomsRouter } from './routes/rooms.js';
import { postsRouter, roomPostsRouter } from './routes/posts.js';
import { eventsRouter, chapterEventsRouter } from './routes/events.js';
import { challengesRouter, chapterLeaderboardRouter } from './routes/challenges.js';
import { dailyRouter } from './routes/daily.js';
import { notificationsRouter } from './routes/notifications.js';
import { mediaRouter } from './routes/media.js';
import { adminRouter } from './routes/admin.js';

const app = new Hono<{ Bindings: Env }>();

// CORS — allow localhost dev servers and production origins
app.use('*', async (c, next) => {
  const origin = c.req.header('Origin');
  if (origin && (/^http:\/\/localhost:\d+$/.test(origin) || origin === 'https://app.alphaminds.com' || origin === 'https://commons.alphaminds.com')) {
    c.header('Access-Control-Allow-Origin', origin);
    c.header('Access-Control-Allow-Credentials', 'true');
  }
  c.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  c.header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With');
  c.header('Access-Control-Max-Age', '86400');
  if (c.req.method === 'OPTIONS') return c.body(null, 204);
  await next();
});

app.onError((err, c) => {
  console.error('Hono error:', err);
  return c.json({ error: err instanceof Error ? err.message : String(err), stack: err instanceof Error ? err.stack : undefined }, 500);
});

// Mount top-level resource routes
app.route('/v1/auth', authRouter);
app.route('/v1/me', membersRouter);
app.route('/v1/me/notifications', notificationsRouter);
app.route('/v1/members', membersRouter);
app.route('/v1/houses', housesRouter);
app.route('/v1/rooms', roomsRouter);
app.route('/v1/posts', postsRouter);
app.route('/v1/events', eventsRouter);
app.route('/v1/challenges', challengesRouter);
app.route('/v1/daily-content', dailyRouter);
app.route('/v1/media', mediaRouter);
app.route('/v1/admin', adminRouter);

// Mount chapter-scoped routes
app.route('/v1/chapters', chapterRoomsRouter);
app.route('/v1/chapters', chapterEventsRouter);
app.route('/v1/chapters', chapterLeaderboardRouter);

// Mount room/post sub-routes
app.route('/v1/rooms', roomPostsRouter);

app.get('/', (c) => {
  return c.json({ name: 'AlphaMinds Commons API', version: '1.0' });
});

export default app;
