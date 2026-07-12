# AlphaMinds Commons

A community platform organized around the **Five Houses** of human flourishing — Becoming, Connection, Wellness, Play, and Humanity. Built as a Progressive Web App (PWA) entirely on the Cloudflare developer platform: Workers (edge functions), D1 (SQLite), KV (caching), and R2 (object storage).

The platform connects members through houses, rooms, events, challenges, and daily content. It launches with a single founding chapter and is architected for multi-chapter global scale.

## Current Status — MVP

The MVP is live at **https://alphaminds.alphamindsdev.workers.dev** with:
- Authentication (register/login/logout, password reset via email)
- Member profiles with bio, house memberships, streak, points
- Five houses with score tracking and progress bars
- Discussion rooms with posts, comments, reactions (like/share)
- Events with RSVP
- Challenges with tracking and progress
- Daily content cards with completion tracking
- Admin dashboard (create daily content, member management)
- Settings page (theme, notifications, privacy, account management)
- Notifications system
- Subscription management (free tier currently)
- Responsive design (mobile-first with bottom nav, desktop sidebar)

### Infrastructure

| Resource | Detail |
|----------|--------|
| Frontend | React 19 + Vite 8 + Tailwind CSS, served via Workers Assets |
| Backend | Cloudflare Workers + Hono.js REST API at `/v1/*` |
| Database | Cloudflare D1 (SQLite) — `alphaminds-commons` |
| Cache/State | Cloudflare KV — 6 namespaces (sessions, subscription cache, daily delivery, rate limits, content schedule, chapter config) |
| Storage | Cloudflare R2 — 2 buckets (media uploads, database backups) |
| Email | Resend API (transactional: password reset, weekly summary, notifications) |
| Payments | Paystack + Stripe webhooks configured (ready for Phase 3) |
| CI/CD | GitHub → Cloudflare Workers Builds (auto-deploy on push to `master`) |

## Project Structure

```
workers/
  api/src/          → REST API — routers for auth, members, houses, rooms,
  │                    posts, events, challenges, daily content, admin, media
  │   middleware/   → Auth, rate limiting, RBAC, CORS, subscription tier checks
  │   lib/          → DB, KV, R2, session, password, email, push, validation
  │   index.ts      → Hono app entry, route mounting
  cron/src/         → 7 scheduled handlers triggered by cron
  │   handlers/     → dailyContent, weeklyReset, streakAudit, leaderboard,
  │                    impactScore, weeklySummary, d1Backup
  │   index.ts      → Scheduled event router
  │   lib.ts        → Cron logging utilities
  webhooks/src/     → Paystack + Stripe webhook handlers (Phase 3)
  shared/           → Types (zod), constants (tiers, error codes), error helpers
src/                → React + Vite frontend
  routes/           → TanStack Router route pages
  components/       → Reusable UI (layout, common, posts, daily, challenges)
  hooks/            → TanStack Query + REST API hooks
  lib/              → API client, constants, types, utilities
  store/            → Zustand stores (auth, theme)
migrations/         → D1 SQL migrations (37 tables)
scripts/            → patch.mjs (build post-process), seed.ts
```

## Prerequisites

- **Node.js** >= 20.0.0 (LTS)
- **npm** >= 10.0.0 (or **bun** >= 1.2.0)
- **Wrangler** >= 4.0.0 — `npm install -g wrangler`
- **Git** >= 2.40.0

Authenticate with Cloudflare: `wrangler login`

## First-Time Setup

```bash
# 1. Install dependencies
npm install

# Cloudflare resources must already exist (D1, KV, R2).
# IDs are configured in wrangler.toml.

# 2. Set up environment files
cp .env.example .env.local        # Frontend environment
cp .dev.vars.example .dev.vars    # Worker secrets (gitignored)

# 3. Run database migrations
npm run migrate:local

# 4. Seed the database (creates houses, rooms, daily content, admin)
npm run seed

# 5. Start development servers
npm run dev
```

## Local Development

| Command | Description |
|---|---|
| `npm run dev` | Start frontend (Vite, :8080) + backend (Wrangler, :8787) concurrently |
| `npm run dev:web` | Start Vite dev server only |
| `npm run dev:worker` | Start Wrangler local worker only |
| `npm run build` | Build frontend + SSR for production (also runs patch.mjs) |
| `npm run type-check` | TypeScript check for both frontend and workers |
| `npm run lint` | Run ESLint across the codebase |
| `npm run format` | Format code with Prettier |
| `npm run migrate:local` | Apply D1 migrations to local database |
| `npm run seed` | Seed local D1 database with initial data |
| `npm run db:reset` | Reset local database (migrate + seed) |

Frontend: http://localhost:8080
API: http://localhost:8787/v1/...

## Deployment

The project uses **Cloudflare Workers Builds** (CI). Every push to `master` triggers an auto-build and deploy at:
- **https://alphaminds.alphamindsdev.workers.dev**

Manual deploy:
```bash
npm run build        # Build + patch
npx wrangler deploy  # Deploy .output/server/ (the built worker)
```

### Secrets (set via Wrangler, never commit)

```bash
wrangler secret put JWT_SESSION_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put WEB_PUSH_VAPID_PRIVATE
wrangler secret put WEB_PUSH_VAPID_PUBLIC
wrangler secret put ADMIN_ALERT_EMAIL
```

## Cron Triggers — Free Plan (5 Slots)

Cloudflare Workers **Free plan allows up to 5 Cron Triggers per account** (not per worker). CPU time is capped at 10ms per invocation — DB queries and KV/network I/O don't count toward this limit, so these handlers fit within it.

**5 cron triggers are active** in Phase 1:

| # | Handler | Schedule | What It Does |
|---|---------|----------|-------------|
| 1 | **Daily Content Delivery** | `0 5 * * *` (5 AM) | Fetches scheduled daily content, caches it in KV, and creates delivery records for all active members |
| 2 | **Streak Audit** | `30 0 * * *` (12:30 AM) | Resets `current_streak_days` to 0 for members inactive since yesterday |
| 3 | **Leaderboard Recalculation** | `0 1 * * *` (1 AM) | Recalculates all-time and weekly leaderboard rankings per chapter and globally |
| 4 | **Weekly Challenge Reset** | `0 0 * * 1` (Mon midnight) | Marks ended challenges as completed/abandoned based on targets |
| 5 | **D1 Backup Export** | `0 4 * * *` (4 AM) | Exports D1 database as SQL and uploads to R2 backup bucket |

**Dropped from free tier** (to stay under 5-trigger limit):
- `Impact Score Recalculation` — nice-to-have metric, enable when upgrading
- `Weekly Summary Email` — engagement email, can be triggered manually or via admin

### Upgrading to Workers Paid ($5/month)

Paid plan unlocks:
- **250 cron triggers** per account
- **30s CPU time** per invocation (vs 10ms on free)
- Add the 2 dropped handlers back by uncommenting them in `wrangler.toml`

## Build & Patch System

Nitro bundles everything into `.output/server/`. The `build` script (`vite build && node scripts/patch.mjs`) applies two patches:

### 1. API Routing Bypass (`index.mjs`)
Adds a static import of `_ssr/ssr.mjs` and intercepts `/v1/*` requests to call `__ssr.fetch(cfRequest, env, context)` directly — bypassing the h3 pipeline so Hono API routes get Cloudflare bindings and POST bodies aren't consumed prematurely.

### 2. Deploy Config Cleanup (`wrangler.json`)
Removes `env` blocks (staging/production environments) from the Nitro-generated `wrangler.json` to avoid Cloudflare's "Redirected configurations cannot include environments" validation error. Cron triggers are kept — the free plan supports up to 5.

## API Overview

| Base Path | Module | Auth |
|-----------|--------|------|
| `POST /v1/auth/register` | Register | No |
| `POST /v1/auth/login` | Login | No |
| `GET /v1/auth/me` | Current user | Yes |
| `GET /v1/houses` | List houses | Yes |
| `GET /v1/houses/:id` | House detail | Yes |
| `GET /v1/me/profile` | My profile | Yes |
| `PATCH /v1/me/profile` | Update profile | Yes |
| `GET /v1/chapters/:id/rooms` | List rooms | Yes |
| `GET /v1/rooms/:id/posts` | List posts | Yes |
| `POST /v1/rooms/:id/posts` | Create post | Yes |
| `GET /v1/posts/:id` | Post detail | Yes |
| `POST /v1/posts/:id/reactions` | Toggle reaction | Yes |
| `POST /v1/posts/:id/comments` | Add comment | Yes |
| `GET /v1/chapters/:id/events` | List events | Yes |
| `POST /v1/events/:id/rsvp` | RSVP | Yes |
| `GET /v1/challenges` | List challenges | Yes |
| `POST /v1/challenges/:id/join` | Join challenge | Yes |
| `POST /v1/challenges/:id/log` | Log progress | Yes |
| `GET /v1/daily-content/today` | Today's content | Yes |
| `POST /v1/daily-content/:id/complete` | Mark complete | Yes |
| `POST /v1/admin/daily-content` | Create content | Admin |
| `GET /v1/admin/daily-content` | List content | Admin |
| `PATCH /v1/admin/daily-content/:id` | Update content | Admin |
| `DELETE /v1/me/account` | Delete account | Yes |

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS 4, Framer Motion |
| Routing | TanStack Router v1 |
| Server State | TanStack Query v5 |
| Client State | Zustand v5 |
| SSR/Bundling | TanStack Start + Nitro v3 (preset: `cloudflare-module`) |
| API Framework | Hono.js v4 |
| Database | Cloudflare D1 (SQLite via wrangler) |
| Cache | Cloudflare KV (6 namespaces) |
| Storage | Cloudflare R2 (media + backups) |
| Email | Resend API |
| Payments | Paystack + Stripe (webhook-ready) |
| CI/CD | Cloudflare Workers Builds (GitHub connected) |
| UI Components | Radix UI primitives, shadcn/ui, Sonner (toasts), Lucide icons |

## Key Design Decisions

- **Dual routing**: TanStack Router for SSR pages, Hono for REST API (`/v1/*`). The patch script bridges them so Hono gets Cloudflare bindings directly.
- **Mobile-first**: Bottom nav on mobile, collapsible sidebar on desktop. Top bar only visible on mobile.
- **Five Houses**: Core gamification — each member has a primary house and can earn scores across all five. Houses map to weekly daily content themes.
- **No cron triggers on free plan**: All scheduled jobs are documented and wired up but disabled. Manually triggerable via admin endpoint or Cloudflare dashboard.
- **Hyphen-free writeups**: All writeup content runs through `cleanWriteup()` in `src/lib/utils.ts` which strips em dashes, en dashes, and double hyphens to avoid AI-generated-text appearance.

## Next Steps / Phase 2

| Feature | Status |
|---------|--------|
| Upgrade to Workers Paid ($5/mo) + enable 3 crons | Pending |
| Member admin panel (edit members, assign roles) | Pending |
| Leaderboard UI on frontend | Pending |
| Push notifications (Web Push API) | Pending |
| Media uploads (R2) for posts | Pending |
| Email verification flow | Pending |
| Subscription tiers (free vs premium) | Pending |
| Chapter system (multi-chapter) | Stubbed |
| Payment processing (Paystack + Stripe) | Webhooks wired, UI pending |

## Documentation

Full documentation is in the `/docs` folder (legacy, may be partially out of date):
- **ARCHITECTURE.md** — System design and infrastructure decisions
- **SCHEMA.md** — D1 table definitions, columns, indexes, and seed data
- **API.md** — Endpoint reference with typed request/response shapes
- **SECURITY.md** — Auth flow, RBAC, rate limiting, R2 access control
- **FEATURES.md** — Feature-to-infrastructure map and phase boundaries
- **RUNBOOK.md** — Wrangler commands, migrations, secrets, deployment
- **FRONTEND.md** — Frontend architecture and hook conventions
- **AGENT.md** — Rules for AI coding agents working on this project
