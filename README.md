# AlphaMinds Commons

A community platform organized around the Five Houses of human flourishing — Becoming, Connection, Wellness, Play, and Humanity. Built as a Progressive Web App (PWA) entirely on the Cloudflare developer platform: Workers (edge functions), D1 (SQLite), KV (caching), and R2 (object storage).

The platform connects members through houses, rooms, events, challenges, and daily content. It launches with a single founding chapter and is architected for multi-chapter global scale. Features include authentication, member profiles, discussion rooms with posts/comments/reactions, event RSVPs, challenge tracking, daily content delivery, and an admin dashboard.

## Prerequisites

- **Node.js** >= 20.0.0 (LTS)
- **npm** >= 10.0.0
- **Wrangler** >= 3.0.0 — `npm install -g wrangler`
- **Git** >= 2.40.0

Authenticate with Cloudflare: `wrangler login`

## First-Time Setup

```bash
# 1. Install dependencies
npm install

# 2. Create Cloudflare resources (one-time per environment)
#    See docs/RUNBOOK.md section 4 for full instructions:
#    - Create D1 database: wrangler d1 create alphaminds-commons
#    - Create 6 KV namespaces
#    - Create 2 R2 buckets
#    - Add all IDs to wrangler.toml

# 3. Set up environment files
cp .env.example .env.local        # Frontend environment
cp .dev.vars.example .dev.vars    # Worker secrets (gitignored)

# 4. Run database migrations
npm run migrate:local

# 5. Seed the database
npm run seed

# 6. Start development servers
npm run dev
```

## Local Development

| Command | Description |
|---|---|
| `npm run dev` | Start frontend (Vite) + backend (Wrangler) concurrently |
| `npm run dev:web` | Start Vite dev server only (http://localhost:5173) |
| `npm run dev:worker` | Start Wrangler local worker only (http://localhost:8787) |
| `npm run build` | Build frontend for production |
| `npm run type-check` | TypeScript check for both frontend and workers |
| `npm run lint` | Run ESLint across the codebase |
| `npm run format` | Format code with Prettier |
| `npm run migrate:local` | Apply D1 migrations to local database |
| `npm run seed` | Seed local D1 database with initial data |
| `npm run db:reset` | Reset local database (migrate + seed) |

## Deployment

```bash
# Deploy the API worker
npm run deploy:worker

# Deploy the frontend to Cloudflare Pages
npm run deploy:web

# Deploy both
npm run build && npm run deploy:worker && npm run deploy:web
```

### Production Secrets

Set secrets via Wrangler (never commit them):

```bash
wrangler secret put JWT_SESSION_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put WEB_PUSH_VAPID_PRIVATE
wrangler secret put WEB_PUSH_VAPID_PUBLIC
wrangler secret put ADMIN_ALERT_EMAIL
```

## Project Structure

```
workers/              → Cloudflare Workers (backend)
  api/src/            → REST API routes (Hono.js)
  cron/src/           → Cron trigger handlers
  webhooks/src/       → Payment webhook stubs (Phase 3)
  shared/             → Shared types, constants, errors
  tsconfig.json       → Workers TypeScript config
src/                  → React + Vite frontend
  pages/              → Route pages
  components/         → Reusable UI components
  hooks/              → Custom React hooks (TanStack Query)
  lib/                → API client, utilities
  store/              → Zustand stores
migrations/           → D1 SQL migrations
scripts/              → Seed scripts
wrangler.toml         → Worker configuration
```

## Documentation

Full documentation is in the `/docs` folder:

- **ARCHITECTURE.md** — System design and infrastructure decisions
- **SCHEMA.md** — D1 table definitions, columns, indexes, and seed data
- **API.md** — Endpoint reference with typed request/response shapes
- **SECURITY.md** — Auth flow, RBAC, rate limiting, R2 access control
- **FEATURES.md** — Feature-to-infrastructure map and phase boundaries
- **RUNBOOK.md** — Wrangler commands, migrations, secrets, deployment
- **FRONTEND.md** — Frontend architecture and hook conventions
- **AGENT.md** — Rules for AI coding agents working on this project

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite 8, TypeScript, Tailwind CSS, Framer Motion |
| Routing | React Router v6 |
| Server State | TanStack Query |
| Client State | Zustand |
| Backend | Cloudflare Workers, Hono.js |
| Database | Cloudflare D1 (SQLite) |
| Cache | Cloudflare KV (6 namespaces) |
| Storage | Cloudflare R2 (media, backups) |
| Email | Resend |
| Payments | Paystack + Stripe (Phase 3) |
