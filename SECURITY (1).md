# SECURITY.md
# AlphaMinds Commons — Security & Compliance Document
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. Security Philosophy

Security at AlphaMinds Commons is enforced at the infrastructure layer, not the
application layer. This means: auth gates live in Worker middleware, not React
components. Subscription gates are KV + D1 checks in the Worker, not frontend
conditionals. Sensitive assets are behind signed URLs, not public paths. Admin
surfaces require role validation at the Worker on every request, not just at login.

The attack surface of this platform is small by design. There is no application server
to compromise. There is no database accessible from the public internet — D1 is only
reachable from Workers. There is no SSH access to production infrastructure. The
Cloudflare edge is the only entry point to every system.

This document covers: the complete authentication flow end-to-end, role-based access
control, Detector result access control, subscription state race condition prevention,
rate limiting, R2 asset serving security, admin surface protection, and GDPR compliance.

---

## 1. Authentication Flow — End to End

### 1.1 Registration

```
Client                          Worker                          D1 / KV
  │                               │                               │
  │── POST /v1/auth/register ────►│                               │
  │   { email, password, ... }    │                               │
  │                               │── SELECT email FROM members ─►│
  │                               │◄─ (no row) ───────────────────│
  │                               │                               │
  │                               │  bcrypt.hash(password, 12)    │
  │                               │  [synchronous, CPU-bound]     │
  │                               │                               │
  │                               │── INSERT INTO members ────────►│
  │                               │── INSERT INTO member_stats ───►│
  │                               │── INSERT INTO member_          │
  │                               │   house_selections ───────────►│
  │                               │                               │
  │                               │  token = crypto.randomUUID()  │
  │                               │  session = { member_id,       │
  │                               │    email, role, chapter_id,   │
  │                               │    subscription_tier: 'free', │
  │                               │    expires_at: +7days }       │
  │                               │                               │
  │                               │── KV.put(session:{token}) ───►│
  │                               │   TTL: 7 days                 │
  │                               │                               │
  │◄── 201 { token, member } ─────│                               │
  │                               │                               │
  │  Client stores token in:      │                               │
  │  - httpOnly cookie            │                               │
  │    (Set-Cookie: session=token;│                               │
  │     HttpOnly; Secure;         │                               │
  │     SameSite=Strict;          │                               │
  │     Path=/; Max-Age=604800)   │                               │
  │  - Zustand authStore          │                               │
  │    (in-memory, lost on        │                               │
  │     page close — cookie       │                               │
  │     is the persistence layer) │                               │
```

**Why httpOnly cookie AND in-memory, not localStorage:**
- `localStorage` is accessible from JavaScript, making it vulnerable to XSS attacks.
  Any injected script can steal a token from localStorage.
- An `httpOnly` cookie cannot be read by JavaScript. It is sent automatically with
  every same-origin request. It is the correct storage primitive for session tokens.
- The Zustand in-memory store holds the member object (non-sensitive display data)
  for fast UI access. The actual token is only in the cookie.
- On page load, if the cookie exists, the client calls `GET /v1/auth/me` to
  re-hydrate the Zustand store. This is the only way the app learns if the session
  is still valid.

### 1.2 Authenticated Request Flow

```
Client                    CF Edge (Worker)              KV            D1
  │                            │                         │             │
  │── GET /v1/me/profile ─────►│                         │             │
  │   Cookie: session={token}  │                         │             │
  │                            │  Extract token from     │             │
  │                            │  Authorization header   │             │
  │                            │  (or Cookie fallback)   │             │
  │                            │                         │             │
  │                            │── GET session:{token} ─►│             │
  │                            │◄─ SessionPayload ────────│             │
  │                            │                         │             │
  │                            │  if null → 401          │             │
  │                            │  if expired → 401       │             │
  │                            │                         │             │
  │                            │  Attach session to      │             │
  │                            │  request context        │             │
  │                            │                         │             │
  │                            │── SELECT * FROM         │             │
  │                            │   members WHERE id=? ──────────────►  │
  │                            │◄─ member row ─────────────────────── │
  │                            │                         │             │
  │◄── 200 { member, stats } ──│                         │             │
```

### 1.3 Password Storage

- Algorithm: bcrypt with cost factor 12
- bcrypt is deliberately slow, making brute-force attacks computationally expensive
- Cost factor 12 produces ~300ms hash time on modern hardware — acceptable for login,
  provides strong protection against offline dictionary attacks if DB is ever compromised
- Password hash is NEVER returned in any API response
- The `members` table SELECT in responses always excludes `password_hash` and `google_id`

### 1.4 OTP Security

- OTP is 6 digits (1,000,000 possible values)
- Stored in KV with 10-minute TTL
- Maximum 5 verification attempts per email per window (KV counter)
- After 5 failed attempts, the OTP is invalidated and a new one must be requested
- The `/v1/auth/forgot-password` endpoint always returns 200 regardless of whether
  the email exists — prevents user enumeration attacks
- OTPs are never logged to any persistent store

### 1.5 Session Revocation

Sessions can be revoked in three ways:
1. **Explicit logout:** Worker deletes `session:{token}` from KV immediately
2. **Account suspension:** Admin sets `is_active = 0` on member record. Worker
   middleware checks `is_active` after KV session validation. Suspended accounts
   receive `403 ACCOUNT_SUSPENDED` even with valid session token.
3. **Password reset:** All existing sessions are invalidated. The Worker cannot
   perform a KV scan to find all sessions for a member (KV doesn't support this
   efficiently). Instead: a `session_revoked_at` timestamp is stored on the member
   record in D1. The auth middleware checks: if `session.issued_at < member.session_revoked_at`,
   the session is invalid. This field is updated on password reset.

---

## 2. Role-Based Access Control (RBAC)

### 2.1 Role Hierarchy

```
founder        → Full access. All admin capabilities + system configuration.
admin          → Manage members, content, events, chapters. Cannot modify founder accounts.
house_lead     → Manage rooms and content within their assigned house. Cannot manage members.
moderator      → Moderate posts and comments in assigned rooms. Cannot manage members.
member         → Standard member access based on subscription tier.
```

### 2.2 Role Storage and Resolution

- Role is stored on the `members` table: `role TEXT`
- Role is included in the KV session payload: `{ ..., role: "member" }`
- The Worker middleware reads role from the session payload (no D1 query needed
  for role checks on normal requests)
- Role is re-validated from D1 only for admin-level operations (belt-and-suspenders)

### 2.3 Role Check Middleware

```typescript
// workers/shared/middleware/requireRole.ts

type Role = 'member' | 'moderator' | 'house_lead' | 'admin' | 'founder';

const ROLE_ORDER: Record<Role, number> = {
  member: 0,
  moderator: 1,
  house_lead: 2,
  admin: 3,
  founder: 4,
};

export function requireRole(minimumRole: Role) {
  return async (
    request: Request,
    env: Env,
    ctx: { session: SessionPayload }
  ): Promise<Response | null> => {
    const memberRole = ctx.session.role as Role;

    if (ROLE_ORDER[memberRole] < ROLE_ORDER[minimumRole]) {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // For admin+ operations: re-validate role from D1 to catch role downgrades
    // that occurred after the session was issued
    if (ROLE_ORDER[minimumRole] >= ROLE_ORDER['admin']) {
      const member = await env.DB.prepare(
        'SELECT role, is_active FROM members WHERE id = ?'
      ).bind(ctx.session.member_id).first<{ role: string; is_active: number }>();

      if (!member || !member.is_active) {
        return new Response(
          JSON.stringify({ error: 'Account not found or suspended', code: 'FORBIDDEN' }),
          { status: 403 }
        );
      }

      if (ROLE_ORDER[member.role as Role] < ROLE_ORDER[minimumRole]) {
        return new Response(
          JSON.stringify({ error: 'Insufficient permissions', code: 'FORBIDDEN' }),
          { status: 403 }
        );
      }
    }

    return null; // proceed
  };
}
```

### 2.4 Resource-Level Authorization

Role checks alone are not sufficient. A moderator of Room A cannot moderate Room B.
Resource-level authorization checks are applied on top of role checks:

```typescript
// Example: verify moderator is assigned to this room
async function verifyRoomModerator(
  memberId: string,
  roomId: string,
  env: Env
): Promise<boolean> {
  const membership = await env.DB.prepare(
    `SELECT role FROM room_memberships
     WHERE room_id = ? AND member_id = ? AND deleted_at IS NULL`
  ).bind(roomId, memberId).first<{ role: string }>();

  return membership?.role === 'moderator';
}
```

### 2.5 Chapter Isolation

A member can only access resources within their own chapter (or global resources).
This is enforced as follows:

```typescript
// Middleware applied to all /v1/chapters/:chapterId/* routes
function enforceChapterAccess(
  requestedChapterId: string,
  session: SessionPayload
): Response | null {
  // Admins and founders can access any chapter
  if (['admin', 'founder'].includes(session.role)) return null;

  // Member must belong to requested chapter (or it must be global)
  if (
    requestedChapterId !== 'global' &&
    session.chapter_id !== requestedChapterId
  ) {
    return new Response(
      JSON.stringify({ error: 'Access to this chapter is not permitted', code: 'FORBIDDEN' }),
      { status: 403 }
    );
  }

  return null;
}
```

---

## 3. Detector Result Access Control

Detector results have three access levels that must be strictly enforced:

```
Basic result (result_summary_json):
  → Available to ALL tiers (free, basic, premium)
  → Contains: result type, basic scores, summary narrative
  → Returned in: GET /v1/detectors/:type/results/latest
  → No signed URL needed

Full result (result_full_json):
  → Available to: basic and premium tiers
  → Contains: detailed breakdown, all trait scores, extended narrative
  → Returned in: GET /v1/detectors/:type/results/latest (if tier >= basic)
  → If tier = free: field is null in response

PDF Report (pdf_r2_key):
  → Available to: premium tier only
  → NOT served as public URL — served as 10-minute signed URL only
  → Endpoint: GET /v1/detectors/:type/results/:id/report
  → Worker validates: session is authenticated + tier = premium + result belongs to this member
  → Worker generates signed URL: valid for 600 seconds from generation time
  → R2 signed URL generation uses the R2 API binding with presigned URL support
```

```typescript
// Media Worker — Detector PDF signed URL generation
async function generateDetectorPdfSignedUrl(
  resultId: string,
  memberId: string,
  env: Env
): Promise<string> {
  // 1. Verify result ownership
  const result = await env.DB.prepare(
    `SELECT pdf_r2_key FROM detector_results
     WHERE id = ? AND member_id = ? AND deleted_at IS NULL`
  ).bind(resultId, memberId).first<{ pdf_r2_key: string | null }>();

  if (!result || !result.pdf_r2_key) {
    throw new Error('Report not found or not yet generated');
  }

  // 2. Generate signed URL via R2 binding (10-minute expiry)
  const url = await env.MEDIA_BUCKET.createPresignedUrl('GET', result.pdf_r2_key, {
    expiresIn: 600, // seconds
  });

  return url;
}
```

**Critical:** The R2 bucket containing Detector PDFs is PRIVATE. Public access is
disabled at the bucket level in the Cloudflare dashboard. Even if an attacker obtains
an R2 object key, they cannot access the PDF without a valid signed URL.

---

## 4. Subscription State — Race Condition Prevention

### 4.1 The Race Condition Scenario

```
T=0:  Member pays for Premium. Paystack sends webhook.
T=1:  Webhook Worker receives event, starts processing.
T=2:  Member makes API request. KV cache says "free".
T=3:  Webhook Worker updates D1 subscription to "premium".
T=4:  Webhook Worker updates KV cache to "premium".
T=5:  Member makes another API request. KV cache says "premium". ✓
```

Between T=2 and T=4, the member has paid but their API request sees "free". This is
acceptable — the window is typically <1 second. The alternative (blocking all requests
during webhook processing) is worse than this brief inconsistency.

### 4.2 The Downgrade Race Condition (More Critical)

```
T=0:  Member cancels Premium. Webhook received.
T=1:  Webhook Worker deletes KV cache for this member. ← IMMEDIATE
T=2:  Webhook Worker updates D1 subscription to "cancelled".
T=3:  Member makes API request. KV cache MISS → D1 query → "cancelled". ✓
```

**The downgrade case is handled correctly** because we delete the KV cache key
immediately on webhook receipt (before D1 update). The next request falls through to
D1, which will reflect the updated status. There is no window where a cancelled
member can access Premium features.

### 4.3 Payment Webhook Deduplication

Payment providers can send the same webhook event multiple times. The
`subscription_events` table has a `provider_event_id` field. Before processing any
webhook event, the Worker checks:

```typescript
const existing = await env.DB.prepare(
  'SELECT id FROM subscription_events WHERE provider_event_id = ?'
).bind(event.id).first();

if (existing) {
  // Already processed. Return 200 to acknowledge without reprocessing.
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

This prevents double-processing of subscription upgrades or downgrades.

---

## 5. Rate Limiting Implementation

Rate limiting is enforced at the Worker layer using KV atomic operations.

```typescript
// workers/shared/middleware/rateLimit.ts

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
  keyFn: (request: Request, session?: SessionPayload) => string;
}

export async function checkRateLimit(
  request: Request,
  env: Env,
  config: RateLimitConfig,
  session?: SessionPayload
): Promise<Response | null> {
  const key = `rl:${config.keyFn(request, session)}`;
  const now = Math.floor(Date.now() / 1000);
  const windowStart = now - config.windowSeconds;

  // Get current window data
  const current = await env.ALPHAMINDS_RATE_LIMITS.get(key, 'json') as
    { count: number; window_start: number } | null;

  // Reset if outside window
  if (!current || current.window_start < windowStart) {
    await env.ALPHAMINDS_RATE_LIMITS.put(
      key,
      JSON.stringify({ count: 1, window_start: now }),
      { expirationTtl: config.windowSeconds * 2 }
    );
    return null; // first request in window, allow
  }

  if (current.count >= config.maxRequests) {
    const resetAt = current.window_start + config.windowSeconds;
    return new Response(
      JSON.stringify({ error: 'Rate limit exceeded', code: 'RATE_LIMIT_EXCEEDED' }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(resetAt - now),
          'X-RateLimit-Limit': String(config.maxRequests),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': String(resetAt),
        },
      }
    );
  }

  // Increment counter
  await env.ALPHAMINDS_RATE_LIMITS.put(
    key,
    JSON.stringify({ count: current.count + 1, window_start: current.window_start }),
    { expirationTtl: config.windowSeconds * 2 }
  );

  return null; // allow
}
```

**KV rate limiting limitation:** KV is eventually consistent. Under extreme concurrent
load, the counter may not be perfectly atomic — two requests could both read `count=4`
and both increment to `count=5`, allowing one extra request through. This is acceptable
for a community platform. For financial-grade rate limiting, use Durable Objects
(counter as a Durable Object with atomic increment). This is not justified for Phase 1.

### 5.1 IP Extraction

```typescript
function getClientIp(request: Request): string {
  // Cloudflare sets CF-Connecting-IP to the real client IP
  return request.headers.get('CF-Connecting-IP') ?? 'unknown';
}
```

---

## 6. R2 Asset Serving Security

### 6.1 Public Assets (avatars, event covers, post media)

Served from: `https://cdn.alphaminds.com/{r2_key}`
- R2 bucket `alphaminds-media` is configured with public access for the `cdn.alphaminds.com` subdomain
- Cloudflare CDN caches these assets at the edge
- No authentication required to VIEW these assets (profile photos are public)
- Upload to R2 requires authentication (via Worker, never direct R2 upload from client)

**Upload flow:**
```
Client → POST /v1/media/upload (with auth) → Worker validates → uploads to R2 → returns URL
```
The client never has direct R2 credentials. The Worker validates file type, file size,
and membership before uploading.

### 6.2 Private Assets (Detector PDFs)

Stored in: R2 bucket `alphaminds-media`, path `detectors/{member_id}/reports/{result_id}.pdf`
- Bucket has PUBLIC ACCESS DISABLED at the Cloudflare R2 dashboard level
- Only accessible via presigned URLs generated by the Worker
- Presigned URL TTL: 600 seconds (10 minutes)
- URL generated only after Worker verifies: authenticated session + premium tier + result ownership

### 6.3 Backup Bucket

R2 bucket `alphaminds-backups`:
- PUBLIC ACCESS DISABLED
- No presigned URL generation available to any application user
- Only accessible via Cloudflare dashboard or Workers with the backup bucket binding
- The backup Worker binding is on the cron Worker only — not the API Worker

---

## 7. Admin Surface Protection

### 7.1 Admin Route Protection

Every admin route requires two layers:
1. Valid authenticated session (KV middleware)
2. Role check against D1 (not just session — role could have been changed)

```typescript
// Admin middleware composition
const adminMiddleware = compose(
  authMiddleware,                    // validates KV session
  requireRole('admin'),              // checks role in session + re-validates from D1
  csrfMiddleware,                    // validates CSRF token for state-changing operations
);
```

### 7.2 Admin Operations Audit Log

All admin operations that modify data are logged. The audit log is append-only
and stored in D1:

```sql
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id              TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  admin_id        TEXT NOT NULL REFERENCES members(id),
  action          TEXT NOT NULL,     -- 'member.suspend' | 'content.publish' | 'event.delete' | etc.
  target_type     TEXT,              -- 'member' | 'post' | 'event' | 'room' | etc.
  target_id       TEXT,
  before_json     TEXT,              -- state before change (for reversibility)
  after_json      TEXT,              -- state after change
  ip_address      TEXT,
  created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_log_admin ON admin_audit_log(admin_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_log_target ON admin_audit_log(target_type, target_id);
```

---

## 8. CORS Configuration

The API Worker serves only `https://app.alphaminds.com` (and preview deployments).
All other origins are rejected.

```typescript
const ALLOWED_ORIGINS = [
  'https://app.alphaminds.com',
  'https://commons.alphaminds.com',
  // Preview deployments — only in development/staging
  ...(env.ENVIRONMENT === 'development' ? ['http://localhost:5173'] : []),
  // Cloudflare Pages preview deployments
  ...(env.ENVIRONMENT !== 'production' ? [/https:\/\/.*\.alphaminds\.pages\.dev/] : []),
];

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const isAllowed = origin && ALLOWED_ORIGINS.some(
    allowed => allowed instanceof RegExp ? allowed.test(origin) : allowed === origin
  );

  return {
    'Access-Control-Allow-Origin': isAllowed ? origin! : 'null',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type, X-Requested-With',
    'Access-Control-Allow-Credentials': 'true',
    'Access-Control-Max-Age': '86400',
  };
}
```

---

## 9. Input Validation

All request bodies are validated using Zod schemas before any D1 or KV operation.
The validation runs in the Worker — never trust client-supplied data.

```typescript
import { z } from 'zod';

const RegisterSchema = z.object({
  email:              z.string().email().max(254),
  username:           z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  display_name:       z.string().min(1).max(60),
  password:           z.string().min(8).max(128),
  country_code:       z.string().length(2).optional(),
  age:                z.number().int().min(13).max(120).optional(),
  gender:             z.enum(['male', 'female', 'non_binary', 'prefer_not_to_say']).optional(),
  primary_house:      z.enum(['becoming', 'connection', 'wellness', 'play', 'humanity']),
  secondary_houses:   z.array(
    z.enum(['becoming', 'connection', 'wellness', 'play', 'humanity'])
  ).max(2).default([]),
  chapter_id:         z.string().uuid().optional(),
});
```

**SQL Injection:** D1 uses parameterized queries exclusively (`.bind()` pattern).
Raw string interpolation into SQL is a forbidden pattern — enforced by AGENT.md.

**XSS:** Content stored in D1 (post content, comments) is stored as raw text.
It is the frontend's responsibility to escape output. React does this by default
for text nodes. The API never returns HTML — it returns JSON strings.

---

## 10. GDPR Compliance

AlphaMinds Commons has global members. GDPR applies.

### 10.1 Data Export

```
GET /v1/me/data-export
Auth required: Yes

Triggers a background job that compiles all member data into a JSON file:
- Member profile
- House and room memberships
- Posts and comments authored
- Event RSVPs
- Challenge participations
- Detector responses and results
- Notification history
- Subscription history

The file is uploaded to R2 (private) and a signed URL (24-hour TTL) is
returned via email. The export job completes within 24 hours.
```

### 10.2 Account Deletion (Right to Erasure)

```
DELETE /v1/me/account
Auth required: Yes
Body: { "password": "confirmation_password", "reason": "optional" }

Process:
1. Validate password (re-authentication before destructive action)
2. Set members.deleted_at = NOW()
3. Anonymize PII fields in D1 (email, display_name, username, avatar_r2_key)
   after 30-day grace period (cron job)
4. After 30 days: delete R2 assets (avatar, post media)
5. After 30 days: purge KV sessions
6. Subscription cancellation triggered with payment provider
7. Detector PDFs are deleted from R2 after 30 days

Data retained indefinitely (anonymized):
- Aggregated participation counts (for community statistics)
- Posts/comments (content remains, author_id set to 'deleted_user')
- Volunteer hours (for community impact reporting)

Data deleted after 30-day grace period:
- All PII: name, email, username, avatar, bio, country, age, gender
- Detector response raw answers
- Member context snapshots
```

### 10.3 Consent Tracking

- Marketing emails require explicit opt-in (checkbox at registration, default unchecked)
- Push notifications require explicit browser permission grant
- Members can withdraw both via Settings page
- Consent state is stored on the `members` table:
  `marketing_emails_opt_in INTEGER DEFAULT 0`
  `push_notifications_enabled INTEGER DEFAULT 0`

### 10.4 Data Residency

D1 data is stored in Cloudflare's global network with replication. Cloudflare does
not currently offer D1 data residency pinning to a specific region. For Phase 1,
this is acceptable. If regulatory requirements in specific markets (e.g., data
sovereignty laws) require in-country storage, this must be evaluated and may require
a regional architecture change. This is documented as a known future risk, not
an oversight.

---

## 11. Secret Management

### 11.1 Secrets in Production

All secrets are stored as Cloudflare Workers Secrets — never in environment variables,
never in wrangler.toml, never in source code.

```
Secrets managed via: wrangler secret put {SECRET_NAME}

JWT_SESSION_SECRET        → HMAC signing key (if JWT ever replaces KV sessions)
BCRYPT_PEPPER             → Additional pepper for password hashing (optional hardening)
PAYSTACK_SECRET_KEY       → Paystack API secret
PAYSTACK_WEBHOOK_SECRET   → Paystack webhook signature key
STRIPE_SECRET_KEY         → Stripe API secret
STRIPE_WEBHOOK_SECRET     → Stripe webhook signing secret
RESEND_API_KEY            → Resend transactional email
WEB_PUSH_VAPID_PRIVATE    → Web Push VAPID private key
ADMIN_ALERT_EMAIL         → Email for Cron failure alerts
```

### 11.2 Local Development Secrets

In local development, secrets are stored in `.dev.vars` (gitignored):

```
# .dev.vars — NEVER COMMIT THIS FILE
PAYSTACK_SECRET_KEY=sk_test_...
STRIPE_SECRET_KEY=sk_test_...
RESEND_API_KEY=re_...
WEB_PUSH_VAPID_PRIVATE=...
```

`.dev.vars` is in `.gitignore`. CI uses Cloudflare's environment-level secrets.

---

## 12. Security Headers

Every Worker response includes security headers:

```typescript
function securityHeaders(): Record<string, string> {
  return {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",   // unsafe-inline needed for Vite HMR in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://cdn.alphaminds.com",
      "connect-src 'self' https://api.alphaminds.com",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
    ].join('; '),
  };
}
```

---

## 13. Vulnerability Disclosure

If a security vulnerability is discovered in AlphaMinds Commons, it should be
reported to: `security@alphaminds.com`. Do not disclose publicly until a fix is
deployed. Response time commitment: acknowledgement within 48 hours, fix timeline
within 14 days for critical vulnerabilities.
