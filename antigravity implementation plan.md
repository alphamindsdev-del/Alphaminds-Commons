# The Commons — Implementation Plan

Parent platform rebrand, product selection, REL-Fi native integration, authentication
fixes, responsive layout, lemon-green theme, and audio readiness.

> Note: an earlier version of this file documented the membership-level / Journey
> migration (now complete). Those findings are preserved in the "Prior work"
> appendix. This document reflects the current state and the plan executed for
> The Commons rebrand and REL-Fi work.

---

## 1. Current application architecture

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite 8 + TanStack Start (SSR) + TanStack Router (file-based routes in `src/routes/`) + TanStack Query + Zustand |
| Styling | Tailwind CSS 4 + custom design tokens in `src/styles.css` (`--accent: #B5D432` lemon green, Satoshi + Clash Display fonts) |
| Main API | Cloudflare Worker (`workers/api`, Hono) — same-origin `/v1/*` in production (`getApiBaseUrl()` returns `""`); D1 `alphaminds-commons`, KV sessions, R2 media |
| REL-Fi game backend | Separate Cloudflare Worker `relfi-games.alphamindsdev.workers.dev` (`relfi-game-master/backend`) — D1 `relfi-games`, 4× KV, R2 `relfi-assets`, Durable Object `ROOM_STATE` (realtime multiplayer) |
| Auth (app) | Bearer JWT session in `localStorage["am-auth-token"]` + KV session store; restored by `useAuthStore.restoreSession()` in `__root.tsx` |
| Auth (game) | Separate JWT (`localStorage["relfi_token"]`, 24 h) issued by the game worker |

Entry points: `src/routes/__root.tsx` (root layout, splash, session restore),
`src/routes/index.tsx` (landing vs. Home dashboard). `PageShell` composes
Sidebar/TopBar/MobileSidebar/BottomNav for all app routes.

## 2. Current authentication and post-login flow

1. `POST /v1/auth/login` → `{ token, member }` → `setSession` persists token
   (`am-auth-token`) and in-memory `apiToken`.
2. `login.tsx` navigated to `/` → Home dashboard.
3. Register → `/register/onboarding` (welcome + room picker) → `/`.
4. `apiFetch` hard-redirects to `/login` on any 401 outside `/v1/auth/*`.
5. No `beforeLoad` route guards; protection is ad-hoc (`/admin` hard-guard,
   soft `if (!member)` checks elsewhere).

**Gap:** there is no product-selection step; users land directly inside the
Alpha Minds product.

## 3. Current parent and product branding

- Parent title: "AlphaMinds Commons" (`__root.tsx`), wordmark "AlphaMinds"
  (`Logo.tsx`, `SplashScreen.tsx`), manifest name "AlphaMinds Commons".
- "The Commons" already appears informally (404 page, login hero kicker,
  "Back to Commons" buttons).
- Product-specific references that must be preserved: **Alpha Minds Daily**
  (route `/alpha-minds-daily`, nav labels), "AlphaMinds Guides" author default,
  technical identifiers (`am-auth-token`, `getAlphaMindsToken`, worker names,
  KV bindings, DB names).

## 4. How REL-Fi is currently integrated

**Already native — no iframe, no external page embedding.**
`src/routes/rel-fi.tsx` renders `<RelFiGame mode="embedded" containerMode="fullscreen" />`
directly inside the app router. Zero `iframe` occurrences in `src/`.

However, this is a **UI-only port**: all game functionality (auth, decks,
categories, rooms, users, uploads, WebSocket realtime) still talks to the
separate `relfi-games` worker. The main worker only mints handoff tokens
(`GET /v1/auth/relfi-handoff`) and credits results (`POST/GET /v1/relfi/*`).

## 5. Where the REL-Fi source code lives

- **Active native port:** `src/relfi/` (game state, screens, components,
  API client, WS client, audio, scoped theme `relfi.css`).
- **Original standalone app (reference):** `relfi-game-master/` (frontend +
  its own worker backend, deployed at `relfi-games.alphamindsdev.workers.dev`).
- App route wrappers: `src/routes/rel-fi.tsx`, `src/routes/rel-fi/{admin,tutorial,broadcast.$code}.tsx`.

## 6. How REL-Fi authentication currently works

Automatic sign-in is an **HMAC handoff SSO** (5-minute JWT, shared secret
`RELFI_SERVICE_SECRET`, `iss: alphaminds`, `aud: relfi`):

1. Frontend detects `am-auth-token` (memory or localStorage).
2. `GET /v1/auth/relfi-handoff` (main worker, Bearer = app session) → `{ handoff }`.
3. `POST {relfi-worker}/api/auth/embedded` with `{ handoff }` → game worker
   verifies signature/expiry, auto-provisions/looks up a user keyed by
   `external_auth_source='alphaminds'` + member id → issues 24 h game JWT.
4. `loadSession()` (`GET /users/me`) hydrates the game auth store.

## 7. Automatic sign-in bugs found (and fixes)

| # | Bug | Fix |
|---|---|---|
| 1 | **Race:** `RelFiGame`'s auto-login effect runs before the root's `restoreSession()` settles; a single early failure set `initialized: true`, **permanently skipping** the handoff for the rest of the session. | New `useEmbeddedAutoLogin` hook waits for `useAuthStore.isLoading === false`, and a failed attempt no longer permanently blocks retry. |
| 2 | **No retry:** any transient network failure left the user on the manual game-login form with no way back. | Error banner now includes a Retry action (`setFailed(false)` + attempt counter re-runs the effect). |
| 3 | **Expired session handled badly:** a 401 from the handoff endpoint only showed "sign in manually" (a *separate* game account), leaving an inconsistent state. | 401 now redirects to the app's `/login` for graceful reauthentication (no loop — login does not bounce back). |
| 4 | **Game-result submission used in-memory token only** (`alphaMindsRequest` → `getApiToken()`), silently dropping results after hard refresh before the app store rehydrated. | `alphaMindsRequest` now uses `getAlphaMindsToken()` (memory + localStorage fallback), same as `getHandoff`. |
| 5 | **`/rel-fi/admin` never ran the handoff** (only `loadSession()`), so admins lacked a game session unless they had visited `/rel-fi` first. | Admin now uses the same `useEmbeddedAutoLogin` hook. |

Known remaining limitation (documented, not fixed): a user who previously
created a *standalone* game account gets a second, distinct game identity when
the handoff provisions the `alphaminds`-linked user. Merging identities is a
backend data concern left for later.

## 8. How REL-Fi communicates with its backend

- REST: `https://relfi-games.alphamindsdev.workers.dev/api/*` (hardcoded
  `API_BASE` in `src/relfi/game/lib/api.ts`), Bearer game JWT.
- Realtime: `wss://relfi-games.alphamindsdev.workers.dev/api/rooms/{id}/ws?ticket=…`
  (single-use 60 s KV ticket minted by an authenticated join; Durable Object
  `ROOM_STATE` authoritative).
- Same-origin app API: `/v1/auth/relfi-handoff`, `/v1/relfi/{game-result,stats,leaderboard}`.

## 9. Native integration feasibility

- **UI: already fully native** (components, router, theme scope, app auth). No
  iframe or external URL renders the gameplay interface.
- **Backend: intentionally kept on the dedicated game worker.** The game's
  realtime layer depends on a Durable Object plus separate D1/KV/R2 bindings.
  Merging that into the main API worker is a high-risk migration (DO state,
  binding names, deployed secrets) with no user-visible benefit; the HMAC
  handoff already provides secure single sign-on. The game worker remains a
  supported service of the platform.
- The original `relfi-game-master/` tree is retained as the reference
  implementation and deployable source of the game worker.

## 10. Files expected to change

| File | Change |
|---|---|
| `antigravity implementation plan.md` | This document |
| `src/routes/__root.tsx` | Title/og/apple meta → "The Commons"; `/products` bypasses PageShell |
| `src/components/layout/Logo.tsx` | Wordmark/aria → "The Commons"; links to `/products` |
| `src/components/common/SplashScreen.tsx`, `SignupBanner.tsx` | Parent wordmark |
| `src/routes/login.tsx`, `register/index.tsx`, `register/onboarding.tsx`, `forgot-password.tsx` | Titles/©/alt text → The Commons; post-auth redirects → `/products` |
| Route `head()` titles across `src/routes/*` | "· AlphaMinds" → "· The Commons" |
| `public/manifest.json` | Name/short_name → The Commons |
| `src/components/landing/LandingPage.tsx` | Footer/bio parent branding |
| `src/routes/products.tsx` | **New** — product selection (Alpha Minds / Alpha Body / Alpha World) |
| `src/components/layout/Sidebar.tsx`, `MobileSidebar.tsx` | "Rel-Fi Game" label → "REL-Fi" |
| `src/relfi/game/state/useEmbeddedAuth.ts` | **New** — shared auto-signin hook |
| `src/relfi/game/state/RelFiGame.tsx` | Use hook + retry banner; responsive root (scrollable, `w-full`, `100dvh`); back label "Back to The Commons"; background audio lifecycle |
| `src/relfi/game/routes/admin.tsx` | Use auto-signin hook |
| `src/relfi/game/lib/api.ts` | `alphaMindsRequest` token fallback |
| `src/relfi/game/state/store.ts` | Win/lose MP3 wiring on `game:ended` |
| `src/relfi/relfi.css` | Purple oklch palette → lemon green `#B5D432`-based; host fonts (Satoshi/Clash Display) |
| `src/relfi/game/screens/Landing.tsx`, `Final.tsx` | Responsive type scale; click sounds on primary CTAs |
| `src/relfi/game/audio/sound.ts` | MP3 clip layer (background/click/win/lose) with graceful fallback |
| `src/relfi/game/routes/broadcast.$code.tsx` | Decorative purple default → lemon green |
| `public/audio/rel-fi/README.md` | **New** — expected MP3 filenames |

## 11. Risks and protections

- **No backend migrations.** All D1/KV/R2/DO bindings, routes, and secrets untouched.
- **Rename is cosmetic-only** in user-facing strings; technical identifiers
  (`am-auth-token`, `getAlphaMindsToken`, worker names, `AlphaMindsGameResult`
  types, DB/binding names) are deliberately preserved.
- **Product gating:** Alpha Body/Alpha World have no routes — direct URLs 404
  ("Lost in the Commons"), so nothing unfinished can be reached. Coming Soon is
  shown as a dismissible modal on the selection screen.
- **Existing deep links** (`/journey`, `/rel-fi`, …) keep working; only the
  post-login landing point changes to `/products`.
- **Gameplay untouched:** only layout containers, type scale, theme variables,
  and audio hooks change; game logic, WS protocol, scoring, and persistence are
  not modified.
- **Audio is failure-proof:** missing MP3s reject `play()` and are silently
  ignored (synth fallback for clicks); gameplay never depends on audio.

## 12. Implementation sequence and testing strategy

Sequence: plan → rebrand → product selection + redirects → auth fixes →
responsiveness → theme → audio → verification.

Testing strategy (executed at the end):
1. `npm run type-check` — TS across app + workers.
2. `npm run test` — existing vitest unit/API suites.
3. `npm run build` — production build (also regenerates `routeTree.gen.ts`).
4. `npm run lint` — on changed files if the full lint is noisy.
5. Manual code-path review of login → `/products` → Alpha Minds → `/rel-fi`
   auto-signin (including retry and 401 paths), since live browser testing
   against deployed workers is not available in this environment.

Browser-based verification of the deployed workers (real sign-in flow against
`alphaminds.alphamindsdev.workers.dev` / `relfi-games…`) and the actual MP3
assets remain pending until the environment and assets are available.

---

## Appendix: Prior work (membership Journey migration — complete)

The earlier plan phases 0–7 (membership levels, Journey engine, The Code,
chapter proximity, admin upgrades) were already implemented and verified;
see `IMPLEMENTATION_PLAN.md` and `october implemntation.md` for that history.
Nothing in this rebrand supersedes those systems.
