# ARCHITECTURE.md
# AlphaMinds Commons — Master Architecture Document
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. Document Purpose

This document is the authoritative technical blueprint for AlphaMinds Commons. It is
written for three audiences simultaneously: AI coding agents (Cursor, Windsurf, Copilot)
that will execute the build, junior-to-mid engineers who will maintain and extend it, and
senior engineers who need to audit decisions. Every architectural choice recorded here
includes the reasoning behind it and the specific condition under which the decision
should be revisited.

Do not deviate from this architecture without updating this document first. The document
is the source of truth; the code is the implementation.

---

## 1. System Overview

AlphaMinds Commons is a Progressive Web App (PWA) community platform organized around
five pillars of human flourishing — the Five Houses: Wellness, Connection, Becoming,
Play, and Humanity. It launches with a single founding chapter and is architected for
multi-chapter global scale from day one.

The platform is entirely hosted on Cloudflare's developer platform. There is no
application server, no container orchestration, no VM fleet. Compute is Workers
(serverless edge functions), storage is D1 (SQLite) + R2 (object storage) + KV
(key-value), and the frontend is a React/Vite PWA deployed to Cloudflare Pages.

This is not a simplification choice. It is a deliberate systems choice. Cloudflare's
edge network spans 300+ cities. A Worker running in Lagos handles a Nigerian member's
request with sub-20ms latency. The same architecture handles a Hong Kong member
identically. There is no regional deployment configuration to maintain. The platform is
globally distributed by default.

---

## 2. The Five Houses — Architectural Significance

The Five Houses are not UI labels. They are the primary organizing dimension of the
entire data model and application logic.

```
HOUSE ENUM (used throughout schema and API):
  becoming   → House of Becoming  (Grow Well)
  connection → House of Connection (Love Well)
  wellness   → House of Wellness   (Live Well)
  play       → House of Play       (Enjoy Well)
  humanity   → House of Humanity   (Serve Well)
  global     → Cross-house / platform-wide (not a member-facing house)
```

Every Room belongs to exactly one House.
Every Challenge belongs to exactly one House.
Every Event belongs to one House, or is tagged `global`.
Every piece of daily content belongs to one House, or is tagged `global`.
Every member has a `primary_house` and up to 2 `secondary_houses`.
Every member has five score columns — one per House.
Every Cron Job that touches content or scoring operates against the House dimension.

This is enforced at the schema level. Application code must never bypass House scoping.

---

## 3. System Architecture Diagram (ASCII)

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MEMBER'S BROWSER / DEVICE                    │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │           React + Vite PWA (Cloudflare Pages)                │   │
│  │                                                              │   │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │   │
│  │  │  Home    │ │  Houses  │ │  Rooms   │ │  Events  │  ...  │   │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘       │   │
│  │                                                              │   │
│  │  Service Worker (offline shell, push notifications)          │   │
│  └──────────────────────────┬───────────────────────────────────┘   │
│                             │ HTTPS / Fetch API                     │
└─────────────────────────────┼───────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   CLOUDFLARE EDGE NETWORK                           │
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │              Cloudflare Workers (REST API)                   │   │
│  │                                                              │   │
│  │  ┌───────────────┐   ┌───────────────┐  ┌───────────────┐   │   │
│  │  │  Auth Worker  │   │  API Worker   │  │ Media Worker  │   │   │
│  │  │  /v1/auth/*   │   │  /v1/*        │  │ /media/*      │   │   │
│  │  └───────┬───────┘   └───────┬───────┘  └───────┬───────┘   │   │
│  │          │                   │                   │           │   │
│  │  ┌───────▼───────────────────▼───────────────────▼────────┐  │   │
│  │  │              Shared Middleware Layer                    │  │   │
│  │  │  - JWT validation (KV lookup)                          │  │   │
│  │  │  - Subscription tier gate (KV cache → D1 fallback)     │  │   │
│  │  │  - Rate limiting (KV counters)                         │  │   │
│  │  │  - Chapter context extraction                          │  │   │
│  │  │  - Role-based access control                           │  │   │
│  │  └────────────────────────────────────────────────────────┘  │   │
│  └──────────────────────────────────────────────────────────────┘   │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ D1 (SQL) │  │    KV    │  │    R2    │  │  Cron Triggers   │   │
│  │ Primary  │  │ Sessions │  │  Media   │  │  Background Jobs │   │
│  │ Data     │  │ Cache    │  │  Assets  │  │                  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              │ Webhooks
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    THIRD-PARTY SERVICES                             │
│                                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
│  │ Paystack │  │  Stripe  │  │  Resend  │  │  (Phase 4)       │   │
│  │ (Africa) │  │ (Intl)   │  │  Email   │  │  LLM Provider    │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 4. Cloudflare Infrastructure — Component Roles

### 4.1 Cloudflare Pages (Frontend Host)

- Hosts the compiled React/Vite PWA static assets
- Auto-deploys from GitHub main branch via Cloudflare Pages Git integration
- Preview deployments on every PR (critical for QA before merge)
- Serves the app shell from CDN edge — cached globally
- Custom domain: `app.alphaminds.com` (or `commons.alphaminds.com`)

The PWA service worker caches the app shell aggressively. New deployments
automatically bust the service worker cache because the asset hashes change.
This means zero-downtime deployments with automatic client updates.

### 4.2 Cloudflare Workers (API Layer)

Workers are the entire backend. No Node.js server. No Express. No Docker.
Each Worker is a V8 isolate running at the edge.

**Worker structure (monorepo approach recommended):**

```
workers/
  api/          → Main REST API handler (all /v1/* routes)
  auth/         → Auth-specific logic (can be same worker, separate handler)
  media/        → Signed URL generation for R2 assets
  webhooks/     → Paystack + Stripe webhook receivers
  cron/         → All scheduled Cron Trigger handlers
  shared/       → Middleware, types, utilities (imported, not deployed)
```

**Routing strategy:**
Workers use the URL pattern to route internally. A single Worker can
handle all routes via an internal router (Hono.js recommended — it's a
lightweight, edge-native router that eliminates boilerplate without
adding bundle weight).

Route pattern: `https://api.alphaminds.com/v1/{resource}`
Chapter-scoped routes: `https://api.alphaminds.com/v1/chapters/{chapterId}/{resource}`

**Why a single API Worker vs. multiple Workers per domain:**
At MVP scale, a single Worker with internal routing is simpler to deploy,
debug, and reason about. Worker CPU limits (10ms-50ms per request on free,
unlimited on paid) are not a concern for typical REST operations. If a
specific route becomes a bottleneck (e.g., PDF generation), that handler
gets extracted to its own Worker at that time. Premature decomposition
creates operational overhead with zero benefit.

### 4.3 Cloudflare D1 (Primary Database)

D1 is SQLite hosted at the edge. All persistent application state lives here.

**Single D1 database vs. per-chapter databases:**

Decision: **One global D1 database** with `chapter_id` as a partition key on all
chapter-scoped tables.

Reasoning:
- D1 currently supports one database per Worker binding in a straightforward way.
  Per-chapter databases would require dynamic binding resolution at request time,
  which is possible but adds significant complexity with no benefit at current scale.
- Global queries (leaderboards that span chapters, admin dashboards, analytics) would
  require cross-database joins, which D1 does not support natively. With a single DB,
  these are trivial queries with a WHERE clause.
- SQLite's architecture means reads are fast and D1 replicates reads globally. Write
  throughput for a community platform of this scale (not a financial trading system)
  is well within D1's limits.
- When to reverse this decision: if AlphaMinds reaches >500,000 members and a single
  chapter (e.g., a national chapter) accounts for >60% of write traffic, per-chapter
  sharding becomes justified. At that point, D1's roadmap will likely also have
  improved multi-DB Worker support. The `chapter_id` foreign key on every table makes
  migration to a sharded model straightforward — it becomes a data export + re-import
  operation, not a schema redesign.

### 4.4 Cloudflare KV (Sessions, Cache, Ephemeral State)

KV is eventually consistent, globally replicated key-value storage. It is NOT the
source of truth for anything. It is a fast cache layer.

**KV namespace map:**

```
ALPHAMINDS_SESSIONS
  Key pattern:  session:{token}
  Value:        JSON { member_id, email, role, chapter_id, subscription_tier, expires_at }
  TTL:          7 days (rolling, refreshed on each authenticated request)
  Purpose:      JWT session validation without D1 query on every request

ALPHAMINDS_SUBSCRIPTION_CACHE
  Key pattern:  sub:{member_id}
  Value:        JSON { tier, valid_until, updated_at }
  TTL:          1 hour
  Purpose:      Fast subscription tier gate check

ALPHAMINDS_DAILY_DELIVERY
  Key pattern:  daily:{member_id}:{YYYY-MM-DD}
  Value:        JSON { content_id, delivered_at, completed_at | null }
  TTL:          48 hours
  Purpose:      Prevent duplicate daily content delivery; track completion

ALPHAMINDS_RATE_LIMITS
  Key pattern:  rl:{ip_or_member_id}:{endpoint_bucket}
  Value:        JSON { count, window_start }
  TTL:          Per window (60s for most endpoints, 300s for auth)
  Purpose:      Rate limiting without D1 write on every request

ALPHAMINDS_CONTENT_SCHEDULE_CACHE
  Key pattern:  content:schedule:{YYYY-MM-DD}
  Value:        JSON { content_id, house, type, title }
  TTL:          25 hours
  Purpose:      Cache today's scheduled content so the Cron result is
                readable without D1 query on every Home page load

ALPHAMINDS_CHAPTER_CONFIG
  Key pattern:  chapter:{chapter_id}:config
  Value:        JSON { name, type, timezone, active }
  TTL:          24 hours
  Purpose:      Fast chapter context resolution without D1 query
```

### 4.5 Cloudflare R2 (Object Storage)

R2 is S3-compatible object storage with zero egress fees. All media assets live here.

**Bucket structure:**

```
alphaminds-media/          (primary bucket)
  chapters/
    {chapter-slug}/
      assets/              → Chapter logo, banner
      events/
        {event-id}/        → Event cover images
  members/
    {member-id}/
      avatar/              → Profile image (original + resized variants)
  rooms/
    {room-id}/
      posts/
        {post-id}/         → Post media attachments
  detectors/
    {member-id}/
      reports/
        {result-id}.pdf    → Detector PDF reports (Premium, signed URL only)
  content/
    daily/                 → Daily content media (images for insights)
    podcasts/              → Podcast episode audio files
    book-covers/           → Book of the Month cover images

alphaminds-backups/        (separate bucket, private)
  d1/
    {YYYY-MM-DD}/          → D1 export backups (Cron-driven)
```

**Access control:**
- General media (avatars, event images, room posts): public bucket with
  Cloudflare Image Resizing for on-the-fly optimization
- Detector PDF reports: private, served via signed URL (10-minute TTL)
  generated by the Media Worker on authenticated Premium request
- Backups: private, never publicly accessible

### 4.6 Cloudflare Cron Triggers

All background jobs are Cron Triggers attached to the cron Worker.

```
CRON SCHEDULE:

  0 5 * * *      → Daily Content Delivery
                   Runs at 05:00 UTC daily.
                   Selects today's scheduled content item.
                   Writes delivery records to D1 (daily_content_deliveries).
                   Sets KV keys for per-member delivery tracking.
                   Sends push notifications to subscribed members.
                   On failure: retries up to 3 times, then writes alert
                   to ALPHAMINDS_ADMIN_ALERTS KV key.

  0 0 * * 1      → Weekly Challenge Reset
                   Runs at 00:00 UTC every Monday.
                   Closes previous week's challenge entries.
                   Calculates weekly winners.
                   Updates leaderboard snapshot table.
                   Resets streak counters for members who missed last week.

  30 0 * * *     → Streak Audit
                   Runs at 00:30 UTC daily (after content delivery).
                   Checks each member's last_activity_at.
                   Decrements or resets streaks where applicable.
                   Updates member_stats table.

  0 1 * * *      → Leaderboard Recalculation
                   Runs at 01:00 UTC daily.
                   Aggregates per-House scores from activity events.
                   Updates leaderboard_snapshots table.
                   Invalidates leaderboard KV cache.

  0 2 * * 1      → Impact Score Recalculation
                   Runs at 02:00 UTC every Monday.
                   Aggregates volunteer hours, challenge completions,
                   Detector completions into member impact scores.
                   Updates member_stats.impact_score.

  0 3 * * 0      → Weekly Summary Email
                   Runs at 03:00 UTC every Sunday.
                   Generates per-member weekly summary data.
                   Queues emails via Resend for engaged members.

  0 4 * * *      → D1 Backup Export
                   Runs at 04:00 UTC daily.
                   Exports D1 data via Workers API to R2 backup bucket.
```

**Cron reliability contract:**
Every Cron job writes a `cron_execution_log` record to D1 on start, and updates it
with `status` (success/failure) and `completed_at` on finish. Admin dashboard polls
this table. If `daily_content_delivery` has no success record for today by 06:00 UTC,
an alert is surfaced to the admin dashboard and (Phase 2) sent to the Founder's
registered admin email.

---

## 5. Multi-Chapter Tenancy Architecture

### 5.1 Chapter Model

```
Chapter Types:
  university  → Scoped to a specific university
  city        → Scoped to a city
  country     → Scoped to a country
  global      → No chapter scoping (platform-wide)
```

Every member belongs to exactly one chapter at signup (or `global` if no
chapter exists in their area). Chapter transfers are a supported operation
with a full audit trail in `member_chapter_history`.

### 5.2 Data Scoping Rules

```
CHAPTER-SCOPED (always carry chapter_id):
  rooms, events, posts, comments, event_rsvps,
  challenge_participations, room_memberships,
  leaderboard_snapshots (per-chapter variant)

GLOBAL (chapter_id IS NULL):
  daily_content, challenges (template), houses, detector_question_sets,
  books, podcast_episodes, leaderboard_snapshots (global variant)

MEMBER-OWNED (chapter_id on member record, not on the resource):
  members, member_stats, member_house_selections,
  detector_results, member_context_snapshots
```

### 5.3 API Route Scoping

Chapter-scoped resources are nested under `/v1/chapters/:chapterId/`:

```
/v1/chapters/:chapterId/rooms
/v1/chapters/:chapterId/events
/v1/chapters/:chapterId/leaderboard
/v1/chapters/:chapterId/members
```

Global resources are at the top level:
```
/v1/daily-content/today
/v1/challenges
/v1/houses
/v1/books
/v1/podcasts
```

Member-owned resources are under `/v1/me/`:
```
/v1/me/profile
/v1/me/houses
/v1/me/detector-results
/v1/me/stats
```

### 5.4 JWT Chapter Context

Every JWT session payload includes `chapter_id`. The Worker extracts this
and uses it to:
1. Validate that the member is accessing their own chapter's resources
2. Scope D1 queries with `WHERE chapter_id = ?`
3. Resolve KV keys with chapter prefix where applicable

A member cannot access another chapter's rooms or events without explicit
cross-chapter permission (Admin role only).

---

## 6. Authentication Architecture

### 6.1 Phase 1 (MVP 1) — Email/Password

```
SIGN UP FLOW:
  1. POST /v1/auth/register
     → Validate email uniqueness in D1
     → Hash password with bcrypt (cost factor 12)
     → Insert member record
     → Generate session token (crypto.randomUUID())
     → Store session in KV: session:{token} with 7-day TTL
     → Return { token, member } to client
     → Client stores token in memory + secure cookie (httpOnly, SameSite=Strict)
     → Client NEVER stores token in localStorage

LOGIN FLOW:
  1. POST /v1/auth/login
     → Fetch member by email from D1
     → bcrypt.compare(password, hash)
     → Generate new session token
     → Store in KV
     → Return { token, member }

REQUEST AUTHENTICATION:
  1. Client sends Authorization: Bearer {token} header
  2. Worker middleware extracts token
  3. KV lookup: session:{token}
  4. If not found → 401 Unauthorized
  5. If found → parse session JSON, attach to request context
  6. Proceed to route handler

TOKEN REFRESH:
  → On each authenticated request, if session TTL < 24 hours remaining,
    automatically extend TTL by 7 days (sliding window)
  → Client receives X-Session-Refreshed: true header when this occurs

PASSWORD RESET:
  1. POST /v1/auth/forgot-password
     → Generate 6-digit OTP (not a link — more mobile-friendly)
     → Store in KV: otp:{email} with 10-minute TTL
     → Send via Resend
  2. POST /v1/auth/verify-otp
     → Validate OTP from KV
     → Return one-time reset token
  3. POST /v1/auth/reset-password
     → Validate reset token (stored in KV: reset:{token} with 15-min TTL)
     → Update password hash in D1
     → Invalidate all existing sessions for this member (KV scan by member_id index)
```

### 6.2 Phase 2 — Google OAuth Addition

Google OAuth is additive. The `members` table has `password_hash` (nullable)
and `google_id` (nullable). A member can have one or both authentication methods.

---

## 7. Subscription Tier Architecture

### 7.1 Tier Definitions

```
free     → Default. Access to public content, basic challenges, basic Detectors.
basic    → Monthly subscription. Exclusive rooms, advanced challenges, event discounts.
premium  → Monthly subscription. Alpha Coach AI, full Detector reports, wellness tracking.
```

### 7.2 Gate Check Pattern (enforced at Worker, never at frontend)

```typescript
// Shared middleware — used by every protected endpoint
async function requireTier(
  request: Request,
  env: Env,
  ctx: ExecutionContext,
  requiredTier: 'basic' | 'premium'
): Promise<Response | null> {

  const session = getSession(request); // from KV, already resolved by auth middleware
  const memberId = session.member_id;

  // 1. Check KV cache first (fast path)
  const cached = await env.ALPHAMINDS_SUBSCRIPTION_CACHE.get(`sub:${memberId}`, 'json');

  let tier: string;

  if (cached && new Date(cached.valid_until) > new Date()) {
    tier = cached.tier;
  } else {
    // 2. KV miss or stale → query D1 (source of truth)
    const sub = await env.DB.prepare(
      `SELECT tier, valid_until FROM subscriptions
       WHERE member_id = ? AND status = 'active'
       ORDER BY created_at DESC LIMIT 1`
    ).bind(memberId).first();

    tier = sub?.tier ?? 'free';

    // 3. Refresh KV cache
    await env.ALPHAMINDS_SUBSCRIPTION_CACHE.put(
      `sub:${memberId}`,
      JSON.stringify({ tier, valid_until: sub?.valid_until, updated_at: new Date().toISOString() }),
      { expirationTtl: 3600 }
    );
  }

  const tierOrder = { free: 0, basic: 1, premium: 2 };
  if (tierOrder[tier] < tierOrder[requiredTier]) {
    return new Response(
      JSON.stringify({
        error: 'Subscription required',
        upgrade_required: true,
        current_tier: tier,
        required_tier: requiredTier,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return null; // proceed
}
```

### 7.3 Webhook-Triggered Cache Invalidation

When Paystack or Stripe sends a subscription event (upgrade, downgrade,
cancellation, payment failure), the webhook Worker:
1. Validates webhook signature
2. Updates `subscriptions` table in D1
3. Deletes `sub:{member_id}` from ALPHAMINDS_SUBSCRIPTION_CACHE immediately
4. The next API request will re-populate from D1

This ensures a downgraded member loses Premium access within one request,
not within one hour.

---

## 8. Phase Roadmap — Infrastructure Delta

### Phase 1 (MVP 1) — Weeks 1-12

Infrastructure in use:
- Cloudflare Pages (React PWA)
- Cloudflare Workers (API)
- Cloudflare D1 (database)
- Cloudflare KV (sessions, rate limiting, daily delivery state)
- Cloudflare R2 (media uploads)
- Cloudflare Cron Triggers (daily content, streak audit)
- Resend (transactional email)

Features: Auth, profiles, house/room selection, posts/comments/reactions,
daily content, events + RSVP, basic challenges (walking, reading, gratitude),
push notifications, admin dashboard.

### Phase 2 (MVP 2) — Post-launch

Infrastructure additions:
- Cloudflare Durable Objects → Real-time Group Chat (WebSocket state per Room)
- R2 signed URLs → Detector PDF report serving
- Google OAuth → Additional auth method

Features: Dedicated house dashboards, private rooms, group chat,
Detectors™ (all four), leaderboards, streaks, points, badges, book club,
podcast hub, room moderators.

**Durable Objects are not used in Phase 1.** Group Chat (Phase 2) requires
stateful WebSocket connections. Durable Objects are the correct primitive.
Do not attempt to build real-time chat with KV or polling in Phase 1 —
design the schema to support it (room_messages table exists from day one)
but surface it as "coming soon" in the UI.

### Phase 3 (MVP 3) — Monetization

Infrastructure additions:
- Paystack integration (webhooks, subscription management)
- Stripe integration (webhooks, subscription management)

Features: Premium membership gating, Detector PDF reports, exclusive rooms,
premium events, advanced analytics.

Note: The subscription gate architecture (tier checks, KV cache, 403 responses)
is built in Phase 1. Only the payment provider integrations are Phase 3.
Free/Basic/Premium tiers exist in the schema from day one.

### Phase 4 (MVP 4) — Transformation Platform

Infrastructure additions:
- LLM Provider (OpenAI or Anthropic API via Workers AI or direct API call)
- Alpha Coach AI context pipeline

Features: Alpha Coach AI, wellness tracker, habit/mood/weight tracking,
Recovery Lab, Life Design Lab.

### Phase 5 (MVP 5) — Scale

Infrastructure: Evaluate D1 sharding if write volume justifies it.

Features: Multi-chapter activation, mentorship platform, corporate platform.

---

## 9. Performance Architecture

### 9.1 Target Metrics

```
LCP (Largest Contentful Paint): < 2.5s on mid-range Android, 3G network
FID (First Input Delay):        < 100ms
CLS (Cumulative Layout Shift):  < 0.1
Bundle size (initial JS):       < 150KB gzipped
API response time (p95):        < 200ms (cached), < 500ms (D1 query)
```

### 9.2 PWA Service Worker Strategy

```
App Shell (cache-first, stale-while-revalidate):
  → index.html, main JS bundle, CSS, icons, fonts
  → Cached on first visit, updated in background on new deploy

Feed Content (network-first, cache fallback):
  → /v1/rooms/:id/posts — always try network, fall back to last cached page
  → /v1/me/profile — network-first

Daily Content (network-first, specific fallback):
  → /v1/daily-content/today — network-first
  → On offline: show cached today's content if available,
    otherwise show "You're offline — connect to see today's daily" message
  → Never show yesterday's daily as "today's"

Static Assets (cache-first, content-hash busting):
  → All assets from Pages CDN have content hashes in filenames
  → Cache indefinitely, new deploy automatically produces new hashes

Push Notifications:
  → Web Push API via service worker
  → Notification click → focus or open app to relevant route
  → Notification payload: { title, body, url, icon }
```

### 9.3 Image Optimization

All images served from R2 pass through Cloudflare Image Resizing:

```
Avatar (profile):
  → Original stored in R2 at full resolution
  → Served via: /cdn-cgi/image/width=96,height=96,fit=cover,format=auto/{r2-path}
  → Sizes: 48px, 96px, 192px (srcset)

Event cover:
  → Stored in R2
  → Served at: width=400, format=auto for card thumbnails
  → Served at: width=1200, format=auto for detail view

Post media:
  → Max upload: 10MB
  → Stored in R2 original
  → Served resized based on display context

Detector report (PDF):
  → Never resized — served as-is via signed URL
```

---

## 10. Security Architecture Summary

Full detail in SECURITY.md. Summary:

- All auth tokens stored in httpOnly cookies + in-memory only (never localStorage)
- Subscription gates enforced at Worker middleware, not React components
- R2 Detector PDFs served only via time-limited signed URLs to verified Premium members
- Rate limiting at the edge via KV counters (auth endpoints: 5 attempts / 5 min per IP)
- Role hierarchy: Member < Moderator < House Lead < Admin < Founder
- All admin routes protected by role check middleware
- Soft deletes only — no data is permanently deleted at the application layer
- GDPR: member data export and deletion endpoints exist from Phase 1

---

## 11. Monorepo Structure

```
alphaminds-commons/
├── apps/
│   ├── web/                      → React + Vite PWA
│   │   ├── src/
│   │   │   ├── components/
│   │   │   ├── pages/
│   │   │   ├── hooks/
│   │   │   ├── store/
│   │   │   ├── lib/
│   │   │   └── service-worker/
│   │   ├── public/
│   │   ├── index.html
│   │   └── vite.config.ts
│   └── workers/
│       ├── api/                  → Main API Worker
│       ├── cron/                 → Cron Trigger handlers
│       ├── webhooks/             → Payment webhooks
│       ├── media/                → Signed URL generator
│       └── shared/               → Shared middleware, types, utilities
├── packages/
│   ├── types/                    → Shared TypeScript types (DB rows, API shapes)
│   └── constants/                → House enums, tier enums, shared constants
├── migrations/                   → D1 SQL migration files
│   ├── 0001_initial_schema.sql
│   ├── 0002_add_detectors.sql
│   └── ...
├── scripts/
│   ├── seed.ts                   → Local D1 seeding script
│   └── migrate.ts                → Migration runner
├── docs/
│   ├── ARCHITECTURE.md           ← this file
│   ├── SCHEMA.md
│   ├── API.md
│   ├── FRONTEND.md
│   ├── SECURITY.md
│   ├── FEATURES.md
│   ├── RUNBOOK.md
│   └── AGENT.md
├── wrangler.toml                 → Cloudflare Workers config
└── package.json
```

---

## 12. Key Architectural Decisions Log

| Decision | Choice | Reasoning | Reversal Condition |
|---|---|---|---|
| DB architecture | Single D1 database | Cross-chapter queries, admin dashboard, simpler ops | >500k members, single chapter at >60% write load |
| Router | Hono.js in Worker | Edge-native, minimal bundle, TypeScript-first | Never — Hono is the right tool |
| Frontend framework | React + Vite | Team familiarity, Lovable.dev compatibility | Never at this scale |
| Auth tokens | KV-backed sessions (not stateless JWT) | Immediate revocation capability, no JWT secret rotation risk | Never — revocability is non-negotiable |
| Real-time chat | Deferred to Phase 2 (Durable Objects) | Adds significant complexity with zero Phase 1 users | Phase 2 milestone |
| Payments | Paystack + Stripe both | Paystack for African markets (better rates, local methods) | Single global provider only if Paystack adds full global coverage |
| Image serving | R2 + CF Image Resizing | Zero egress cost, on-the-fly resize, no separate service | Never — CF native is the right choice |
| Pagination | Cursor-based | Consistent results during concurrent writes; offset breaks on inserts | Never — offset pagination is prohibited |
| Soft deletes | Yes, all tables | Audit trail, GDPR export, accidental deletion recovery | Never |
