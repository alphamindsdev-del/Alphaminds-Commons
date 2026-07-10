# FEATURES.md
# AlphaMinds Commons — Feature Implementation Map
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. How to Read This Document

Every feature is mapped to:
- The **D1 tables** it reads and writes
- The **Worker endpoints** it calls
- The **KV keys** it reads or writes
- The **R2 operations** it performs
- The **Cron Jobs** it depends on
- The **subscription tier** required
- The **MVP phase** it belongs to
- What **must NOT be built now** to protect the Phase 1 launch timeline

Features are grouped by product area. Each entry is a complete picture of that
feature's technical footprint — sufficient for an AI coding agent to implement
the feature end-to-end without asking for clarification.

---

## 1. Authentication & Onboarding

### 1.1 Registration & Login

**Phase:** MVP 1  
**Tier:** Free (no auth required)

| Layer | Details |
|---|---|
| D1 Tables | `members` (INSERT), `member_stats` (INSERT), `member_house_selections` (INSERT), `member_chapter_history` (INSERT, reason='signup') |
| Worker Endpoints | `POST /v1/auth/register`, `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/auth/me` |
| KV Reads/Writes | Write: `session:{token}` (TTL 7 days). Read: same key on every authenticated request |
| R2 | None at registration. Avatar upload is a separate operation |
| Cron | None |

**MVP 1 scope:**
- Email/password only
- Basic profile fields: name, username, country, age, gender (optional), interests (house selections)
- Onboarding flow: choose primary house → choose up to 2 secondary houses → choose rooms

**Must NOT build now:**
- Google OAuth (Phase 2)
- Social login (Phase 3+)
- Invite-only registration flow (not in product spec)

**Technical debt flag:** The `push_token` field on members stores the full Web Push
subscription JSON as a TEXT column. At scale, if a member uses multiple devices,
this will need to become a `member_push_tokens` table (1:many). For MVP 1 with
one token per member, this is acceptable. Document for remediation at Phase 2.

---

### 1.2 Password Reset (OTP)

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `members` (UPDATE: `session_revoked_at` after successful reset) |
| Worker Endpoints | `POST /v1/auth/forgot-password`, `POST /v1/auth/verify-otp`, `POST /v1/auth/reset-password` |
| KV Reads/Writes | Write: `otp:{email}` (TTL 600s), `otp:attempts:{email}` (TTL 600s), `reset:{token}` (TTL 900s). Delete: all sessions for member via `session_revoked_at` pattern |
| R2 | None |
| Email | Resend: send OTP to member's email |

---

### 1.3 House & Room Selection (Onboarding)

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `member_house_selections` (INSERT/UPSERT), `members` (UPDATE: `primary_house`), `room_memberships` (INSERT) |
| Worker Endpoints | `PUT /v1/me/houses`, `POST /v1/rooms/:roomId/join` |
| KV | Update `session:{token}` to reflect new primary_house |
| R2 | None |

**Onboarding flow sequence:**
1. After registration, redirect to `/register/onboarding`
2. Step 1: Select Primary House (required, 1 of 5)
3. Step 2: Select Secondary Houses (optional, up to 2)
4. Step 3: Recommended rooms shown based on house selections (auto-join on "Get Started")
5. Redirect to Home

---

## 2. Member Profiles

### 2.1 My Profile

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `members` (READ), `member_stats` (READ), `member_house_selections` (READ), `member_badges` (READ + JOIN badges), `challenge_participations` (READ, recent completions) |
| Worker Endpoints | `GET /v1/me/profile`, `PATCH /v1/me/profile`, `PUT /v1/me/avatar` |
| KV | Read session to get member_id. After profile update: no KV invalidation needed (profile data not cached in KV) |
| R2 | Avatar upload: PUT to `members/{member_id}/avatar/original.{ext}` |

**Profile page displays:**
- Avatar, display name, username, bio, chapter, primary house
- Five House score bars (from member_stats)
- Current streak, total points
- Badges earned
- Challenge completions count
- Events attended count
- Rooms joined

**Must NOT build now:**
- Verified badges / Blue tick system
- Follower/following social graph
- Public activity feed on profile

---

### 2.2 Member Profile (Other Member)

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `members` (READ, exclude: password_hash, email, push_token), `member_stats` (READ), `member_badges` (READ) |
| Worker Endpoints | `GET /v1/members/:memberId/profile` |
| KV | None |
| R2 | Avatar served from CDN |

---

## 3. The Five Houses

### 3.1 Houses Page

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `houses` (READ all 5), `rooms` (COUNT by house), `events` (COUNT upcoming by house), `challenges` (COUNT active by house) |
| Worker Endpoints | `GET /v1/houses`, `GET /v1/houses/:houseId` |
| KV | Cache: `houses:all` (TTL 1 hour) — houses rarely change |
| R2 | None |

**House Detail Page displays:**
- House description, tagline, icon
- Rooms within this house (paginated)
- Upcoming events for this house (next 3)
- Active challenges for this house
- Weekly theme highlight (e.g., Monday is Becoming day)

---

## 4. Rooms

### 4.1 Room Feed (Posts)

**Phase:** MVP 1  
**Tier:** Depends on `rooms.min_tier`

| Layer | Details |
|---|---|
| D1 Tables | `rooms` (READ: verify existence + tier), `room_memberships` (READ: verify membership), `posts` (READ with cursor pagination), `members` (JOIN: author info), `reactions` (aggregate count) |
| Worker Endpoints | `GET /v1/chapters/:chapterId/rooms`, `GET /v1/rooms/:roomId`, `GET /v1/rooms/:roomId/posts` |
| KV | None for feed (network-first, always fresh) |
| R2 | Post media served from CDN |

**Pagination:** Cursor-based on `posts.id`. Default limit: 20 posts per page.

```sql
-- Room feed query pattern
SELECT p.*, m.username, m.display_name, m.avatar_r2_key
FROM posts p
JOIN members m ON p.author_id = m.id
WHERE p.room_id = ?
  AND p.deleted_at IS NULL
  AND p.id > ?          -- cursor
ORDER BY p.created_at DESC
LIMIT ?;
```

---

### 4.2 Post Creation

**Phase:** MVP 1  
**Tier:** Depends on `rooms.min_tier`

| Layer | Details |
|---|---|
| D1 Tables | `posts` (INSERT), `rooms` (UPDATE: comment_count — no, that's for comments. posts don't update room counts). `member_stats` (UPDATE: posts_authored + 1) |
| Worker Endpoints | `POST /v1/rooms/:roomId/posts`, `POST /v1/media/upload` (for media posts) |
| KV | None. TanStack Query on client invalidates `['posts', roomId]` cache on success |
| R2 | If media post: media already uploaded via `/v1/media/upload`, R2 key is passed in post body |

**Score award on post creation:**
```
Post in a room belonging to house X → award house_X_score += 2
```
This is done atomically in the same D1 transaction as the post INSERT.

---

### 4.3 Comments & Reactions

**Phase:** MVP 1  
**Tier:** Same as room

| Layer | Details |
|---|---|
| D1 Tables | `comments` (INSERT/READ), `reactions` (INSERT with ON CONFLICT DO UPDATE — toggle), `posts` (UPDATE: comment_count, reaction_count — denormalized) |
| Worker Endpoints | `GET /v1/posts/:postId/comments`, `POST /v1/posts/:postId/comments`, `POST /v1/posts/:postId/reactions` |
| KV | None |

**Comment scoring:** Commenting awards `connection_score += 1` (cross-house,
since comments build connection regardless of room's house).

**Reaction toggle:** `INSERT INTO reactions ... ON CONFLICT(target_type, target_id, member_id) DO UPDATE SET ...` is not how we toggle. Instead: check for existing reaction first, then INSERT or DELETE. Two queries, one transaction.

---

### 4.4 Room Join / Leave

**Phase:** MVP 1  
**Tier:** Depends on `rooms.min_tier`

| Layer | Details |
|---|---|
| D1 Tables | `room_memberships` (INSERT or UPDATE deleted_at), `rooms` (UPDATE: member_count +/- 1), `member_stats` (UPDATE: rooms_joined) |
| Worker Endpoints | `POST /v1/rooms/:roomId/join`, `POST /v1/rooms/:roomId/leave` |
| KV | None |

---

## 5. Events

### 5.1 Event Listing

**Phase:** MVP 1  
**Tier:** Free (listing), depends on `events.min_tier` for detail

| Layer | Details |
|---|---|
| D1 Tables | `events` (READ: upcoming, published, scoped to chapter), `event_rsvps` (LEFT JOIN to show is_rsvped flag for current member) |
| Worker Endpoints | `GET /v1/chapters/:chapterId/events`, `GET /v1/events/:eventId` |
| KV | None (event listings are network-first) |
| R2 | Event cover images from CDN |

**Filter options surfaced to UI:**
- By format: online, physical, hybrid
- By house: becoming, connection, wellness, play, humanity
- By chapter scope: local, national (Phase 5)

---

### 5.2 Event RSVP

**Phase:** MVP 1  
**Tier:** Depends on `events.min_tier`

| Layer | Details |
|---|---|
| D1 Tables | `event_rsvps` (INSERT or UPDATE status), `events` (UPDATE: rsvp_count when status = 'going'), `member_stats` (UPDATE: events_attended on day of event — handled by separate cron or manual log) |
| Worker Endpoints | `POST /v1/events/:eventId/rsvp` |
| KV | None |

**RSVP capacity enforcement:**
```typescript
// In RSVP handler — atomic check + insert
const event = await env.DB.prepare(
  'SELECT rsvp_limit, rsvp_count FROM events WHERE id = ?'
).bind(eventId).first();

if (event.rsvp_limit && event.rsvp_count >= event.rsvp_limit && status === 'going') {
  // Auto-assign to waitlist
  status = 'waitlist';
}
```

---

## 6. Challenges

### 6.1 Challenge Listing & Join

**Phase:** MVP 1  
**Tier:** Depends on `challenges.min_tier` (Walking: free, Premium challenges: premium)

| Layer | Details |
|---|---|
| D1 Tables | `challenges` (READ: active), `challenge_participations` (READ: is member already participating, INSERT on join) |
| Worker Endpoints | `GET /v1/challenges`, `POST /v1/challenges/:challengeId/join`, `GET /v1/me/challenges` |
| KV | None |

**MVP 1 challenges (all free tier):**
- Walking Challenge (metric: steps, target: 5000/day)
- Reading Challenge (metric: pages, target: 10/day)
- Gratitude Challenge (metric: entries, target: 1/day)

---

### 6.2 Progress Logging

**Phase:** MVP 1  
**Tier:** Matches challenge tier

| Layer | Details |
|---|---|
| D1 Tables | `challenge_logs` (INSERT), `challenge_participations` (UPDATE: current_value, completion_pct, completed_at if done), `member_stats` (UPDATE: house score if completed, challenges_completed) |
| Worker Endpoints | `POST /v1/challenges/:challengeId/log` |
| KV | None |

**Score award on challenge completion:**
```
Challenge belonging to house X → house_X_score += challenge.points_reward
Total points += challenge.points_reward
Check badge triggers: challenge_count milestone badges
```

**Must NOT build now:**
- Challenge leaderboard (Phase 2)
- Streaks system (Phase 2 — streak_audit cron is seeded but UI is Phase 2)
- Badge auto-award system (Phase 2 — schema exists, triggers not wired)

---

## 7. AlphaMinds Daily Content

### 7.1 Daily Content Delivery (Cron)

**Phase:** MVP 1 — this is a launch-blocking feature  
**Tier:** Free (basic result), nothing gated here

| Layer | Details |
|---|---|
| D1 Tables | `daily_content` (READ: today's scheduled item), `daily_content_deliveries` (INSERT per member), `cron_execution_logs` (INSERT on start, UPDATE on complete) |
| Worker Endpoints | `GET /v1/daily-content/today`, `POST /v1/daily-content/:id/complete` |
| KV Reads/Writes | Write: `daily:{member_id}:{YYYY-MM-DD}` (TTL 48h) per member. Write: `content:schedule:{YYYY-MM-DD}` (TTL 25h) for today's item. Read: both keys on Home page load |
| R2 | Content media images served from CDN |
| Cron | `0 5 * * *` — daily at 05:00 UTC |

**Cron execution logic:**

```typescript
// cron/handlers/dailyContentDelivery.ts

export async function handleDailyContentDelivery(env: Env, scheduledAt: Date) {
  const logId = await startCronLog(env, 'daily_content_delivery', scheduledAt);

  try {
    const today = formatDate(scheduledAt); // YYYY-MM-DD
    const dayOfWeek = getDayOfWeek(scheduledAt); // 'monday' | 'tuesday' | ...

    // 1. Select today's content item
    const content = await env.DB.prepare(`
      SELECT * FROM daily_content
      WHERE is_published = 1
        AND deleted_at IS NULL
        AND (
          scheduled_date = ?
          OR (scheduled_date IS NULL AND day_of_week = ?)
        )
      ORDER BY scheduled_date DESC, created_at DESC
      LIMIT 1
    `).bind(today, dayOfWeek).first();

    if (!content) {
      await failCronLog(env, logId, 'No content scheduled for today');
      await sendAdminAlert(env, 'daily_content_delivery', 'No content scheduled');
      return;
    }

    // 2. Cache today's content in KV
    await env.ALPHAMINDS_CONTENT_SCHEDULE_CACHE.put(
      `content:schedule:${today}`,
      JSON.stringify(content),
      { expirationTtl: 90000 } // 25 hours
    );

    // 3. Get all active members (paginated, batch of 500)
    let cursor: string | null = null;
    let totalProcessed = 0;

    do {
      const members = await env.DB.prepare(`
        SELECT id FROM members
        WHERE is_active = 1 AND deleted_at IS NULL AND id > ?
        ORDER BY id ASC LIMIT 500
      `).bind(cursor ?? '').all();

      // 4. Batch insert delivery records (skip already-delivered)
      for (const member of members.results) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO daily_content_deliveries
            (member_id, content_id, delivery_date)
          VALUES (?, ?, ?)
        `).bind(member.id, content.id, today).run();

        // 5. Set KV delivery state per member
        await env.ALPHAMINDS_DAILY_DELIVERY.put(
          `daily:${member.id}:${today}`,
          JSON.stringify({ content_id: content.id, delivered_at: new Date().toISOString(), completed_at: null }),
          { expirationTtl: 172800 } // 48 hours
        );

        totalProcessed++;
      }

      cursor = members.results.length === 500
        ? members.results[members.results.length - 1].id
        : null;

    } while (cursor);

    await completeCronLog(env, logId, totalProcessed);

    // 6. Send push notifications to subscribed members
    // (separate async task — push failures don't fail the delivery)
    await queuePushNotifications(env, content, today);

  } catch (error) {
    await failCronLog(env, logId, String(error));
    await sendAdminAlert(env, 'daily_content_delivery', String(error));
    throw error; // re-throw so Cloudflare registers the failure
  }
}
```

**Admin alert on failure:**
If the cron fails or no content is scheduled, write to:
`KV: admin:alert:daily_content:{YYYY-MM-DD}` with TTL 48 hours.
The admin dashboard polls this key. A non-null value triggers a visible alert banner.

---

### 7.2 Daily Content — Home Page Rendering

**Phase:** MVP 1

When a member opens the Home page:
1. Client calls `GET /v1/daily-content/today`
2. Worker checks KV: `daily:{member_id}:{today}` — fast path if delivered
3. If KV miss: query D1 `daily_content_deliveries` for today, and `content:schedule:{today}` cache
4. Return content item + delivery state (delivered_at, completed_at)
5. If content item has `completed_at = null`, show "Complete" button
6. Member taps "Complete" → `POST /v1/daily-content/:id/complete`
7. Worker updates D1 delivery record, updates KV state, awards 5 points

---

## 8. Notifications

### 8.1 In-App Notifications

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `notifications` (INSERT on trigger events: new post in joined room, new comment on my post, event RSVP confirmation, badge awarded) |
| Worker Endpoints | `GET /v1/me/notifications`, `POST /v1/me/notifications/read-all` |
| KV | None |

**Notification triggers (MVP 1):**
- New post in a room the member has joined → notify member
- New comment on member's post → notify post author
- Event RSVP confirmed → notify member
- Event reminder (24h before) → handled by cron

**Must NOT build now:**
- @mention notifications (Phase 2)
- Follower activity notifications (Phase 2)
- Real-time notification badge via WebSocket (Phase 2 — use polling for MVP 1)

**Notification badge polling:** Client polls `GET /v1/me/notifications?unread_only=true&limit=1`
every 60 seconds when app is in foreground. Returns `unread_count`. This is acceptable
for MVP 1. Phase 2 replaces this with server-sent events or WebSocket.

---

### 8.2 Push Notifications

**Phase:** MVP 1  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `members` (READ: push_token), `notifications` (UPDATE: push_sent, push_sent_at) |
| Worker Endpoints | `PUT /v1/me/push-token` |
| KV | None |

**Web Push implementation:**
```typescript
// Push notification sending from Worker
async function sendPushNotification(
  pushSubscriptionJson: string,
  payload: { title: string; body: string; url: string; icon: string },
  env: Env
): Promise<void> {
  const subscription = JSON.parse(pushSubscriptionJson);

  // Use web-push library (bundled in Worker)
  const vapidDetails = {
    subject: 'mailto:push@alphaminds.com',
    publicKey: env.WEB_PUSH_VAPID_PUBLIC,
    privateKey: env.WEB_PUSH_VAPID_PRIVATE,
  };

  await webpush.sendNotification(subscription, JSON.stringify(payload), { vapidDetails });
}
```

---

## 9. Admin Dashboard

### 9.1 Member Management

**Phase:** MVP 1  
**Tier:** Admin only

| Layer | Details |
|---|---|
| D1 Tables | `members` (READ, UPDATE: role, is_active), `member_stats` (READ), `subscriptions` (READ) |
| Worker Endpoints | `GET /v1/admin/members`, `PATCH /v1/admin/members/:memberId` |
| KV | On member suspension: write `member:suspended:{member_id}` flag (checked in auth middleware) |

---

### 9.2 Content Management

**Phase:** MVP 1  
**Tier:** Admin only

| Layer | Details |
|---|---|
| D1 Tables | `daily_content` (CREATE, READ, UPDATE, soft DELETE), `events` (CREATE, UPDATE, soft DELETE), `challenges` (CREATE, UPDATE, soft DELETE) |
| Worker Endpoints | `POST /v1/admin/daily-content`, `GET /v1/admin/daily-content`, `PATCH /v1/admin/daily-content/:id`, `GET /v1/admin/cron-logs` |
| KV | After publishing/updating daily content: invalidate `content:schedule:{date}` cache |

---

## 10. The Detectors™

### 10.1 Detector Flow

**Phase:** MVP 2  
**Tier:** Free (basic result), Basic (full result), Premium (PDF report)

| Layer | Details |
|---|---|
| D1 Tables | `detector_question_sets` (READ: active version), `detector_responses` (CREATE, UPDATE on each answer), `detector_results` (CREATE on submit), `member_stats` (UPDATE: detectors_completed + 1), `member_badges` (INSERT: detector-completion badge) |
| Worker Endpoints | `GET /v1/detectors`, `GET /v1/detectors/:type/questions`, `POST /v1/detectors/:type/responses`, `PATCH /v1/detectors/:type/responses/:id`, `POST /v1/detectors/:type/responses/:id/submit`, `GET /v1/detectors/:type/results/latest` |
| KV | None |
| R2 | PDF reports: stored as `detectors/{member_id}/reports/{result_id}.pdf` in private bucket. Served via signed URL (Premium only) |

**Detector result computation:**
Result computation runs synchronously on submit (it's a weighted scoring algorithm,
not an LLM call — fast enough for a synchronous Worker response). The result JSON
is stored in D1. PDF generation is asynchronous (triggered by webhook or on first
Premium access request).

**Retake logic:**
```typescript
// On submit: set retake_available_at
const retakeAvailableAt = new Date(completedAt);
retakeAvailableAt.setDate(retakeAvailableAt.getDate() + 90);

await env.DB.prepare(`
  UPDATE detector_results SET retake_available_at = ? WHERE id = ?
`).bind(retakeAvailableAt.toISOString(), resultId).run();
```

---

## 11. Leaderboards

### 11.1 Chapter Leaderboard

**Phase:** MVP 2  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `leaderboard_snapshots` (READ: most recent snapshot for scope+period), `member_stats` (fallback for real-time if no snapshot) |
| Worker Endpoints | `GET /v1/chapters/:chapterId/leaderboard` |
| KV | Cache: `leaderboard:{chapterId}:{house}:{period}` (TTL: 1 hour, invalidated by cron) |
| Cron | `0 1 * * *` — nightly recalculation |

**Leaderboard query (from snapshot):**
```sql
SELECT ls.rank, ls.score, ls.change,
       m.id, m.display_name, m.username, m.avatar_r2_key
FROM leaderboard_snapshots ls
JOIN members m ON ls.member_id = m.id
WHERE ls.scope_type = 'chapter'
  AND ls.scope_id = ?
  AND ls.period_type = ?
  AND ls.house IS ?
  AND ls.snapshot_at = (
    SELECT MAX(snapshot_at) FROM leaderboard_snapshots
    WHERE scope_type = 'chapter' AND scope_id = ?
  )
ORDER BY ls.rank ASC
LIMIT 50;
```

---

## 12. Subscription & Payments

### 12.1 Subscription Tier Gate

**Phase:** MVP 1 (gate logic), MVP 3 (payment collection)

The gate exists from day one. In Phase 1, there is no way for members to upgrade
(no payment integration). The gate simply returns 403 for non-free features with
`upgrade_required: true`. This means:
- The UI shows upgrade prompts from day one
- The codebase is payment-ready
- Phase 3 adds the checkout endpoints and webhook handlers

| Layer | Details |
|---|---|
| D1 Tables | `subscriptions` (READ: active sub for member) |
| KV | `sub:{member_id}` (TTL 1 hour) — fast tier cache |

---

### 12.2 Payment Integration

**Phase:** MVP 3  
**Tier:** N/A (payment processing, not access-controlled)

| Layer | Details |
|---|---|
| D1 Tables | `subscriptions` (INSERT on new, UPDATE on change), `subscription_events` (INSERT: every webhook event) |
| Worker Endpoints | `POST /v1/subscriptions/checkout`, `POST /v1/subscriptions/cancel`, `GET /v1/me/subscription`, `POST /v1/webhooks/paystack`, `POST /v1/webhooks/stripe` |
| KV | On downgrade/cancel: `DELETE sub:{member_id}` immediately (forces D1 re-check on next request) |

**Must NOT build now (Phase 1):**
- Checkout endpoints
- Webhook handlers
- Paystack/Stripe SDK imports
- Any payment-related UI beyond the upgrade prompt

**Preserve future optionality:** The `subscriptions` table exists in the schema from
Phase 1. When a member registers, insert a free subscription record:
```sql
INSERT INTO subscriptions (member_id, tier, status) VALUES (?, 'free', 'active');
```
This ensures the tier lookup logic works identically in Phase 1 and Phase 3.

---

## 13. Book Club

### 13.1 Book of the Month

**Phase:** MVP 2  
**Tier:** Free

| Layer | Details |
|---|---|
| D1 Tables | `books` (READ: current month's book), `book_reading_progress` (READ/INSERT/UPDATE per member), `rooms` (READ: book club discussion room) |
| Worker Endpoints | `GET /v1/books/current`, `GET /v1/books/:bookId`, `PUT /v1/books/:bookId/progress` |
| KV | `book:current` (TTL 24 hours) |

---

## 14. Podcast Hub

### 14.1 Podcast Library

**Phase:** MVP 2  
**Tier:** Free (listing), depends on `podcast_episodes.min_tier`

| Layer | Details |
|---|---|
| D1 Tables | `podcasts` (READ), `podcast_episodes` (READ, tier-gated) |
| Worker Endpoints | `GET /v1/podcasts`, `GET /v1/podcasts/:id/episodes`, `GET /v1/podcasts/episodes/:id` |
| KV | None |
| R2 | Audio files: served from CDN for free episodes. Signed URL for Premium episodes |

---

## 15. Wellness Tracker

### 15.1 Habit & Wellness Tracking

**Phase:** MVP 4  
**Tier:** Premium

| Layer | Details |
|---|---|
| D1 Tables | New tables (Phase 4 migration): `wellness_logs`, `habit_definitions`, `mood_logs`, `weight_logs` |
| Worker Endpoints | Phase 4 endpoints |

**Must NOT build now:** No wellness tracking tables, no wellness tracking API, no wellness tracking UI.
The schema migration for Phase 4 tables will be a new migration file (`0005_add_wellness_tracking.sql`).

---

## 16. Alpha Coach AI

**Phase:** MVP 4  
**Tier:** Premium

| Layer | Details |
|---|---|
| D1 Tables | `member_context_snapshots` (READ — this table IS built in Phase 1), `detector_results` (READ), `member_stats` (READ), `challenge_participations` (READ) |
| External | LLM Provider API (OpenAI or Anthropic) via Worker fetch |

**Phase 1 action:** Create `member_context_snapshots` table (already in schema).
Do not build any AI endpoints. The table schema is the only Phase 1 action for this feature.

**Phase 4 action:** Implement snapshot generation Cron job + Alpha Coach AI Worker endpoint.

---

## 17. WhatsApp Share Cards

### 17.1 Challenge Completion Share

**Phase:** MVP 1 (basic share page), MVP 2 (dynamic OG image generation)

| Layer | Details |
|---|---|
| D1 Tables | `challenge_participations` (READ), `challenges` (READ), `members` (READ: display_name, avatar) |
| Worker Endpoints | `GET /v1/share/challenge-completion/:participationId` (public, no auth) |
| R2 | Avatar from CDN |

**Phase 1 share page:** Static React page with a pre-designed card layout.
OG tags set statically per share type.

**Phase 2 dynamic OG image:** Cloudflare Worker renders HTML to image using
Cloudflare's `@cloudflare/puppeteer` or `html-rewriter` + canvas approach.
Do not attempt this in Phase 1 — it adds significant complexity.

---

## 18. Chapters (Phase 5)

### 18.1 Chapter Management

**Phase:** MVP 5  
**Tier:** Admin only for management, Free for member access

**Must NOT build now:** No chapter creation UI, no chapter transfer UI, no
chapter-specific analytics. The `chapters` table, `member_chapter_history` table,
and `chapter_id` foreign keys on all relevant tables are built in Phase 1 schema.
The application logic to CREATE and MANAGE chapters is Phase 5.

**Phase 1 behavior:** All members are assigned to the single founding chapter
(or `global` if no chapter exists). The chapter_id in their JWT session is set
at registration and never changes in Phase 1.

---

## 19. Phase Timeline Summary

| Feature | Phase | Tier | D1 Tables (Primary) | Build Now? |
|---|---|---|---|---|
| Auth (email/password) | 1 | Free | members, member_stats | ✅ |
| Member Profiles | 1 | Free | members, member_stats | ✅ |
| House Selection | 1 | Free | member_house_selections | ✅ |
| Room Feed + Posts | 1 | Free/Basic | rooms, posts, comments | ✅ |
| Events + RSVP | 1 | Free | events, event_rsvps | ✅ |
| Basic Challenges | 1 | Free | challenges, participations | ✅ |
| AlphaMinds Daily | 1 | Free | daily_content, deliveries | ✅ |
| Push Notifications | 1 | Free | notifications | ✅ |
| Admin Dashboard | 1 | Admin | members, daily_content | ✅ |
| Google OAuth | 2 | Free | members (google_id) | ❌ |
| Group Chat | 2 | Free | room_messages | ❌ |
| Detectors™ | 2 | Free/Premium | detector_responses, results | ❌ |
| Leaderboards | 2 | Free | leaderboard_snapshots | ❌ |
| Streaks + Badges | 2 | Free | member_badges, member_stats | ❌ |
| Book Club | 2 | Free | books, reading_progress | ❌ |
| Podcast Hub | 2 | Free | podcasts, episodes | ❌ |
| Payments (Paystack/Stripe) | 3 | N/A | subscriptions | ❌ |
| Premium Features | 3 | Premium | subscriptions | ❌ |
| Alpha Coach AI | 4 | Premium | member_context_snapshots | Schema only ✅ |
| Wellness Tracker | 4 | Premium | wellness_logs (new) | ❌ |
| Multi-Chapter | 5 | Admin | chapters | Schema only ✅ |
