# October Implementation — Chapter Proximity (Phase D remainder)

Carried over from the todo list on 2026-09-29. **D1 is done**; everything below is the
remaining Phase D work, in execution order.

## Done (2026-09-29)

- **D1 — migration `0013_member_location.sql`**: added `latitude REAL` / `longitude REAL`
  to `members`. Applied to **production** D1 (`npm run migrate:remote`, verified via
  `pragma_table_info`), worker built + deployed (`alphaminds`, version `a90b905e`,
  all 5 crons + KV/D1/R2 bindings intact). No code reads these columns yet.

## Remaining tasks

### D2 — Backend: nearby chapters + member location endpoints

- `GET /v1/chapters/nearby?lat=<>&lng=<>&radius=<km>` → physical chapters within radius,
  sorted by distance, plus the virtual **Alpha Circle** fallback (`global`) when none match.
- Reuse the existing (still unwired) helpers in `workers/api/src/lib/geolocation.ts`
  (`haversineDistanceKm`, `isWithinProximity`, `getProximityStatus`; 15 km default radius).
- Add a member location endpoint, e.g. `PATCH /v1/me/location` (auth), writing
  `members.latitude/longitude` (columns now exist). Call it on save from onboarding and
  from the My Chapter "share my location" button.
- New router file (e.g. `workers/api/src/routes/chapters.ts`) mounted in
  `workers/api/src/index.ts` alongside the existing `/v1/chapters` mounts
  (rooms/events/leaderboard routers are mounted there already — mind route-order so
  `/nearby` is not captured by a param route).
- Chapters already have `latitude`/`longitude` (migration `0010`).
- Fallback copy per spec: *"No physical Chapter is currently available near you.
  Join Virtual Alpha Circle"* (`antigravity implementation plan.md:75`).
- Optional: make the 15 km radius configurable via the `ALPHAMINDS_CHAPTER_CONFIG`
  KV binding (already deployed).

### D3 — Allow browser geolocation (blocking for D4/D5)

- `workers/api/src/middleware/security.ts:14` sends `Permissions-Policy: geolocation=()`,
  which **disables** `navigator.geolocation`. Change to `geolocation=(self)` (keep
  `camera=(), microphone=()`).

### D4 — Onboarding collects location

- During registration/onboarding (`src/routes/register/index.tsx`,
  `src/routes/register/onboarding.tsx`): offer "Use my location" (browser geolocation,
  needs D3) with a **city picker fallback** (city + country already exist as profile fields).
- Register flow currently has no lat/lng: `RegisterSchema` (`workers/api/src/lib/validation.ts:8`)
  and the insert at `workers/api/src/routes/auth.ts:36`. Either extend both with optional
  `latitude`/`longitude`, or (simpler) keep registration unchanged and POST to the new
  `PATCH /v1/me/location` right after onboarding completes.
- If within 15 km of a chapter → assign `members.chapter_id` and insert a
  `member_chapter_history` row (reason `'proximity'`; registration-time history insert
  pattern is at `auth.ts:60-64`). Far away → leave chapter null / point at the virtual
  Alpha Circle (`global`).

### D5 — Build the real My Chapter page

- `src/routes/my-chapter.tsx` is a `ComingSoon` stub. Build it:
  - Show the member's assigned chapter (from `/v1/auth/me` → `chapter_id`, joined name).
  - "Share my location" button → geolocation → `PATCH /v1/me/location` → refetch
    `GET /v1/chapters/nearby`.
  - List nearby chapters with distance (`haversine` distance returned by the endpoint),
    join/switch action (history insert exists in `workers/api/src/routes/relfi.ts:65` —
    follow that pattern or add a dedicated switch endpoint).
  - Alpha Circle fallback panel when nothing is within radius.
- Match existing page conventions: `PageHeader`, React Query hooks under `src/hooks/`,
  sonner toasts.

### D6 — Admin: chapter lat/lng fields

- `workers/api/src/routes/admin.ts:528` (POST `/chapters`) and `:554` (PATCH) do not
  write `latitude`/`longitude`; add them to the allowed fields.
- `ChapterSchema` in `workers/api/src/lib/validation.ts` (~line 80) needs
  `latitude: z.number().min(-90).max(90).optional()` and longitude equivalent.
- UI: `src/components/admin/AdminChapters.tsx` — add lat/lng inputs to create + edit
  (note the admin modal conventions used by Events/Rooms: `editItem` prop → PATCH on save).

### D7 — Verify + close out

- `npm run type-check` (both configs) must stay clean.
- Dev servers: mock API (`%TEMP%\am-mock.mjs`, port 9999) + `vite dev` (port 8083);
  workerd crashes on this Windows box, so browser verification runs against the mock —
  add `/v1/chapters/nearby` and `/v1/me/location` handlers to the mock for the session
  (mock is scaffolding, never ships).
- Browser-verify: onboarding location → chapter assignment; far-away → Alpha Circle
  fallback; My Chapter renders real data; admin create/edit chapter with coordinates.
- Tick the Phase D box in `IMPLEMENTATION_PLAN.md:145` and update the anchored summary
  in `AGENTS.md`.

## Also deferred (not Phase D)

- **Phase E** (`IMPLEMENTATION_PLAN.md:97-101`): Wellness Clinic real page; The Code
  unsave endpoint (`DELETE /v1/code/:id/unsave`) + saved-state hydration from
  `GET /v1/code/saved`; dev-mock `/v1/code/today` handler.
- **Phase C leftovers** (`IMPLEMENTATION_PLAN.md:82-85`): strip debug `console.log`s
  (`src/relfi/game/lib/api.ts:128`, `RelFiGame.tsx`); product decision on whether the
  Seeker lock on `/rel-fi` is enforced or Rel-Fi is free-to-play.
- Backend E2E for Rel-Fi handoff passed on production 2026-09-29
  (login → handoff → embedded login); expired-handoff rejection still unchecked.
