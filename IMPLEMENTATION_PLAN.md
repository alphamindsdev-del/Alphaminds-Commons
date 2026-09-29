# AlphaMinds Commons — Gap Analysis & Implementation Plan

**Date:** 2026-09-29
**Companion to:** `antigravity implementation plan.md` (product vision) and `README.md` (runbook)
**Status:** Phases A and B applied locally, type-checked, and browser-verified. **Nothing is deployed yet.**

---

## 1. The product (what we are building)

AlphaMinds Commons is a member community platform:

| Area | What it is |
|---|---|
| Five Houses | Wellness framework; members earn scores across 5 houses |
| AlphaMinds Daily | Daily content admin publishes → delivered to members (cron + in-app) |
| The Code | Daily passage: read, save, share |
| Your Journey | Sequential membership: SEEKER → EXAMINER → FACILITATOR → STEWARD → CHAPTER_LEADER → COORDINATOR. Completing a level's required activities promotes you (Seeker → Examiner unlocks Rel-Fi, Plans, Events) |
| Plans / Library / Events / Rooms / Challenges | Content, learning and community features |
| Rel-Fi | Reasoning game (built in `relfi-game-master/`), embedded in the app; Phase 2 = auto sign-in via signed handoff |
| My Chapter | Physical chapters with 15 km proximity + virtual "Alpha Circle" fallback |
| Admin | Full content control: daily content, The Code, journey, plans, library, events, rooms, chapters, members |

---

## 2. Where things stand

### 2.1 Completed and verified (browser-tested against a mock API)

- **Homepage**: date removed, "THE COMMONS //" tag removed, oversized fonts/headings reduced, quote icon shrunk.
- **Icons**: all emoji padlocks (🔒) replaced with gray Lucide `Lock` icons; Library nav icon changed off the duplicate.
- **Code for the Day**: fixed line-clamp removed — full admin-written length displays.
- **Profile**: redesigned layout; logout button now actually calls `POST /v1/auth/logout`.
- **Admin daily content**: House selector removed (backend auto-detects theme; schema optional); auto-date when none given; edit existing posts; upload progress bar; seed/mock posts suppressed.
- **Admin CRUD**: full create/edit/delete for plans, library, events, rooms, chapters, The Code, journey activities, members — tabs in `src/routes/admin.tsx`.
- **Member settings**: migration `0012_member_settings_and_follows.sql` + `GET/PUT /v1/me/settings` + settings page wiring. Theme + font size persist across reloads (race in `useTheme`/`useFontSize` fixed).
- **Follow**: `follows` table + `POST/DELETE /v1/members/:id/follow` + counts on public profile — verified (42→43→42 followers).
- **Data export**: `GET /v1/me/data-export` assembles the member's full data and emails it — verified with success toast.
- **Cron honors settings**: daily reminder notifications gated on `dailyContentReminder` (`workers/cron/src/handlers/dailyContent.ts:56`); weekly summary email gated on `emailNotifications && emailWeeklyDigest` (`weeklySummary.ts:19`).
- **Media**: `GET /v1/media/*` serves R2 files correctly (Hono wildcard fix).
- **Rel-Fi game**: playable embedded, fullscreen, mode selector.
- **The Code page** `/code` + **Journey page** `/journey` exist and render.
- **Journey engine (Phase B)**: `GET /v1/journey` + `POST /v1/journey/activities/:id/complete` with server-side sequential unlock and auto-promotion; journey page and homepage card on real data; level-aware sidebar padlocks (verified: step 1 unlock → step 2, Seeker → Examiner promotion, locks cleared, homepage card in sync).

### 2.2 Not deployed

All of the above, plus migration `0012`. Nothing has been pushed. **Note:** CI (Cloudflare Workers Builds) auto-deploys on push to `master` — a push IS a deploy. See §5.

---

## 3. Gaps found in this audit

### Phase A — Critical bugs (FIXED in this pass, ready for your review)

| # | Bug | Impact | Fix applied |
|---|---|---|---|
| A1 | Journey progress list ran `ORDER BY m.position` on a table that has no `position` column (`workers/api/src/routes/admin.ts:1107`) | Admin "member journey progress" request would fail with a SQL error | Rewritten to `JOIN journey_activities` and order by the activity's position |
| A2 | `membership_level` missing from 4 API responses: register (`auth.ts:78`), `/v1/auth/me` (`auth.ts:155`), `GET`+`PATCH /v1/members/profile` (`members.ts:20,72`) | The app never saw a member's real level — everyone displayed as SEEKER, even after promotion | Added `membership_level` to all four SELECTs |
| A3 | Rel-Fi unlock check tested `membershipLevel === "EXAMINER"` (`src/routes/journey.tsx:48`) | FACILITATOR and above would show Rel-Fi as locked | Changed to level-index check (`>= EXAMINER`) |

### Phase B — Journey engine, member-facing (DONE — browser-verified)

Built:

1. **Member endpoints** (`workers/api/src/routes/journey.ts`, mounted at `/v1/journey`):
   - `GET /` → current level's published activities with per-step status (`completed` / `active` / `locked`, sequential), `completed_count` / `total_count`, `next_level`.
   - `POST /activities/:id/complete` → validates the step is next in sequence (403 if earlier steps are open), records progress, auto-promotes when every required published activity of the level is complete (audit entry `promote_member`, `via: 'journey'`), returns the refreshed journey.
2. **`/journey` page** rewritten to real data: per-type icons, status tones, "Optional" badges, active-step description, Rel-Fi step CTA (Play + Mark done), loading / error / empty states. Completion updates the shared `["journey"]` query cache; on promotion the auth store is updated (`setMember`) so locks release instantly.
3. **Level-aware locks**: `Sidebar.tsx` / `MobileSidebar.tsx` use `minLevel` + `levelIndex()` — Plans, Wellness Clinic, Rel-Fi, Events lock below Examiner; admins bypass; locked items keep the gray padlock plus an "unlocks at Examiner level" tooltip.
4. **Homepage `YourJourneyCard`** reads the same `["journey"]` query — real steps, count, next-level copy.

Verified in browser (mock): completing step 1 unlocked step 2 (lock → Play / Mark done); completing both required steps showed the promotion toast, switched the level chip to EXAMINER, cleared the sidebar padlocks and removed the Rel-Fi teaser; homepage card reflects the same data.

### Phase C — Rel-Fi embed auto sign-in (your Phase 2 — deferred by request)

The code already exists on all sides:
- AlphaMinds signs a short-lived handoff JWT: `workers/api/src/lib/handoff.ts`, route `GET /v1/auth/relfi-handoff` (`auth.ts:246`).
- Rel-Fi worker verifies it: `relfi-game-master/backend/src/lib/jwt.ts` (`verifyHandoff`) + embedded login route.
- Frontend requests + redeems the handoff: `src/relfi/game/lib/api.ts:122,146`, auto-login effect in `RelFiGame.tsx:41-45`.

Remaining work:
1. Remove leftover debug `console.log`s (`auth.ts:255-257`, `src/relfi/game/lib/api.ts:128`, `RelFiGame.tsx`).
2. Set the **same** `REFLI_SERVICE_SECRET` in both workers (`README.md:193-194` has the commands).
3. Deploy both workers and test end-to-end: signed-in member opens `/rel-fi` → auto-login, no password. Check handoff expiry/replay behavior.
4. **Product decision:** today `/rel-fi` is open to everyone (the padlock is visual only). Either enforce the Seeker lock (redirect to `/journey`) or declare Rel-Fi free-to-play.

### Phase D — Chapter proximity

The geolocation helper exists but is **unused**: `workers/api/src/lib/geolocation.ts` (Haversine + proximity checks, 15 km default).

1. Member endpoint `GET /v1/chapters/nearby?lat=<>&lng=<>` → chapters within radius + virtual Alpha Circle fallback.
2. Onboarding collects location (browser geolocation or city picker) during registration (`src/routes/register/`).
3. Build the real **My Chapter** page — `src/routes/my-chapter.tsx` is currently a "Coming Soon" stub.
4. Admin: add latitude/longitude fields to chapter create/edit (`src/components/admin/AdminChapters.tsx` has none).
5. Optional: make the 15 km radius configurable via KV (`ALPHAMINDS_CHAPTER_CONFIG` binding already exists).

### Phase E — Placeholders & polish

1. **Wellness Clinic** page is a "Coming Soon" stub (`src/routes/wellness-clinic.tsx`) — build it or remove it from the nav.
2. **The Code**: no unsave for members and the Save button state resets on reload. Add `DELETE /v1/code/:id/unsave`, hydrate saved-state from the existing `GET /v1/code/saved`, optionally a "Saved passages" list in the UI.
3. Dev-only: the local mock API lacks `/v1/code/today` (404s in dev on `/journey`) — add handler for cleaner local testing (never ships).

---

## 4. Suggested order

**A (done)** → **B (journey wiring)** → **C (Rel-Fi auto sign-in — your Phase 2)** → **D (chapters)** → **E (polish)** → **F (deploy, §5)**.

Rationale: B makes the product's core progression loop real, C unblocks the game integration you explicitly planned as Phase 2, D and E are additions that don't block anything.

---

## 5. Deployment checklist (Phase F — requires owner go-ahead)

Nothing below has been run yet. **A push to `master` auto-deploys via Cloudflare Workers Builds** (and syncs to Lovable), so run pre-flight first.

1. **Pre-flight (local):**
   - `npm run type-check` → clean ✔ (already passing)
   - `npm run build` (runs `scripts/patch.mjs` automatically — required for the SSR+API worker)
2. **Database migration (remote D1)** — REQUIRED before deploying code that reads `settings_json`/`follows`:
   - `npm run migrate:remote` (applies migration `0012_member_settings_and_follows.sql`)
   - Also double-check migrations `0002`–`0011` are applied remotely (journey tables, The Code, chapter coordinates, membership_level, plans, cover photo, etc.).
3. **Secrets** (already set once, verify): `JWT_SESSION_SECRET`, `RESEND_API_KEY`, `ADMIN_ALERT_EMAIL`, `WEB_PUSH_VAPID_*`, and `REFLI_SERVICE_SECRET` (same value on both workers — `README.md:203-208`).
4. **Deploy main worker (SSR + API + crons):** `npx wrangler deploy` after build (see `README.md` §Deploy for exact context).
5. **Deploy Rel-Fi worker:** `cd relfi-game-master/backend && wrangler deploy --config wrangler.toml`.
6. **Smoke tests on production:** login → daily content for today → The Code save → settings save + reload → follow a member → data export email → admin journey progress list (previously broken) → `/rel-fi` handoff login (Phase C).

---

## 6. Known limitations & risk notes

- **Free plan limits:** max 5 cron triggers (already at 5) and 100k requests/day shared between HTTP and scheduled. Cron loops (e.g. daily delivery over all members) risk the 10 ms CPU cap as the membership grows — consider the paid plan or batched processing later.
- **Disabled handlers:** weekly summary email + impact score cron exist but were dropped to fit the 5-trigger limit (`wrangler.toml:79-81`). Re-enable when scope allows.
- **Lovable constraint:** avoid force-push/rebase/squash of published history; keep `master` in a working state (AGENTS.md).
- **Dev environment:** `workerd` crashes locally on this Windows build, so visual checks use the mock API (port 9999) + `vite dev`; a benign dev-only hydration warning appears from the theme/font boot script.
- **Mock API** (`%TEMP%\am-mock.mjs`) is temporary scaffolding, not part of the product.

---

## 7. Verification checklist

- [x] Type-check clean after Phase A fixes
- [x] Phase B: journey page shows real steps; completing step 1 unlocks step 2; finishing required steps promotes Seeker → Examiner; sidebar padlocks disappear at Examiner (verified against mock API 2026-09-29)
- [ ] Phase C: signed-in member opens Rel-Fi with no login; expired handoff rejected gracefully
- [ ] Phase D: signup near a chapter assigns it; far away → Alpha Circle fallback; My Chapter page shows real data
- [ ] Phase E: Wellness Clinic page real; Code save state survives reload; unsave works
- [ ] Phase F: all smoke tests pass on production URL
