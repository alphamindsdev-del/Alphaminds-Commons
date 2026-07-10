# API.md
# AlphaMinds Commons — API Contract
# Version 1.0 | Senior Staff Engineer Specification

---

## 0. API Design Principles

**Base URL:** `https://api.alphaminds.com/v1`

**Versioning:** All endpoints are prefixed with `/v1/`. Breaking changes require a new
version prefix (`/v2/`). Additive changes (new optional fields in responses) do not
require a version bump.

**Authentication:** Every non-public endpoint requires a valid session token in the
`Authorization: Bearer {token}` header. The Worker middleware validates this against
KV before the request reaches the route handler.

**Content-Type:** All requests and responses use `application/json`.

**HTTP Methods:**
- `GET` — Read (idempotent, cacheable)
- `POST` — Create
- `PUT` — Full replace
- `PATCH` — Partial update
- `DELETE` — Soft delete (sets `deleted_at`, never removes the row)

**Error Format (all errors):**
```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE_SNAKE_CASE",
  "details": {}  // optional additional context
}
```

**Subscription Gate 403 Response:**
```json
{
  "error": "This feature requires a higher subscription tier.",
  "code": "UPGRADE_REQUIRED",
  "upgrade_required": true,
  "current_tier": "free",
  "required_tier": "basic"
}
```

**Pagination:** All list endpoints use cursor-based pagination.
```json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6IjEyMyJ9",   // base64-encoded, opaque to client
    "has_more": true,
    "limit": 20
  }
}
```
Request: `GET /v1/rooms/:id/posts?limit=20&cursor=eyJpZCI6IjEyMyJ9`

**Rate Limiting:**
Rate limit headers are returned on every response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1705312800
```
When limit is exceeded: `429 Too Many Requests` with `Retry-After` header.

---

## 1. Rate Limiting Rules

| Endpoint Category | Limit | Window | Key |
|---|---|---|---|
| `POST /v1/auth/register` | 5 requests | 10 min | per IP |
| `POST /v1/auth/login` | 10 requests | 5 min | per IP |
| `POST /v1/auth/forgot-password` | 3 requests | 15 min | per email |
| `POST /v1/auth/verify-otp` | 5 attempts | 10 min | per email |
| All other auth endpoints | 20 requests | 5 min | per IP |
| `GET` list endpoints | 120 requests | 1 min | per member_id |
| `POST` create endpoints | 60 requests | 1 min | per member_id |
| `POST /v1/rooms/:id/posts` | 10 requests | 1 min | per member_id |
| `POST /v1/posts/:id/comments` | 20 requests | 1 min | per member_id |
| `POST /v1/webhooks/*` | 1000 requests | 1 min | per IP (Paystack/Stripe IPs only) |
| Admin endpoints | 300 requests | 1 min | per member_id |

---

## 2. Authentication Endpoints

### POST /v1/auth/register
Creates a new member account.

**Auth required:** No  
**Tier required:** None

**Request body:**
```json
{
  "email": "john@example.com",
  "username": "john_alpha",
  "display_name": "John Doe",
  "password": "MinLength8Characters",
  "country_code": "NG",
  "age": 28,
  "gender": "male",                    // optional: "male" | "female" | "non_binary" | "prefer_not_to_say"
  "primary_house": "becoming",
  "secondary_houses": ["connection", "wellness"],  // 0-2 items
  "chapter_id": "chapter-uuid-here"   // optional, NULL assigns to global
}
```

**Response 201:**
```json
{
  "token": "session-token-string",
  "member": {
    "id": "...",
    "email": "john@example.com",
    "username": "john_alpha",
    "display_name": "John Doe",
    "primary_house": "becoming",
    "role": "member",
    "chapter_id": "...",
    "subscription_tier": "free"
  }
}
```

**Errors:**
- `409` — `EMAIL_TAKEN` or `USERNAME_TAKEN`
- `422` — `VALIDATION_ERROR` (password too short, invalid house, etc.)

---

### POST /v1/auth/login
**Auth required:** No

**Request body:**
```json
{
  "email": "john@example.com",
  "password": "password"
}
```

**Response 200:**
```json
{
  "token": "session-token-string",
  "member": { /* same as register */ }
}
```

**Errors:**
- `401` — `INVALID_CREDENTIALS`
- `403` — `ACCOUNT_SUSPENDED`
- `429` — `RATE_LIMIT_EXCEEDED`

---

### POST /v1/auth/logout
**Auth required:** Yes

Deletes the session from KV.

**Response 200:**
```json
{ "success": true }
```

---

### POST /v1/auth/forgot-password
**Auth required:** No

**Request body:**
```json
{ "email": "john@example.com" }
```

Always returns 200 regardless of whether email exists (prevents enumeration).

**Response 200:**
```json
{ "message": "If that email is registered, you will receive an OTP." }
```

---

### POST /v1/auth/verify-otp
**Auth required:** No

**Request body:**
```json
{
  "email": "john@example.com",
  "otp": "847291"
}
```

**Response 200:**
```json
{ "reset_token": "one-time-reset-token" }
```

**Errors:**
- `400` — `INVALID_OTP`
- `410` — `OTP_EXPIRED`

---

### POST /v1/auth/reset-password
**Auth required:** No

**Request body:**
```json
{
  "reset_token": "one-time-reset-token",
  "new_password": "NewSecurePassword123"
}
```

**Response 200:**
```json
{ "success": true }
```

---

### GET /v1/auth/me
**Auth required:** Yes

Returns current session member's profile.

**Response 200:**
```json
{
  "member": {
    "id": "...",
    "email": "...",
    "username": "...",
    "display_name": "...",
    "avatar_url": "https://cdn.alphaminds.com/.../avatar.webp",
    "primary_house": "becoming",
    "secondary_houses": ["connection"],
    "role": "member",
    "chapter_id": "...",
    "subscription_tier": "free",
    "email_verified": false
  }
}
```

---

## 3. Member / Profile Endpoints

### GET /v1/me/profile
**Auth required:** Yes

Returns full member profile including stats.

**Response 200:**
```json
{
  "member": { /* member object */ },
  "stats": {
    "becoming_score": 120,
    "connection_score": 45,
    "wellness_score": 80,
    "play_score": 30,
    "humanity_score": 60,
    "total_score": 335,
    "impact_score": 210,
    "current_streak_days": 7,
    "longest_streak_days": 14,
    "total_points": 850,
    "volunteer_hours": 12.5,
    "challenges_completed": 4,
    "events_attended": 3,
    "rooms_joined": 5,
    "detectors_completed": 2
  },
  "houses": [
    { "house": "becoming", "is_primary": true },
    { "house": "connection", "is_primary": false }
  ],
  "badges": [
    { "id": "...", "slug": "first-challenge", "name": "First Challenge", "icon_url": "...", "awarded_at": "..." }
  ]
}
```

---

### PATCH /v1/me/profile
**Auth required:** Yes

Updates editable profile fields.

**Request body (all fields optional):**
```json
{
  "display_name": "John Alpha",
  "bio": "Living well, growing daily.",
  "country_code": "NG",
  "city": "Lagos"
}
```

**Response 200:**
```json
{ "member": { /* updated member object */ } }
```

---

### PUT /v1/me/avatar
**Auth required:** Yes  
**Content-Type:** `multipart/form-data`

Uploads a new profile image. Worker validates file type (image/jpeg, image/png, image/webp)
and size (max 5MB), stores in R2, updates `members.avatar_r2_key`.

**Response 200:**
```json
{ "avatar_url": "https://cdn.alphaminds.com/members/{id}/avatar/original.webp" }
```

**Errors:**
- `413` — `FILE_TOO_LARGE`
- `415` — `UNSUPPORTED_MEDIA_TYPE`

---

### PUT /v1/me/houses
**Auth required:** Yes

Updates house selections. Max 1 primary + 2 secondary.

**Request body:**
```json
{
  "primary_house": "wellness",
  "secondary_houses": ["becoming", "humanity"]
}
```

**Response 200:**
```json
{ "houses": [ /* updated selections */ ] }
```

---

### GET /v1/members/:memberId/profile
**Auth required:** Yes

Public profile view of another member. Returns reduced fields (no email, no push_token).

**Response 200:**
```json
{
  "member": {
    "id": "...",
    "username": "...",
    "display_name": "...",
    "avatar_url": "...",
    "primary_house": "...",
    "bio": "...",
    "chapter_id": "..."
  },
  "stats": {
    "total_score": 335,
    "current_streak_days": 7,
    "challenges_completed": 4,
    "volunteer_hours": 12.5
  },
  "badges": [ /* public badges */ ]
}
```

---

## 4. Houses Endpoints

### GET /v1/houses
**Auth required:** Yes

Returns all five houses with metadata.

**Response 200:**
```json
{
  "houses": [
    {
      "id": "becoming",
      "name": "House of Becoming",
      "tagline": "Grow Well.",
      "description": "...",
      "icon_emoji": "🏔",
      "color_hex": "#6366F1",
      "member_count": 1234,
      "active_challenge_count": 2,
      "upcoming_event_count": 3
    }
    // ...
  ]
}
```

---

### GET /v1/houses/:houseId
**Auth required:** Yes

Returns a single house with its rooms, upcoming events, and active challenges.

**Response 200:**
```json
{
  "house": { /* house object */ },
  "rooms": [ /* room summaries */ ],
  "upcoming_events": [ /* next 3 events */ ],
  "active_challenges": [ /* active challenges */ ]
}
```

---

## 5. Rooms Endpoints

### GET /v1/chapters/:chapterId/rooms
**Auth required:** Yes

Lists all rooms in a chapter, optionally filtered by house.

**Query params:** `?house=wellness&limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "name": "BeatLift Room",
      "slug": "beatlift-room",
      "house": "wellness",
      "description": "...",
      "cover_url": "...",
      "member_count": 234,
      "min_tier": "free",
      "is_member": true
    }
  ],
  "pagination": { /* cursor pagination */ }
}
```

---

### GET /v1/rooms/:roomId
**Auth required:** Yes  
**Tier required:** Depends on `rooms.min_tier`

**Response 200:**
```json
{
  "room": {
    "id": "...",
    "name": "...",
    "house": "...",
    "description": "...",
    "member_count": 234,
    "is_member": true,
    "member_role": "member",
    "min_tier": "free"
  }
}
```

---

### POST /v1/rooms/:roomId/join
**Auth required:** Yes  
**Tier required:** Depends on `rooms.min_tier`

Adds member to the room.

**Response 200:**
```json
{ "membership": { "room_id": "...", "member_id": "...", "role": "member", "joined_at": "..." } }
```

---

### POST /v1/rooms/:roomId/leave
**Auth required:** Yes

**Response 200:**
```json
{ "success": true }
```

---

### GET /v1/rooms/:roomId/posts
**Auth required:** Yes  
**Tier required:** Depends on `rooms.min_tier`

**Query params:** `?limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "content": "...",
      "post_type": "text",
      "author": { "id": "...", "username": "...", "display_name": "...", "avatar_url": "..." },
      "reaction_count": 12,
      "comment_count": 4,
      "is_pinned": false,
      "created_at": "...",
      "media_urls": []
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### POST /v1/rooms/:roomId/posts
**Auth required:** Yes  
**Tier required:** Depends on `rooms.min_tier`

**Request body:**
```json
{
  "content": "Today's BeatLift was incredible 🔥",
  "post_type": "text",
  "media_r2_keys": []      // pre-uploaded R2 keys from /v1/media/upload
}
```

**Response 201:**
```json
{ "post": { /* post object */ } }
```

---

### GET /v1/posts/:postId
**Auth required:** Yes

**Response 200:**
```json
{ "post": { /* full post with top 3 comments */ } }
```

---

### DELETE /v1/posts/:postId
**Auth required:** Yes  
**Permission:** Author or Moderator/Admin

Soft delete.

**Response 200:**
```json
{ "success": true }
```

---

### POST /v1/posts/:postId/reactions
**Auth required:** Yes

Adds or toggles a reaction. If member already reacted with same emoji, removes it (toggle).

**Request body:**
```json
{ "emoji": "❤️" }
```

**Response 200:**
```json
{ "action": "added", "reaction_count": 13 }
```

---

## 6. Comments Endpoints

### GET /v1/posts/:postId/comments
**Auth required:** Yes  
**Query params:** `?limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "content": "...",
      "author": { /* author summary */ },
      "parent_id": null,
      "created_at": "..."
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### POST /v1/posts/:postId/comments
**Auth required:** Yes

**Request body:**
```json
{
  "content": "This is so inspiring!",
  "parent_id": null   // or comment ID for reply
}
```

**Response 201:**
```json
{ "comment": { /* comment object */ } }
```

---

## 7. Events Endpoints

### GET /v1/chapters/:chapterId/events
**Auth required:** Yes

**Query params:** `?house=wellness&format=physical&limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "title": "BeatLift Lagos",
      "event_type": "beatlift",
      "house": "wellness",
      "format": "physical",
      "cover_url": "...",
      "starts_at": "2025-02-01T09:00:00Z",
      "ends_at": "2025-02-01T11:00:00Z",
      "location_name": "Eko Hotel, Lagos",
      "rsvp_count": 45,
      "rsvp_limit": 100,
      "min_tier": "free",
      "is_rsvped": false
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### GET /v1/events/:eventId
**Auth required:** Yes

**Response 200:**
```json
{
  "event": {
    /* full event object */
    "description": "...",
    "location_address": "...",
    "location_coords": { "lat": 6.4281, "lng": 3.4219 },
    "timezone": "Africa/Lagos",
    "attendees": [ /* first 10 RSVPs */ ],
    "is_rsvped": true,
    "my_rsvp_status": "going"
  }
}
```

---

### POST /v1/events/:eventId/rsvp
**Auth required:** Yes  
**Tier required:** Depends on `events.min_tier`

**Request body:**
```json
{ "status": "going" }   // "going" | "maybe" | "not_going"
```

**Response 200:**
```json
{ "rsvp": { "status": "going", "event_id": "...", "member_id": "..." } }
```

**Errors:**
- `409` — `EVENT_FULL` (when rsvp_count >= rsvp_limit and status = 'going')

---

## 8. Challenges Endpoints

### GET /v1/challenges
**Auth required:** Yes  
**Query params:** `?house=wellness&status=active&limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "title": "Walking Challenge",
      "house": "wellness",
      "challenge_type": "weekly",
      "metric_type": "steps",
      "target_value": 5000,
      "points_reward": 10,
      "min_tier": "free",
      "participant_count": 234,
      "is_participating": false,
      "starts_at": "...",
      "ends_at": "..."
    }
  ],
  "pagination": { /* ... */ }
}
```

---

### POST /v1/challenges/:challengeId/join
**Auth required:** Yes  
**Tier required:** Depends on `challenges.min_tier`

**Response 201:**
```json
{ "participation": { "id": "...", "status": "active", "current_value": 0 } }
```

---

### POST /v1/challenges/:challengeId/log
**Auth required:** Yes

Logs progress for an active challenge participation.

**Request body:**
```json
{
  "value": 3500,          // steps, pages, minutes, etc.
  "note": "Morning walk in the park",
  "logged_date": "2025-01-15"
}
```

**Response 200:**
```json
{
  "participation": {
    "current_value": 3500,
    "target_value": 5000,
    "completion_pct": 0.7,
    "status": "active"
  },
  "completed": false
}
```

---

### GET /v1/me/challenges
**Auth required:** Yes

Lists member's active and recent challenge participations.

**Response 200:**
```json
{
  "active": [ /* participation objects with challenge details */ ],
  "completed": [ /* recent completions */ ]
}
```

---

## 9. Daily Content Endpoints

### GET /v1/daily-content/today
**Auth required:** Yes

Returns today's daily content for the authenticated member.
Reads from KV (`daily:{member_id}:{YYYY-MM-DD}`) first. If not found,
reads from D1 and populates KV delivery record.

**Response 200:**
```json
{
  "content": {
    "id": "...",
    "house": "becoming",
    "content_type": "insight",
    "title": "Your North Star",
    "body": "Before you set goals, clarify your direction...",
    "media_url": null,
    "day_theme": "becoming",
    "date": "2025-01-13"
  },
  "delivery": {
    "delivered_at": "2025-01-13T05:00:00Z",
    "completed_at": null
  }
}
```

**Errors:**
- `404` — `NO_CONTENT_SCHEDULED` (triggers admin alert if not already alerted)

---

### POST /v1/daily-content/:contentId/complete
**Auth required:** Yes

Marks today's daily content as completed by the member. Updates KV delivery state
and D1 delivery record. Awards participation points.

**Response 200:**
```json
{
  "completed": true,
  "points_awarded": 5,
  "new_total_score": 340
}
```

---

## 10. Leaderboard Endpoints

### GET /v1/chapters/:chapterId/leaderboard
**Auth required:** Yes

**Query params:** `?house=becoming&period=weekly&limit=50`

**Response 200:**
```json
{
  "leaderboard": {
    "period": "weekly",
    "house": "becoming",
    "scope": "chapter",
    "generated_at": "...",
    "entries": [
      {
        "rank": 1,
        "member": { "id": "...", "display_name": "...", "username": "...", "avatar_url": "..." },
        "score": 450,
        "change": 2     // rank change from previous period (+2 = moved up 2)
      }
    ],
    "my_position": {
      "rank": 14,
      "score": 120
    }
  }
}
```

---

## 11. Detector Endpoints (Phase 2)

### GET /v1/detectors
**Auth required:** Yes

Lists all four Detectors with member's completion status.

**Response 200:**
```json
{
  "detectors": [
    {
      "type": "personality",
      "title": "Personality Detector™",
      "description": "...",
      "status": "completed",              // "not_started" | "in_progress" | "completed"
      "completed_at": "2025-01-10T...",
      "retake_available_at": "2025-04-10T...",
      "has_full_report": false,            // true if Premium and PDF generated
      "min_tier_for_full_report": "premium"
    }
  ]
}
```

---

### GET /v1/detectors/:detectorType/questions
**Auth required:** Yes

Returns the active question set for a detector.

**Response 200:**
```json
{
  "question_set": {
    "id": "...",
    "detector_type": "personality",
    "version": "1.0",
    "title": "Personality Detector™",
    "questions": [ /* question objects from questions_json */ ],
    "in_progress_response_id": "..."   // if member has an in-progress session
  }
}
```

---

### POST /v1/detectors/:detectorType/responses
**Auth required:** Yes

Creates a new Detector response session (or resumes in-progress).

**Response 201:**
```json
{ "response_id": "...", "status": "in_progress" }
```

**Errors:**
- `409` — `RETAKE_NOT_AVAILABLE` with `{ retake_available_at: "..." }`

---

### PATCH /v1/detectors/:detectorType/responses/:responseId
**Auth required:** Yes

Saves progress on a Detector response (called after each question).

**Request body:**
```json
{
  "responses": { "q1": "a", "q3": 7 },
  "last_question_id": "q3",
  "is_complete": false
}
```

**Response 200:**
```json
{
  "response": { "id": "...", "status": "in_progress", "last_question_id": "q3" }
}
```

---

### POST /v1/detectors/:detectorType/responses/:responseId/submit
**Auth required:** Yes

Submits a completed response. Triggers result computation.

**Response 200:**
```json
{
  "result": {
    "id": "...",
    "detector_type": "personality",
    "summary": { /* basic result — available to all tiers */ },
    "full_report_available": false,   // true if Premium
    "full_report_url": null           // signed URL if Premium and PDF generated
  }
}
```

---

### GET /v1/detectors/:detectorType/results/latest
**Auth required:** Yes

**Response 200:**
```json
{
  "result": {
    "id": "...",
    "summary": { /* basic result */ },
    "full_report_url": null    // only populated for Premium members with generated PDF
  }
}
```

---

### GET /v1/detectors/:detectorType/results/:resultId/report
**Auth required:** Yes  
**Tier required:** Premium

Generates or retrieves the signed URL for the PDF report.

**Response 200:**
```json
{
  "report_url": "https://r2.alphaminds.com/detectors/.../report.pdf?X-Amz-Signature=...",
  "expires_at": "2025-01-15T10:10:00Z"   // 10 minutes from now
}
```

---

## 12. Subscription Endpoints

### GET /v1/me/subscription
**Auth required:** Yes

**Response 200:**
```json
{
  "subscription": {
    "tier": "free",
    "status": "active",
    "payment_provider": null,
    "current_period_end": null,
    "cancel_at_period_end": false
  }
}
```

---

### POST /v1/subscriptions/checkout
**Auth required:** Yes  
**Phase:** Phase 3

Initiates a checkout session with Paystack or Stripe.

**Request body:**
```json
{
  "tier": "premium",
  "billing_interval": "monthly",
  "payment_provider": "paystack"   // "paystack" | "stripe"
}
```

**Response 200:**
```json
{
  "checkout_url": "https://checkout.paystack.com/...",
  "session_id": "..."
}
```

---

### POST /v1/subscriptions/cancel
**Auth required:** Yes  
**Phase:** Phase 3

**Response 200:**
```json
{
  "cancelled": true,
  "access_until": "2025-02-01T00:00:00Z"
}
```

---

## 13. Media Upload Endpoints

### POST /v1/media/upload
**Auth required:** Yes  
**Content-Type:** `multipart/form-data`

Pre-uploads media to R2. Returns R2 key for use in post/event creation.
The Worker validates file type and size, uploads to R2, returns the key.

**Request:** Form data with `file` field.

**Response 201:**
```json
{
  "r2_key": "members/{member_id}/posts/{uuid}/image.webp",
  "url": "https://cdn.alphaminds.com/members/{member_id}/posts/{uuid}/image.webp",
  "size_bytes": 245632,
  "media_type": "image/webp"
}
```

**Constraints:**
- Images: max 10MB, types: jpeg/png/webp/gif
- Audio: max 50MB, types: mp3/m4a (Admin only for podcast uploads)

---

## 14. Notifications Endpoints

### GET /v1/me/notifications
**Auth required:** Yes  
**Query params:** `?limit=20&cursor=...&unread_only=true`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "type": "new_comment",
      "title": "John replied to your post",
      "body": "\"This is so inspiring!\"",
      "action_url": "/rooms/beatlift-room/posts/...",
      "is_read": false,
      "created_at": "..."
    }
  ],
  "unread_count": 3,
  "pagination": { /* ... */ }
}
```

---

### POST /v1/me/notifications/read-all
**Auth required:** Yes

Marks all notifications as read.

**Response 200:**
```json
{ "updated_count": 3 }
```

---

### PUT /v1/me/push-token
**Auth required:** Yes

Registers or updates the member's Web Push subscription for push notifications.

**Request body:**
```json
{
  "push_subscription": {
    "endpoint": "https://fcm.googleapis.com/fcm/send/...",
    "keys": {
      "p256dh": "...",
      "auth": "..."
    }
  }
}
```

**Response 200:**
```json
{ "success": true }
```

---

## 15. Admin Endpoints

All admin endpoints require role = `admin` or `founder`.

### GET /v1/admin/members
**Auth required:** Yes  
**Role required:** admin

**Query params:** `?chapter_id=...&house=...&role=...&limit=20&cursor=...`

**Response 200:**
```json
{
  "data": [ /* member summaries */ ],
  "pagination": { /* ... */ },
  "total_count": 1234
}
```

---

### PATCH /v1/admin/members/:memberId
**Auth required:** Yes  
**Role required:** admin

Update member role or status.

**Request body:**
```json
{
  "role": "moderator",
  "is_active": true
}
```

---

### POST /v1/admin/daily-content
**Auth required:** Yes  
**Role required:** admin

Creates a new daily content item.

**Request body:**
```json
{
  "house": "becoming",
  "content_type": "insight",
  "title": "Your North Star",
  "body": "Before you set goals...",
  "scheduled_date": "2025-01-20",   // OR use day_of_week
  "day_of_week": null,
  "media_r2_key": null
}
```

**Response 201:**
```json
{ "content": { /* daily_content object */ } }
```

---

### GET /v1/admin/cron-logs
**Auth required:** Yes  
**Role required:** admin

Returns recent Cron execution logs.

**Query params:** `?job_name=daily_content_delivery&limit=10`

**Response 200:**
```json
{
  "data": [
    {
      "id": "...",
      "job_name": "daily_content_delivery",
      "status": "success",
      "started_at": "...",
      "completed_at": "...",
      "records_processed": 1247
    }
  ]
}
```

---

### POST /v1/admin/chapters
**Auth required:** Yes  
**Role required:** admin

Creates a new chapter.

**Request body:**
```json
{
  "slug": "nairobi-city",
  "name": "Nairobi City Chapter",
  "type": "city",
  "country_code": "KE",
  "city": "Nairobi",
  "timezone": "Africa/Nairobi"
}
```

---

## 16. Webhook Endpoints (Phase 3)

### POST /v1/webhooks/paystack
**Auth required:** No (signature validation instead)

Validates `x-paystack-signature` header (HMAC-SHA512 of payload using Paystack secret key).

**Handled events:**
- `charge.success` → activate subscription
- `subscription.create` → create subscription record
- `subscription.not_renew` → mark as cancelled
- `invoice.payment_failed` → mark as past_due

**Response 200:**
```json
{ "received": true }
```

The webhook handler always returns 200 immediately and processes asynchronously.
Never return 500 to a payment webhook — this causes retries that may double-process.

---

### POST /v1/webhooks/stripe
**Auth required:** No (signature validation instead)

Validates `stripe-signature` header using Stripe webhook secret.

**Handled events:**
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`
- `invoice.payment_failed`

---

## 17. Worker JWT Validation — Implementation Detail

Every authenticated endpoint goes through this middleware sequence:

```typescript
export async function authMiddleware(
  request: Request,
  env: Env
): Promise<{ session: SessionPayload } | Response> {

  // 1. Extract token
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return unauthorizedResponse('Missing or malformed Authorization header');
  }
  const token = authHeader.slice(7);

  // 2. Validate against KV
  const sessionData = await env.ALPHAMINDS_SESSIONS.get(`session:${token}`, 'json');
  if (!sessionData) {
    return unauthorizedResponse('Session not found or expired');
  }

  const session = sessionData as SessionPayload;

  // 3. Check expiry (belt-and-suspenders — KV TTL should handle this)
  if (new Date(session.expires_at) < new Date()) {
    await env.ALPHAMINDS_SESSIONS.delete(`session:${token}`);
    return unauthorizedResponse('Session expired');
  }

  // 4. Slide TTL if < 24h remaining
  const expiresAt = new Date(session.expires_at);
  const hoursRemaining = (expiresAt.getTime() - Date.now()) / 3600000;
  if (hoursRemaining < 24) {
    const newExpiry = new Date(Date.now() + 7 * 24 * 3600000);
    session.expires_at = newExpiry.toISOString();
    await env.ALPHAMINDS_SESSIONS.put(
      `session:${token}`,
      JSON.stringify(session),
      { expirationTtl: 7 * 24 * 3600 }
    );
  }

  return { session };
}

function unauthorizedResponse(message: string): Response {
  return new Response(
    JSON.stringify({ error: message, code: 'UNAUTHORIZED' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}
```
