# RUNBOOK.md
# AlphaMinds Commons — Development & Deployment Runbook
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. Prerequisites

Before doing anything in this runbook, ensure the following are installed
and configured on your development machine:

```bash
# Required tools
node       >= 20.0.0   (LTS)
npm        >= 10.0.0
wrangler   >= 3.0.0    (Cloudflare CLI)
git        >= 2.40.0

# Install Wrangler globally
npm install -g wrangler

# Verify Wrangler version
wrangler --version

# Authenticate with Cloudflare
wrangler login
# This opens a browser window. Log in with the AlphaMinds Cloudflare account.
# Verify authentication:
wrangler whoami
```

---

## 1. Repository Setup

```bash
# Clone the repository
git clone https://github.com/alphaminds/alphaminds-commons.git
cd alphaminds-commons

# Install all workspace dependencies (monorepo)
npm install

# Verify workspace structure
ls apps/     # should show: web, workers
ls packages/ # should show: types, constants
```

---

## 2. Environment Variables

### 2.1 Frontend (React PWA)

```bash
# apps/web/.env.local (create this file, it is gitignored)
VITE_API_BASE_URL=http://localhost:8787/v1
VITE_CDN_BASE_URL=http://localhost:8787/cdn
VITE_WEB_PUSH_VAPID_PUBLIC=<your-vapid-public-key>
VITE_APP_ENV=development
```

### 2.2 Workers (Backend)

```bash
# apps/workers/.dev.vars (create this file, it is gitignored)
# This file is read by `wrangler dev` as local environment secrets.

JWT_SESSION_SECRET=dev-secret-change-in-production-min-32-chars
PAYSTACK_SECRET_KEY=sk_test_your_paystack_test_key
PAYSTACK_WEBHOOK_SECRET=whsec_your_paystack_webhook_secret
STRIPE_SECRET_KEY=sk_test_your_stripe_test_key
STRIPE_WEBHOOK_SECRET=whsec_your_stripe_webhook_secret
RESEND_API_KEY=re_your_resend_api_key
WEB_PUSH_VAPID_PRIVATE=your_vapid_private_key
WEB_PUSH_VAPID_PUBLIC=your_vapid_public_key
ADMIN_ALERT_EMAIL=admin@alphaminds.com
ENVIRONMENT=development
```

### 2.3 VAPID Key Generation (Web Push)

VAPID keys are generated once and used permanently. Do not regenerate these
after your first push notification is sent.

```bash
# Generate VAPID key pair
npx web-push generate-vapid-keys

# Output:
# Public Key: BExample...
# Private Key: example...

# Add public key to apps/web/.env.local
# Add private key to apps/workers/.dev.vars
# Add both to production secrets (see §8)
```

---

## 3. Wrangler Configuration (`wrangler.toml`)

```toml
# wrangler.toml (at monorepo root)
name = "alphaminds-api"
main = "apps/workers/api/src/index.ts"
compatibility_date = "2024-01-01"
compatibility_flags = ["nodejs_compat"]

# D1 Database binding
[[d1_databases]]
binding = "DB"
database_name = "alphaminds-commons"
database_id = ""   # Fill in after creating the D1 database (see §4)

# KV Namespaces
[[kv_namespaces]]
binding = "ALPHAMINDS_SESSIONS"
id = ""               # Fill in after creating (see §4)
preview_id = ""       # Preview environment namespace ID

[[kv_namespaces]]
binding = "ALPHAMINDS_SUBSCRIPTION_CACHE"
id = ""
preview_id = ""

[[kv_namespaces]]
binding = "ALPHAMINDS_DAILY_DELIVERY"
id = ""
preview_id = ""

[[kv_namespaces]]
binding = "ALPHAMINDS_RATE_LIMITS"
id = ""
preview_id = ""

[[kv_namespaces]]
binding = "ALPHAMINDS_CONTENT_SCHEDULE_CACHE"
id = ""
preview_id = ""

[[kv_namespaces]]
binding = "ALPHAMINDS_CHAPTER_CONFIG"
id = ""
preview_id = ""

# R2 Buckets
[[r2_buckets]]
binding = "MEDIA_BUCKET"
bucket_name = "alphaminds-media"
preview_bucket_name = "alphaminds-media-preview"

[[r2_buckets]]
binding = "BACKUP_BUCKET"
bucket_name = "alphaminds-backups"
preview_bucket_name = "alphaminds-backups-preview"

# Cron Triggers
[triggers]
crons = [
  "0 5 * * *",     # Daily content delivery
  "0 0 * * 1",     # Weekly challenge reset (Monday 00:00 UTC)
  "30 0 * * *",    # Streak audit
  "0 1 * * *",     # Leaderboard recalculation
  "0 2 * * 1",     # Impact score recalculation (Monday 02:00 UTC)
  "0 3 * * 0",     # Weekly summary email (Sunday 03:00 UTC)
  "0 4 * * *",     # D1 backup export
]

# Environment-specific overrides
[env.production]
name = "alphaminds-api-production"

[env.staging]
name = "alphaminds-api-staging"
```

---

## 4. First-Time Cloudflare Resource Creation

Run these commands once per environment (once for production, once for local dev).
Record the IDs returned and add them to `wrangler.toml`.

### 4.1 Create D1 Database

```bash
# Create the production database
wrangler d1 create alphaminds-commons
# Output: database_id = "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
# Add this to wrangler.toml: database_id = "..."

# Create a preview database for development
wrangler d1 create alphaminds-commons-preview
# Add to wrangler.toml: preview_id = "..."
```

### 4.2 Create KV Namespaces

```bash
# Run this for each KV namespace:
wrangler kv:namespace create ALPHAMINDS_SESSIONS
wrangler kv:namespace create ALPHAMINDS_SESSIONS --preview

wrangler kv:namespace create ALPHAMINDS_SUBSCRIPTION_CACHE
wrangler kv:namespace create ALPHAMINDS_SUBSCRIPTION_CACHE --preview

wrangler kv:namespace create ALPHAMINDS_DAILY_DELIVERY
wrangler kv:namespace create ALPHAMINDS_DAILY_DELIVERY --preview

wrangler kv:namespace create ALPHAMINDS_RATE_LIMITS
wrangler kv:namespace create ALPHAMINDS_RATE_LIMITS --preview

wrangler kv:namespace create ALPHAMINDS_CONTENT_SCHEDULE_CACHE
wrangler kv:namespace create ALPHAMINDS_CONTENT_SCHEDULE_CACHE --preview

wrangler kv:namespace create ALPHAMINDS_CHAPTER_CONFIG
wrangler kv:namespace create ALPHAMINDS_CHAPTER_CONFIG --preview

# Each command outputs an ID. Add all IDs to wrangler.toml.
```

### 4.3 Create R2 Buckets

```bash
wrangler r2 bucket create alphaminds-media
wrangler r2 bucket create alphaminds-media-preview
wrangler r2 bucket create alphaminds-backups
wrangler r2 bucket create alphaminds-backups-preview

# Configure public access for alphaminds-media:
# Go to Cloudflare Dashboard → R2 → alphaminds-media → Settings → Public Access
# Enable public access and set custom domain: cdn.alphaminds.com
# (Configure DNS CNAME: cdn → {bucket}.r2.cloudflarestorage.com)

# alphaminds-backups: keep private (no public access)
```

---

## 5. Database Migrations

### 5.1 Running Migrations (Local)

```bash
# Run all pending migrations against the local preview D1 database
wrangler d1 migrations apply alphaminds-commons-preview --local

# Run against the remote preview database
wrangler d1 migrations apply alphaminds-commons-preview

# Verify migration state
wrangler d1 execute alphaminds-commons-preview --local --command \
  "SELECT * FROM _cf_KV ORDER BY id DESC LIMIT 5;"
```

### 5.2 Running Migrations (Production)

```bash
# CAUTION: This writes to the production database.
# Always run against preview first and verify.

# Step 1: Dry run (shows what will be executed without running it)
wrangler d1 migrations apply alphaminds-commons --dry-run

# Step 2: Apply to production (requires explicit confirmation)
wrangler d1 migrations apply alphaminds-commons

# Step 3: Verify
wrangler d1 execute alphaminds-commons --command \
  "SELECT name, applied_at FROM _migrations ORDER BY applied_at DESC LIMIT 5;"
```

### 5.3 Creating a New Migration

```bash
# Migrations are numbered sequentially. Find the next number:
ls migrations/

# Create the new migration file:
touch migrations/0002_add_detectors.sql

# Write the SQL (additive only — no DROP COLUMN, no RENAME COLUMN):
# CREATE TABLE IF NOT EXISTS ...
# CREATE INDEX IF NOT EXISTS ...
# ALTER TABLE ... ADD COLUMN ... (with DEFAULT value)
```

### 5.4 Direct D1 Queries (Debugging)

```bash
# Execute a query against local preview D1
wrangler d1 execute alphaminds-commons-preview --local \
  --command "SELECT COUNT(*) as member_count FROM members;"

# Execute against remote (production) — use carefully
wrangler d1 execute alphaminds-commons \
  --command "SELECT COUNT(*) FROM members WHERE deleted_at IS NULL;"

# Execute a file of SQL
wrangler d1 execute alphaminds-commons-preview --local \
  --file scripts/debug-query.sql
```

---

## 6. Seeding Local Data

```bash
# Run the seed script against the local preview D1 database
npm run seed

# What the seed script does (scripts/seed.ts):
# 1. Inserts the 5 house records (idempotent — INSERT OR IGNORE)
# 2. Inserts the global chapter record
# 3. Inserts 3 sample rooms (one per house for the founding chapter)
# 4. Inserts 3 sample challenges (walking, reading, gratitude)
# 5. Inserts 7 sample daily content items (one per day of week)
# 6. Creates 1 admin member account: admin@alphaminds.com / admin123

# Seed a specific data category only:
npm run seed -- --only houses
npm run seed -- --only rooms
npm run seed -- --only daily-content
npm run seed -- --only challenges

# Reset local database and re-seed (WARNING: destroys all local data)
npm run db:reset
```

---

## 7. Local Development

### 7.1 Start the API Worker

```bash
cd apps/workers
wrangler dev --local

# Worker will start at: http://localhost:8787
# D1 will use the local preview database
# KV will use in-memory local storage
# R2 will use a local directory

# With watch mode (auto-restart on file change):
wrangler dev --local --watch
```

### 7.2 Start the Frontend

```bash
cd apps/web
npm run dev

# Vite dev server starts at: http://localhost:5173
# API calls proxy to: http://localhost:8787
# PWA features: available at http://localhost:5173 (service worker limited in dev)
```

### 7.3 Start Both Concurrently

```bash
# From monorepo root
npm run dev

# This runs both Worker and Vite concurrently using concurrently package
```

### 7.4 Test the API

```bash
# Register a member
curl -X POST http://localhost:8787/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "display_name": "Test User",
    "password": "testpassword123",
    "primary_house": "becoming"
  }'

# Login
curl -X POST http://localhost:8787/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "testpassword123"}'

# Get today's daily content (replace TOKEN with the token from login response)
curl http://localhost:8787/v1/daily-content/today \
  -H "Authorization: Bearer TOKEN"

# Get all houses
curl http://localhost:8787/v1/houses \
  -H "Authorization: Bearer TOKEN"
```

### 7.5 Trigger a Cron Manually (Local)

```bash
# Test the daily content delivery cron locally
curl -X POST http://localhost:8787/__scheduled?cron=0+5+*+*+*

# Test the streak audit cron
curl -X POST http://localhost:8787/__scheduled?cron=30+0+*+*+*
```

---

## 8. Production Secret Management

Secrets are NEVER committed to git. They live in Cloudflare's secret store.

```bash
# Set a production secret
wrangler secret put JWT_SESSION_SECRET
# Prompts for the value interactively (does not echo to terminal)

wrangler secret put PAYSTACK_SECRET_KEY
wrangler secret put PAYSTACK_WEBHOOK_SECRET
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put STRIPE_WEBHOOK_SECRET
wrangler secret put RESEND_API_KEY
wrangler secret put WEB_PUSH_VAPID_PRIVATE
wrangler secret put WEB_PUSH_VAPID_PUBLIC
wrangler secret put ADMIN_ALERT_EMAIL

# List all secrets (shows names only, not values)
wrangler secret list

# Delete a secret (use when rotating)
wrangler secret delete OLD_SECRET_NAME
```

### 8.1 Secret Rotation

If a secret is compromised:
1. Generate a new value
2. `wrangler secret put {SECRET_NAME}` with the new value
3. The Worker picks up the new secret on its next cold start (within seconds)
4. For JWT_SESSION_SECRET: all existing sessions are NOT invalidated (they're in KV,
   not validated against the secret in this architecture). Rotating this secret only
   affects future sessions if you were using stateful JWT validation.
5. For payment provider secrets: update in Paystack/Stripe dashboard simultaneously

---

## 9. Deployment

### 9.1 Deploy the Worker

```bash
# Deploy to production
wrangler deploy

# Deploy to staging environment
wrangler deploy --env staging

# Deploy and immediately tail logs
wrangler deploy && wrangler tail
```

### 9.2 Deploy the Frontend (Manual)

```bash
cd apps/web

# Build the PWA
npm run build

# Preview the build locally
npm run preview

# Deploy to Cloudflare Pages (usually automatic via GitHub, but can be manual)
wrangler pages deploy dist --project-name alphaminds-commons

# Or build and deploy in one command:
npm run build && wrangler pages deploy dist --project-name alphaminds-commons
```

### 9.3 GitHub → Cloudflare Pages Auto-Deploy

The frontend auto-deploys via GitHub integration. No manual deploy needed for
the frontend after the initial Cloudflare Pages project setup.

**Setup (one-time):**
1. Cloudflare Dashboard → Pages → Create a project
2. Connect GitHub → select `alphaminds/alphaminds-commons` repository
3. Build settings:
   - Build command: `cd apps/web && npm run build`
   - Output directory: `apps/web/dist`
   - Root directory: `/` (monorepo root)
4. Environment variables: Add `VITE_API_BASE_URL=https://api.alphaminds.com/v1`
5. Every push to `main` triggers a production deploy
6. Every PR creates a preview deploy

---

## 10. Monitoring & Observability

### 10.1 Worker Logs (Real-time)

```bash
# Tail live Worker logs from production
wrangler tail

# Tail with filter (only errors)
wrangler tail --status error

# Tail with filter (specific endpoint)
wrangler tail --search "POST /v1/auth"
```

### 10.2 Cron Job Health

```bash
# Check recent cron execution logs from D1
wrangler d1 execute alphaminds-commons \
  --command "SELECT job_name, status, started_at, completed_at, error_message
             FROM cron_execution_logs
             ORDER BY started_at DESC LIMIT 20;"

# Check if daily content delivery ran today
wrangler d1 execute alphaminds-commons \
  --command "SELECT * FROM cron_execution_logs
             WHERE job_name = 'daily_content_delivery'
             AND DATE(started_at) = DATE('now');"
```

### 10.3 D1 Health Queries

```bash
# Member count
wrangler d1 execute alphaminds-commons \
  --command "SELECT COUNT(*) as total FROM members WHERE deleted_at IS NULL;"

# Today's daily content delivery count
wrangler d1 execute alphaminds-commons \
  --command "SELECT COUNT(*) as delivered FROM daily_content_deliveries
             WHERE delivery_date = DATE('now');"

# Active subscriptions by tier
wrangler d1 execute alphaminds-commons \
  --command "SELECT tier, COUNT(*) as count FROM subscriptions
             WHERE status = 'active' GROUP BY tier;"

# Recent post activity (last 24h)
wrangler d1 execute alphaminds-commons \
  --command "SELECT COUNT(*) as posts_24h FROM posts
             WHERE created_at > datetime('now', '-24 hours')
             AND deleted_at IS NULL;"
```

### 10.4 KV Inspection

```bash
# Check a specific session (replace TOKEN)
wrangler kv:key get --namespace-id {SESSIONS_NAMESPACE_ID} "session:TOKEN"

# List all KV keys (useful for debugging, not for production queries)
wrangler kv:key list --namespace-id {SESSIONS_NAMESPACE_ID} --prefix "daily:"

# Check subscription cache for a member
wrangler kv:key get --namespace-id {SUB_CACHE_NAMESPACE_ID} "sub:{member_id}"
```

---

## 11. Rollback Procedures

### 11.1 Frontend Rollback

Cloudflare Pages keeps a deployment history. Rolling back is instant:

```
1. Go to: Cloudflare Dashboard → Pages → alphaminds-commons → Deployments
2. Find the last known-good deployment
3. Click "Rollback to this deployment"
4. The CDN updates within 30 seconds globally
5. Service worker on clients will pick up the rolled-back version on next page load
```

### 11.2 Worker Rollback

```bash
# List recent deployments
wrangler deployments list

# Rollback to a specific deployment ID
wrangler rollback {deployment_id}

# Rollback to the previous deployment (most common)
wrangler rollback
```

### 11.3 Database Migration Rollback

**There is no automatic rollback for D1 migrations.** This is why migrations must
be additive. If a migration added a bad column:
- Write a NEW migration that adds a corrected column with a different name
- Deprecate the bad column (do not use it in application code)
- Remove it in a later migration after confirming it is unused

If a migration caused data corruption (extremely rare with additive-only migrations):
1. Stop the Worker immediately: `wrangler deploy` a version with the affected endpoint
   returning 503 with a maintenance message
2. Restore from R2 backup (see §12)
3. Re-apply only safe migrations
4. Redeploy the Worker

---

## 12. Backup & Restore

### 12.1 D1 Backup (Automated)

The Cron Trigger at `0 4 * * *` exports a D1 backup to R2 daily.

```typescript
// Simplified backup Cron handler
export async function handleD1Backup(env: Env) {
  const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  // Export D1 data via D1 REST API → upload to R2
  const exportResult = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${env.CF_ACCOUNT_ID}/d1/database/${env.DB_ID}/export`,
    { headers: { Authorization: `Bearer ${env.CF_API_TOKEN}` } }
  );

  const exportData = await exportResult.arrayBuffer();
  await env.BACKUP_BUCKET.put(`d1/${today}/backup.sql`, exportData);
}
```

### 12.2 Manual Backup

```bash
# Export D1 database to a local SQL file
wrangler d1 export alphaminds-commons --output=./backups/$(date +%Y%m%d)-backup.sql

# Verify the export
wc -l ./backups/$(date +%Y%m%d)-backup.sql
```

### 12.3 Restore from Backup

```bash
# CAUTION: This will overwrite the current database state.
# Only do this in a true disaster recovery scenario.

# Step 1: Get the backup file
wrangler r2 object get alphaminds-backups d1/2025-01-15/backup.sql \
  --file ./restore.sql

# Step 2: Create a fresh D1 database (don't restore to the live one first)
wrangler d1 create alphaminds-commons-restore

# Step 3: Apply the backup SQL
wrangler d1 execute alphaminds-commons-restore --file ./restore.sql

# Step 4: Verify row counts match expectations
wrangler d1 execute alphaminds-commons-restore \
  --command "SELECT COUNT(*) FROM members;"

# Step 5: If verified correct, update wrangler.toml to point to the restored DB
# and deploy the Worker pointing to the new database ID
```

---

## 13. Common Development Tasks

### 13.1 Add a New API Endpoint

```
1. Define the endpoint in API.md (update the contract first)
2. Create the route handler in apps/workers/api/src/routes/
3. Add input validation Zod schema
4. Add the route to the router in apps/workers/api/src/index.ts
5. Add types to packages/types/ if new response shapes are introduced
6. Test locally with curl or Postman
7. Write the corresponding frontend hook in apps/web/src/hooks/
```

### 13.2 Add a New D1 Table

```
1. Write the CREATE TABLE statement in SCHEMA.md first (the document IS the schema)
2. Create migration file: migrations/000N_add_{table_name}.sql
3. Apply locally: wrangler d1 migrations apply alphaminds-commons-preview --local
4. Update seed script if the table needs seed data
5. Add TypeScript type to packages/types/
6. Deploy migration to production after local testing
```

### 13.3 Update Daily Content

```bash
# Check what's scheduled for the next 7 days
wrangler d1 execute alphaminds-commons \
  --command "SELECT scheduled_date, day_of_week, house, content_type, title
             FROM daily_content
             WHERE is_published = 1 AND deleted_at IS NULL
             ORDER BY scheduled_date ASC LIMIT 14;"

# Add new content via Admin API (or directly via D1 for emergencies):
wrangler d1 execute alphaminds-commons \
  --command "INSERT INTO daily_content (house, content_type, title, body, scheduled_date, is_published)
             VALUES ('becoming', 'insight', 'Your North Star',
                     'Before you set goals, clarify your direction...', '2025-01-20', 1);"
```

### 13.4 Manually Trigger Cron (Production)

Cloudflare does not allow manual cron triggering in production from the CLI.
To test a cron in production:
1. Use the Cloudflare Dashboard → Workers → alphaminds-api → Triggers → Cron Triggers
2. Click "Test" next to the cron you want to trigger
3. Monitor logs with `wrangler tail`

---

## 14. Naming Conventions

```
Environment Variables:  UPPER_SNAKE_CASE        (PAYSTACK_SECRET_KEY)
KV Key Patterns:        lower:colon:separated   (session:{token}, sub:{member_id})
R2 Key Patterns:        lower/slash/separated   (members/{id}/avatar/original.webp)
D1 Tables:              lower_snake_case         (member_house_selections)
D1 Columns:             lower_snake_case         (created_at, chapter_id)
Migration Files:        0001_description.sql     (0001_initial_schema.sql)
Worker Files:           camelCase.ts             (authMiddleware.ts)
React Components:       PascalCase.tsx           (RoomDetailPage.tsx)
React Hooks:            useCamelCase.ts          (useRoomFeed.ts)
API Routes:             /v1/kebab-case           (/v1/daily-content/today)
Cron Job Names:         snake_case               (daily_content_delivery)
R2 Bucket Names:        kebab-case               (alphaminds-media)
KV Namespace Names:     UPPER_SNAKE_CASE         (ALPHAMINDS_SESSIONS)
```

---

## 15. Troubleshooting

### Worker returns 500 on every request

```bash
# Check live logs
wrangler tail --status error

# Common causes:
# 1. D1 binding not found → check wrangler.toml database_id
# 2. KV binding not found → check wrangler.toml kv namespace ids
# 3. Missing secret → check wrangler secret list
# 4. TypeScript compile error → check: cd apps/workers && npx tsc --noEmit
```

### D1 migration fails

```bash
# Check migration status
wrangler d1 migrations list alphaminds-commons-preview --local

# If a migration is "stuck":
# 1. Check the _migrations table
wrangler d1 execute alphaminds-commons-preview --local \
  --command "SELECT * FROM _migrations;"

# 2. If partially applied, you may need to manually mark it as applied
# or roll back the partial change and fix the SQL
```

### Daily content not appearing

```bash
# 1. Check if cron ran today
wrangler d1 execute alphaminds-commons \
  --command "SELECT * FROM cron_execution_logs
             WHERE job_name = 'daily_content_delivery'
             AND DATE(started_at) = DATE('now');"

# 2. Check if content is scheduled for today
wrangler d1 execute alphaminds-commons \
  --command "SELECT * FROM daily_content
             WHERE is_published = 1
             AND (scheduled_date = DATE('now')
                  OR day_of_week = lower(strftime('%A', 'now')));"

# 3. Check KV delivery state for a specific member
wrangler kv:key get --namespace-id {DAILY_DELIVERY_NS_ID} \
  "daily:{member_id}:$(date +%Y-%m-%d)"
```

### Push notifications not delivering

```bash
# 1. Check that VAPID keys are set
wrangler secret list | grep VAPID

# 2. Check member has a push_token
wrangler d1 execute alphaminds-commons \
  --command "SELECT push_token IS NOT NULL as has_token
             FROM members WHERE id = '{member_id}';"

# 3. Verify push_token JSON is valid
wrangler d1 execute alphaminds-commons \
  --command "SELECT push_token FROM members WHERE id = '{member_id}';"
```
