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

## What We've Done

### Cloudflare Deployment Setup

- Created KV namespaces (SESSIONS, SUBSCRIPTION_CACHE, DAILY_DELIVERY, RATE_LIMITS, CONTENT_SCHEDULE_CACHE, CHAPTER_CONFIG)
- Created D1 database (`alphaminds-commons`, ID: 3416d527-f0af-4f91-a4b6-9e0fae5549bf)
- Created R2 buckets (alphaminds-media, alphaminds-backups)
- Migrated 37 D1 tables via wrangler
- Set secrets: JWT_SESSION_SECRET, RESEND_API_KEY, WEB_PUSH_VAPID_PRIVATE, WEB_PUSH_VAPID_PUBLIC, ADMIN_ALERT_EMAIL
- Worker deployed at `https://alphaminds-api.alphamindsdev.workers.dev`
- All KV, D1, R2 IDs configured in `wrangler.toml`

### API Routing Architecture

The project uses TanStack Start + Nitro with `cloudflare-module` preset. Nitro bundles everything into `.output/server/` — including the Hono API app inside `_ssr/ssr.mjs` (as `server_default`).

**Problem:** Nitro wraps requests in an h3 event pipeline that reads request bodies. When `services.ssr.fetch(req)` calls the SSR module with only `req` (no `env`/`ctx`), Hono API routes can't access Cloudflare bindings and POST bodies get consumed by h3 before reaching Hono.

**Solution (entry-point bypass):**
- `build` script runs `node scripts/patch.mjs` post-build
- `index.mjs` gets a static import (`import { default as __ssr } from "./_ssr/ssr.mjs"`)
- The `createHandler.fetch` hooks intercept `/v1/*` paths and call `__ssr.fetch(cfRequest, env, context)` directly — bypassing the h3 pipeline and passing Cloudflare bindings
- `src/server.ts` keeps a `globalThis.__env__` fallback for the Nitro pipeline SSR path (where `env` is undefined)
- `scripts/patch.mjs` also strips the Nitro-generated `env.staging`/`env.production` block from `.output/server/wrangler.json` (causes deploy errors)

### Known Limitations

1. **Cron triggers fail to deploy** — free Workers plan limitation (requires Workers Paid)
2. **Nitro regenerates `.output/server/` each build** — the patch script automates the two required patches:
   - Static import of `_ssr/ssr.mjs` for `/v1/*` routing
   - Removal of `env` block from `wrangler.json`
3. **`curl.exe` in Windows PowerShell sends POST bodies incorrectly** — use `Invoke-WebRequest` instead for HTTP API testing

### Testing

| Test | Status |
|------|--------|
| `GET /v1/houses` | Working — returns house data |
| `POST /v1/auth/register` | Working — creates member, returns token |
| `POST /v1/auth/login` | Working — verifies credentials, returns token |
| `GET /v1/auth/me` | Working — returns member profile (needs auth header) |
| `GET https://alphaminds-api.alphamindsdev.workers.dev/` | Working — SSR renders app |
