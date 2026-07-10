# AGENT.md
# AlphaMinds Commons — AI Coding Agent Instruction File
# Version 1.0 | Senior Staff Engineer Specification

---

## CRITICAL: READ THIS ENTIRE FILE BEFORE TOUCHING ANY FILE IN THIS REPOSITORY.

This is not a suggestion. This file exists because AI coding agents that skip it
produce code that looks correct but violates architectural contracts that will cause
production failures, security vulnerabilities, or unmaintainable technical debt.

Every rule in this file exists because a real failure mode was anticipated. If a
rule seems arbitrary, read the reasoning comment next to it.

---

## 1. The Stack — Locked, No Exceptions

```
Frontend:     React 18 + Vite 5 + TypeScript (strict) + Tailwind CSS
              Deployed to: Cloudflare Pages
              
Backend:      Cloudflare Workers (TypeScript)
              Router: Hono.js
              
Database:     Cloudflare D1 (SQLite)
              
Object Store: Cloudflare R2
              
KV Cache:     Cloudflare KV
              
Jobs:         Cloudflare Cron Triggers
              
Email:        Resend
              
Payments:     Paystack (Phase 3, Africa) + Stripe (Phase 3, International)
```

**Forbidden dependencies — do not import, do not suggest, do not install:**

```
❌ Supabase          → We use Cloudflare D1 + KV + R2
❌ Firebase          → We use Cloudflare's full platform
❌ PlanetScale       → We use D1
❌ Vercel            → We use Cloudflare Pages
❌ NextJS            → We use React + Vite
❌ Prisma            → We use D1's prepared statement API directly
❌ Drizzle ORM       → Same as above (evaluate if schema grows complex, but not now)
❌ Express           → Workers use Hono.js
❌ Passport.js       → Auth is implemented directly in Workers middleware
❌ JWT libraries (jsonwebtoken, jose for sign/verify) → Sessions are KV-backed, not JWT-signed
❌ socket.io         → Phase 2 uses Durable Objects for real-time, not Phase 1
❌ Redis             → Cloudflare KV serves this role
❌ PostgreSQL        → D1 (SQLite)
❌ axios             → Native Fetch API only
❌ moment.js         → date-fns or native Intl API only
```

If you need a capability that seems to require one of the above, stop. Check ARCHITECTURE.md
for how we accomplish that capability with our stack. If it's genuinely missing, flag it
explicitly to the engineer — do not substitute a forbidden dependency.

---

## 2. File Structure — Never Deviate

```
alphaminds-commons/
├── apps/
│   ├── web/                      → React PWA ONLY. No backend code here.
│   │   └── src/
│   │       ├── pages/            → One file per route. Named: {Name}Page.tsx
│   │       ├── components/       → Reusable UI. Named: PascalCase.tsx
│   │       ├── hooks/            → Custom hooks. Named: useCamelCase.ts
│   │       ├── lib/              → Utilities, API client, constants
│   │       ├── store/            → Zustand stores ONLY (auth state, UI state)
│   │       └── service-worker/   → Service worker additions
│   └── workers/
│       ├── api/                  → Main REST API Worker
│       ├── cron/                 → Cron Trigger handlers
│       ├── webhooks/             → Payment webhook handlers
│       ├── media/                → R2 signed URL Worker
│       └── shared/               → Middleware, types, utilities. NEVER deployed alone.
├── packages/
│   ├── types/                    → Shared TypeScript interfaces for DB rows + API shapes
│   └── constants/                → House enums, tier values, shared constants
├── migrations/                   → D1 SQL migrations. Numbered: 0001_description.sql
├── scripts/                      → Seed scripts, utilities
└── docs/                         → All .md architecture documents
```

**Rules:**
- Never create backend code in `apps/web/`
- Never create frontend code in `apps/workers/`
- Never create new top-level directories without updating ARCHITECTURE.md
- New shared types go in `packages/types/`, never duplicated in web or workers
- New SQL migrations go in `migrations/`, never inline SQL schema changes

---

## 3. TypeScript Rules

### 3.1 Strict Mode — Non-Negotiable

```typescript
// tsconfig.json — these flags are REQUIRED and must not be removed
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 3.2 Forbidden TypeScript Patterns

```typescript
// ❌ NEVER use `any`
const data: any = response.json();

// ✅ Type the response properly
const data: MemberProfile = await response.json() as MemberProfile;

// ❌ NEVER use non-null assertion without a preceding null check
const value = obj.property!.nested;

// ✅ Check first
if (!obj.property) throw new Error('property is required');
const value = obj.property.nested;

// ❌ NEVER ignore type errors with @ts-ignore
// @ts-ignore
const result = brokenFunction();

// ✅ Fix the type error or use @ts-expect-error with a comment explaining why
// @ts-expect-error: Cloudflare's D1 types don't yet reflect the .first<T>() generic
const row = await stmt.first<MemberRow>();

// ❌ NEVER use type assertions to bypass validation
const member = untrustedInput as Member;

// ✅ Use Zod to parse and validate
const member = MemberSchema.parse(untrustedInput);
```

---

## 4. Database Rules (D1 / SQLite)

### 4.1 Parameterized Queries — ALWAYS

```typescript
// ❌ NEVER interpolate variables into SQL strings
const result = await env.DB.prepare(
  `SELECT * FROM members WHERE email = '${email}'`  // SQL INJECTION VULNERABILITY
).all();

// ✅ ALWAYS use .bind()
const result = await env.DB.prepare(
  `SELECT * FROM members WHERE email = ?`
).bind(email).all();
```

### 4.2 Soft Deletes — ALWAYS

```typescript
// ❌ NEVER hard delete rows
await env.DB.prepare(`DELETE FROM posts WHERE id = ?`).bind(postId).run();

// ✅ ALWAYS soft delete
await env.DB.prepare(
  `UPDATE posts SET deleted_at = CURRENT_TIMESTAMP WHERE id = ?`
).bind(postId).run();

// ✅ AND always filter soft-deleted rows in queries
const posts = await env.DB.prepare(
  `SELECT * FROM posts WHERE room_id = ? AND deleted_at IS NULL`
).bind(roomId).all();
```

### 4.3 Cursor-Based Pagination — ALWAYS

```typescript
// ❌ NEVER use OFFSET pagination
const posts = await env.DB.prepare(
  `SELECT * FROM posts ORDER BY created_at DESC LIMIT 20 OFFSET 40`
).all();
// Reason: OFFSET is O(n) and produces incorrect results when rows are
// inserted during pagination. Breaks at scale.

// ✅ ALWAYS use cursor-based pagination
const posts = await env.DB.prepare(
  `SELECT * FROM posts
   WHERE room_id = ?
     AND deleted_at IS NULL
     AND id > ?
   ORDER BY id ASC
   LIMIT ?`
).bind(roomId, cursor ?? '', limit).all();
```

### 4.4 Additive Migrations Only

```sql
-- ❌ NEVER in a migration file
ALTER TABLE members DROP COLUMN old_field;
ALTER TABLE members RENAME COLUMN old_name TO new_name;

-- ✅ ALWAYS additive
ALTER TABLE members ADD COLUMN new_field TEXT DEFAULT '';
-- Then deprecate old_field in code, remove it in a later migration
-- after confirming zero usage in production
```

### 4.5 chapter_id Nullability

```typescript
// chapter_id = NULL means GLOBAL (belongs to all chapters, scoped to none)
// chapter_id = 'global' DOES NOT EXIST as a value — NULL is the sentinel

// ❌ Wrong
WHERE chapter_id = 'global'

// ✅ Correct (global resources)
WHERE chapter_id IS NULL

// ✅ Correct (chapter-specific resources)
WHERE chapter_id = ?   // bound to a specific chapter UUID
```

### 4.6 House Values

```typescript
// House is always stored and compared as a lowercase string
// Valid values: 'becoming' | 'connection' | 'wellness' | 'play' | 'humanity' | 'global'

// ❌ Wrong
WHERE house = 'Becoming'
WHERE house = 'WELLNESS'

// ✅ Correct
WHERE house = 'becoming'
WHERE house = 'wellness'
```

---

## 5. Authentication Rules

### 5.1 Token Storage — httpOnly Cookie Only

```typescript
// ❌ NEVER store auth tokens in localStorage
localStorage.setItem('auth_token', token);

// ❌ NEVER store auth tokens in sessionStorage
sessionStorage.setItem('auth_token', token);

// ❌ NEVER store auth tokens in a React state variable that gets serialized
const [token, setToken] = useState(localStorage.getItem('token'));

// ✅ Tokens live in httpOnly cookies (set by the Worker's Set-Cookie header)
// On the client: read session state from Zustand authStore (populated from /v1/auth/me)
// The actual token is never accessible to JavaScript
```

### 5.2 Auth Middleware — Apply to Every Protected Route

```typescript
// ❌ NEVER skip auth middleware on a route that accesses member data
app.get('/v1/rooms/:id/posts', async (c) => {
  // Directly querying without auth check — WRONG
  const posts = await getPosts(c.env, c.req.param('id'));
  return c.json(posts);
});

// ✅ Auth middleware is composed at the router level
app.use('/v1/*', authMiddleware);   // Applied to ALL /v1/ routes
app.get('/v1/rooms/:id/posts', async (c) => {
  const session = c.get('session'); // Set by authMiddleware
  const posts = await getPosts(c.env, c.req.param('id'), session.member_id);
  return c.json(posts);
});
```

---

## 6. Subscription Gate Rules

### 6.1 Gate at the Worker, Never at the Frontend

```typescript
// ❌ NEVER gate features in React components
function RoomDetail({ room }) {
  const { tier } = useAuth();
  if (room.min_tier === 'premium' && tier !== 'premium') {
    return <UpgradePrompt />;
  }
  return <RoomContent room={room} />;
}
// Reason: The Worker is the gate. React conditionals are UI sugar, not security.
// A user with devtools can bypass any frontend check.

// ✅ The Worker returns 403 for unauthorized tier access
// The React component handles the 403 response:
function RoomDetail() {
  const { data, error } = useQuery({ queryFn: () => apiFetch('/rooms/:id') });

  if (error instanceof UpgradeRequiredError) {
    return <UpgradePrompt requiredTier={error.requiredTier} />;
  }

  return <RoomContent room={data} />;
}
```

### 6.2 The Gate Check Pattern

```typescript
// ✅ Correct gate check in Worker route handler
app.get('/v1/rooms/:id/posts', async (c) => {
  const session = c.get('session');

  // 1. Get room to find its min_tier
  const room = await getRoom(c.env, c.req.param('id'));
  if (!room) return c.json({ error: 'Room not found' }, 404);

  // 2. Check tier if room requires it
  if (room.min_tier !== 'free') {
    const gateResponse = await requireTier(c.req.raw, c.env, session, room.min_tier);
    if (gateResponse) return gateResponse; // Returns 403 with upgrade_required body
  }

  // 3. Proceed with the actual handler
  const posts = await getRoomPosts(c.env, room.id, session.member_id);
  return c.json({ data: posts });
});
```

---

## 7. API Rules

### 7.1 Always Return Typed JSON

```typescript
// ❌ Never return untyped objects
return new Response(JSON.stringify(someObj));

// ✅ Always use the Hono response helper with typed content
return c.json<PostListResponse>({ data: posts, pagination });
```

### 7.2 Error Responses — Consistent Format

```typescript
// ❌ Never return ad-hoc error messages
return c.json({ message: 'something went wrong' }, 500);

// ✅ Always use the standardized error format
return c.json({
  error: 'Human-readable message for the user',
  code: 'SNAKE_CASE_ERROR_CODE',
  details: {},   // optional, omit if empty
}, statusCode);
```

### 7.3 Versioning — Always Under /v1/

```typescript
// ❌ Wrong
app.get('/rooms/:id', handler);
app.get('/api/rooms/:id', handler);

// ✅ Correct
app.get('/v1/rooms/:id', handler);
```

### 7.4 Validate All Input

```typescript
// ❌ Never trust request body without validation
const body = await c.req.json();
await createPost(body.content, body.room_id);  // No validation — WRONG

// ✅ Always validate with Zod
const CreatePostSchema = z.object({
  content: z.string().min(1).max(10000),
  post_type: z.enum(['text', 'media', 'poll']).default('text'),
});

const result = CreatePostSchema.safeParse(await c.req.json());
if (!result.success) {
  return c.json({ error: 'Validation failed', code: 'VALIDATION_ERROR',
                  details: result.error.flatten() }, 422);
}
const { content, post_type } = result.data;
```

---

## 8. Frontend Rules

### 8.1 No Direct API Calls — Always Use `apiFetch`

```typescript
// ❌ Never use raw fetch in components or hooks
const response = await fetch('https://api.alphaminds.com/v1/rooms/...');

// ✅ Always use the apiFetch wrapper from lib/api.ts
// It handles: auth header, error parsing, UpgradeRequiredError, 401 redirect
const data = await apiFetch<RoomResponse>(`/rooms/${roomId}`);
```

### 8.2 All Server State in TanStack Query

```typescript
// ❌ Never fetch data in useEffect and store in useState
useEffect(() => {
  fetch('/api/rooms').then(r => r.json()).then(setRooms);
}, []);

// ✅ Always use TanStack Query
const { data: rooms, isLoading, error } = useQuery({
  queryKey: ['rooms', chapterId],
  queryFn: () => apiFetch<RoomsResponse>(`/chapters/${chapterId}/rooms`),
});
```

### 8.3 Always Handle Loading, Error, and Empty States

```typescript
// ❌ Never render without handling loading/error
function RoomList() {
  const { data } = useQuery({ queryKey: ['rooms'], queryFn: fetchRooms });
  return <div>{data?.rooms.map(r => <RoomCard key={r.id} room={r} />)}</div>;
}

// ✅ Always handle all states
function RoomList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['rooms', chapterId],
    queryFn: () => apiFetch<RoomsResponse>(`/chapters/${chapterId}/rooms`),
  });

  if (isLoading) return <SkeletonCard count={5} />;
  if (error instanceof UpgradeRequiredError) {
    return <UpgradePrompt requiredTier={error.requiredTier} featureName="this section" />;
  }
  if (error) return <ErrorState message={error.message} />;
  if (!data?.rooms.length) return <EmptyState message="No rooms yet." />;

  return <div>{data.rooms.map(r => <RoomCard key={r.id} room={r} />)}</div>;
}
```

### 8.4 Images — Always Via getImageUrl()

```typescript
// ❌ Never use raw R2 keys or hardcoded image URLs in img src
<img src={member.avatar_r2_key} />
<img src={`https://storage.alphaminds.com/${member.avatar_r2_key}`} />

// ✅ Always use the image utility to route through Cloudflare Image Resizing
import { getImageUrl } from '@/lib/images';

<img src={getImageUrl(member.avatar_r2_key, 'avatar_md')} alt={member.display_name} />
```

### 8.5 Never Import from Server-Side Code in Frontend

```typescript
// ❌ Never import Worker middleware, D1 types, or KV helpers into web/src/
import { authMiddleware } from '../../workers/shared/middleware/auth';  // WRONG

// ✅ Shared types live in packages/types/ — OK to import
import type { MemberProfile } from '@alphaminds/types';
```

### 8.6 Performance — No Premature Images

```tsx
// ❌ Never load below-the-fold images eagerly
<img src={coverUrl} alt="..." />

// ✅ Always use lazy loading for non-critical images
<img src={coverUrl} alt="..." loading="lazy" decoding="async" />
```

---

## 9. The Five Houses — Naming and Values

House identifiers are used throughout the codebase. Use these exact values everywhere.
Capitalize only for display text. Lowercase for all data values.

```typescript
// ✅ Correct — from packages/constants/houses.ts
export const HOUSES = ['becoming', 'connection', 'wellness', 'play', 'humanity'] as const;
export type House = typeof HOUSES[number];
export type HouseOrGlobal = House | 'global';

export const HOUSE_LABELS: Record<House, string> = {
  becoming:   'House of Becoming',
  connection: 'House of Connection',
  wellness:   'House of Wellness',
  play:       'House of Play',
  humanity:   'House of Humanity',
};

export const HOUSE_COLORS: Record<House, string> = {
  becoming:   '#6366F1',
  connection: '#EC4899',
  wellness:   '#10B981',
  play:       '#F59E0B',
  humanity:   '#EF4444',
};

export const HOUSE_EMOJIS: Record<House, string> = {
  becoming:   '🏔',
  connection: '🤝',
  wellness:   '🌱',
  play:       '🎭',
  humanity:   '❤️',
};

export const WEEKLY_HOUSE_THEME: Record<string, HouseOrGlobal> = {
  monday:    'becoming',
  tuesday:   'global',     // Learning — cross-house
  wednesday: 'connection',
  thursday:  'wellness',
  friday:    'play',
  saturday:  'global',     // Alpha Circle — community building
  sunday:    'humanity',
};
```

---

## 10. Subscription Tier Values

```typescript
// ✅ Correct — from packages/constants/tiers.ts
export const TIERS = ['free', 'basic', 'premium'] as const;
export type Tier = typeof TIERS[number];

export const TIER_ORDER: Record<Tier, number> = {
  free:    0,
  basic:   1,
  premium: 2,
};

export function tierMeetsRequirement(memberTier: Tier, requiredTier: Tier): boolean {
  return TIER_ORDER[memberTier] >= TIER_ORDER[requiredTier];
}
```

---

## 11. Role Values

```typescript
// ✅ Correct — from packages/constants/roles.ts
export const ROLES = ['member', 'moderator', 'house_lead', 'admin', 'founder'] as const;
export type Role = typeof ROLES[number];

export const ROLE_ORDER: Record<Role, number> = {
  member:     0,
  moderator:  1,
  house_lead: 2,
  admin:      3,
  founder:    4,
};
```

---

## 12. Phase Boundaries — What to Build Now

Before implementing any feature, confirm its phase in FEATURES.md.

```
BUILD NOW (Phase 1):
  ✅ Authentication (email/password)
  ✅ Member profiles
  ✅ House and room selection
  ✅ Room posts, comments, reactions
  ✅ Events and RSVP
  ✅ Walking, Reading, Gratitude challenges
  ✅ AlphaMinds Daily content
  ✅ Basic push notifications
  ✅ Admin dashboard (member management, content management)
  ✅ Subscription tier gate infrastructure (no payment collection)
  ✅ member_context_snapshots table (schema only, no Phase 4 logic)
  ✅ room_messages table (schema only, no Phase 2 chat logic)
  ✅ chapters table and chapter_id on all relevant tables

DO NOT BUILD YET:
  ❌ Google OAuth
  ❌ Group Chat (Durable Objects)
  ❌ Detectors™ question flow and results
  ❌ Leaderboards
  ❌ Streaks
  ❌ Badges auto-award system
  ❌ Book Club features
  ❌ Podcast Hub
  ❌ Paystack/Stripe payment integration
  ❌ PDF report generation
  ❌ Alpha Coach AI
  ❌ Wellness tracking
  ❌ Chapter management UI
  ❌ WhatsApp share dynamic OG image generation
  ❌ Notification polling replacement (server-sent events / WebSocket)
```

---

## 13. Cron Job Rules

### 13.1 Always Log Execution

```typescript
// ✅ Every Cron handler must start by writing to cron_execution_logs
export async function handleDailyContentDelivery(env: Env, scheduledAt: Date) {
  // FIRST LINE of every cron handler:
  const logId = await startCronLog(env, 'daily_content_delivery', scheduledAt);

  try {
    // ... do work ...
    await completeCronLog(env, logId, recordsProcessed);
  } catch (error) {
    await failCronLog(env, logId, String(error));
    throw error; // Always re-throw so Cloudflare registers the failure
  }
}
```

### 13.2 Cron Jobs Must Be Idempotent

```typescript
// ✅ Cron jobs use INSERT OR IGNORE / ON CONFLICT DO NOTHING to be safe to re-run
await env.DB.prepare(`
  INSERT OR IGNORE INTO daily_content_deliveries (member_id, content_id, delivery_date)
  VALUES (?, ?, ?)
`).bind(memberId, contentId, today).run();
// If the cron runs twice (e.g., after a retry), this won't create duplicate deliveries
```

---

## 14. Ambiguity Resolution Rules

When you encounter ambiguity, apply these rules in order:

1. **Check ARCHITECTURE.md first.** The decision is probably documented there.

2. **Check FEATURES.md second.** Is this feature in scope for the current phase?
   If it's not Phase 1, don't build it. Surface it to the engineer as "out of scope."

3. **Default to the simpler implementation.** If there are two ways to do something
   and both are correct, choose the one with less code and fewer dependencies.

4. **Default to more explicit over more clever.** Readable code that a junior engineer
   can understand is always preferred over clever code that requires deep knowledge.

5. **If adding a new dependency feels necessary:** Stop. Ask yourself if Cloudflare's
   platform already provides this (KV instead of Redis, D1 instead of any external DB,
   R2 instead of S3). If yes, use the Cloudflare primitive.

6. **If a feature would require a new D1 table not in SCHEMA.md:** Stop. Add the table
   to SCHEMA.md with full column definitions, indexes, and reasoning. Then create the
   migration file. Then implement the feature. Schema documentation comes before code.

7. **If a feature appears to require real-time capabilities (WebSocket, SSE) in Phase 1:**
   Use polling. Phase 1 does not have real-time infrastructure. Document it as known
   Phase 2 work.

8. **When in doubt about error handling:** Return a structured error JSON with `error`
   (human-readable) and `code` (machine-readable) fields. Never return empty 500s.
   Never return HTML error pages from the API.

---

## 15. Git Commit Conventions

```
Format: {type}({scope}): {description}

Types:
  feat     → New feature
  fix      → Bug fix
  schema   → Database schema change (always accompanies a migration file)
  refactor → Code change that neither fixes a bug nor adds a feature
  docs     → Documentation update
  test     → Adding or updating tests
  chore    → Dependency updates, config changes

Scopes:
  auth, members, houses, rooms, posts, events, challenges, daily,
  notifications, detectors, leaderboard, subscription, admin, cron,
  pwa, api, schema, worker, frontend

Examples:
  feat(rooms): add cursor-based pagination to room post feed
  schema(detectors): add detector_results and detector_responses tables
  fix(auth): correct session TTL sliding window logic
  feat(daily): implement daily content delivery cron handler
  chore(deps): update wrangler to 3.22.0
```

**Never commit:**
- `.dev.vars` files
- `.env.local` files
- `node_modules/`
- Migration files with DROP COLUMN or RENAME COLUMN statements
- Any file containing a real API key, secret, or password

---

## 16. Before Submitting Any Code — Checklist

```
[ ] TypeScript compiles with zero errors: `npx tsc --noEmit`
[ ] No `any` types introduced
[ ] All new D1 queries use .bind() — no string interpolation
[ ] All new queries filter `deleted_at IS NULL`
[ ] No OFFSET pagination introduced
[ ] No localStorage/sessionStorage for auth tokens
[ ] No subscription tier checks in React components (only UpgradePrompt on 403)
[ ] All new API responses follow the error format in API.md
[ ] All new tables exist in SCHEMA.md before the migration file is created
[ ] All new features are within Phase 1 scope (or explicitly flagged as out-of-scope)
[ ] No forbidden dependencies added to package.json
[ ] House values use the correct lowercase string enum
[ ] Images served through getImageUrl() not raw R2 keys
[ ] Loading, error, and empty states handled in all new UI components
[ ] Cron handlers write to cron_execution_logs and re-throw errors
[ ] New environment variables added to .dev.vars.example (not .dev.vars)
```
