<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

## Anchored Summary

### Objective
Recruit, engage, and retain members through a feature-rich community platform with houses, events, challenges, daily content, library/blog, and admin tools.

### Important Details
- Admin role in D1 is `'admin'`; old KV sessions still have `role='member'` — affected users must log out and back in.
- Two test users (`alphamindsdev+admin@gmail.com`, `alphamindsdev+admin2@gmail.com`) have admin in D1.
- Worker URL: `https://alphaminds.alphamindsdev.workers.dev` (both SSR frontend and API). Pages URL `3ee6b428.alphaminds-commons.pages.dev` returns 404 — stale.
- `getApiBaseUrl()` returns `""` in production (`.env.production` has empty `VITE_API_BASE_URL`), so API calls go to same origin as the page (worker).
- Media serving: `GET /v1/media/{r2_key}` returns binary from R2 bucket through the worker. `r2.ts` returns `url: "/v1/media/${r2_key}"`.
- Cron triggers deploy on free plan: up to **5 per account**, 100k requests/day total limit across HTTP + scheduled. Currently 5 triggers defined in `wrangler.toml`.
- `npm run type-check --skipLibCheck` passes clean.

### Work State
#### Completed
- **Cloudflare Deployment**: KV (SESSIONS, SUBSCRIPTION_CACHE, DAILY_DELIVERY, RATE_LIMITS, CONTENT_SCHEDULE_CACHE, CHAPTER_CONFIG), D1 (`alphaminds-commons`), R2 (alphaminds-media, alphaminds-backups), 37 D1 tables migrated, secrets set, worker deployed at `https://alphaminds-api.alphamindsdev.workers.dev`
- **Nitro patch architecture**: `scripts/patch.mjs` post-build adds static import of `_ssr/ssr.mjs` and strips `env` block from `wrangler.json`; `createHandler.fetch` intercepts `/v1/*` and calls `__ssr.fetch(cfRequest, env, context)` directly (bypasses h3 pipeline loss of body/env)
- **Daily content lifecycle**: admin creates → `POST /v1/admin/daily-content` → inserted with `is_published=1` → `GET /v1/daily-content/today` selects via `scheduled_date=today OR day_of_week=todayName` → cron (`handleDailyContentDelivery`) batch-delivers → KV cache for 24h
- **Daily content show-stopper fixed**: admin UI sent neither `scheduled_date` nor `day_of_week`, both `NULL` → rows never matched. Fix: auto-set `scheduled_date = today` when neither provided (`workers/api/src/routes/admin.ts:114`)
- **Seed mock posts suppressed**: query prioritizes `scheduled_date IS NOT NULL` (admin-created) over `day_of_week`-only (seed) via `ORDER BY CASE WHEN scheduled_date IS NOT NULL THEN 0 ELSE 1 END, created_at DESC LIMIT 1` (`workers/api/src/routes/daily.ts:36`)
- **House optional for daily content**: schema `optional()`, backend auto-detects from `WEEKLY_HOUSE_THEME` (`admin.ts:117`)
- **Date picker** in `DailyContentModal`: `<input type="date">` → `scheduled_date` in payload
- **Edit existing daily content**: admin dashboard shows daily content table (from `GET /v1/admin/daily-content`) with edit buttons → modal pre-filled → calls `PATCH /v1/admin/daily-content/:id`
- **PATCH endpoints for events, rooms, library articles** (`workers/api/src/routes/admin.ts`)
- **Upload progress bar**: `DailyContentModal` uses `XMLHttpRequest` with `xhr.upload.onprogress` for real-time percentage; imports `getApiBaseUrl`/`getApiToken` from `@/lib/api`
- **Members section moved to bottom** of admin page with "See more/less" toggle
- **`D1_TYPE_ERROR` fix** (`admin.ts:126`): `now` (Date object) → `nowIso` (string) in audit log `.bind()`
- **Admin CRUD endpoints**: GET/POST/PATCH/DELETE for chapters, events, rooms, library articles; GET for stats
- **Media serving fix** (`workers/api/src/routes/media.ts`): Changed from `GET /:key+` to `GET /*`. Hono 4.x treats `+` as literal part of parameter name, so `:key+` only matched single-segment paths. Wildcard `/*` + extracting key from `c.req.path` fixed it — verified with 200 response for MP4.
- **Admin CRUD for events, rooms, library articles**: Backend DELETE endpoints (`admin.ts`), all create modals support edit via `editItem` prop (PATCH on save), collapsible table sections with Edit/Delete buttons
- **All `/v1/media/...` paths** use worker-relative URLs (no external domains)
- **Cron triggers confirmed working on free plan**: 5 schedules deployed successfully (`wrangler.toml:70-76`). Free plan supports up to 5 per account. Dropped handlers (impact score, weekly summary) documented as future scope.
- **Build + deploy** successful (worker only; Pages URL returns 404)
- **Rel-Fi game playable solo with mode selector, fullscreen in AlphaMinds**: `/rel-fi` renders `RelFiGame mode="embedded" containerMode="fullscreen"`. Landing screen already has mode selector (solo/seer_skeptic/multiplayer_seer). Removed extra `PlayModeSelector.tsx`, `/rel-fi/play/*` routes. Cleaned up `RelFiGame.tsx` (`defaultMode` prop and auto-start solo effect removed). Type-check passes, build succeeds, worker deployed.

#### Active
- **`D1_TYPE_ERROR` returns**: user still sees `Type 'object' not supported for value 'Sat Jul 18 2026 ...'` after deploy. Extensive audit of all `.bind()` calls across `workers/` found no other raw Date objects. Investigation continues.

#### Known Limitations
1. **Nitro regenerates `.output/server/` each build** — patch script automates the two required patches
2. **`curl.exe` in Windows PowerShell sends POST bodies incorrectly** — use `Invoke-WebRequest` instead
3. **Free plan CPU limit (10ms)** — cron handlers with large loops (e.g., iterating all members for daily content delivery) may hit the 10ms CPU time limit on free plan and timeout. May require Workers Paid for reliable execution.

### Testing
| Test | Status |
|------|--------|
| `GET /v1/houses` | Working |
| `POST /v1/auth/register` | Working |
| `POST /v1/auth/login` | Working |
| `GET /v1/auth/me` | Working |
| `GET https://alphaminds.alphamindsdev.workers.dev/` | Working |
| Rel-Fi worker deployed | `https://relfi-games.alphamindsdev.workers.dev` |

### Relevant Files
- `workers/api/src/routes/admin.ts` — Daily content POST/PATCH, auto-date/auto-house, PATCH for events/rooms/library, CRUD for chapters/library, stats, DELETE for events/rooms/daily-content, GET for library admin list
- `workers/api/src/routes/daily.ts` — `GET /today` query prioritizes `scheduled_date` over `day_of_week`
- `workers/api/src/routes/media.ts` — `GET /*` serves R2 media files through the worker (fixed from `:key+` which didn't work in Hono 4.x)
- `workers/api/src/lib/r2.ts` — `uploadMedia` returns `url: "/v1/media/${r2_key}"`
- `workers/api/src/lib/validation.ts` — `CreateDailyContentSchema` house optional
- `workers/shared/constants.ts` — `WEEKLY_HOUSE_THEME`, `HOUSES`
- `src/routes/admin.tsx` — DailyContentModal (create+edit, date picker, upload progress), collapsible sections for Events/Rooms/Library/Daily Content, all modals support edit, delete buttons
- `src/lib/api.ts` — `getApiBaseUrl`, `getApiToken` exports
- `workers/api/src/lib/handoff.ts` — HMAC sign/verify for Rel-Fi handoff JWT
- `workers/api/src/routes/auth.ts` — `GET /v1/auth/relfi-handoff` route
- `relfi-game-master/backend/src/` — Rel-Fi worker backend (verifyHandoff, embeddedLogin, routes)
- `relfi-game-master/backend/wrangler.toml` — Rel-Fi worker config
- `relfi-game-master/backend/.dev.vars` — Local secrets for Rel-Fi worker
