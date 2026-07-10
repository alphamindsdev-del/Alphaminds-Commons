// Shared TypeScript definitions

import { House, Role, Tier } from './constants.js';

// Cloudflare Worker Bindings Env
export interface Env {
  // Database
  DB: D1Database;

  // KV Namespaces
  ALPHAMINDS_SESSIONS: KVNamespace;
  ALPHAMINDS_SUBSCRIPTION_CACHE: KVNamespace;
  ALPHAMINDS_DAILY_DELIVERY: KVNamespace;
  ALPHAMINDS_RATE_LIMITS: KVNamespace;
  ALPHAMINDS_CONTENT_SCHEDULE_CACHE: KVNamespace;
  ALPHAMINDS_CHAPTER_CONFIG: KVNamespace;

  // R2 Buckets
  MEDIA_BUCKET: R2Bucket;
  BACKUP_BUCKET: R2Bucket;

  // Secrets & Configs
  JWT_SESSION_SECRET: string;
  RESEND_API_KEY: string;
  WEB_PUSH_VAPID_PRIVATE: string;
  WEB_PUSH_VAPID_PUBLIC: string;
  ADMIN_ALERT_EMAIL: string;
  ENVIRONMENT: 'development' | 'staging' | 'production';

  // Needed for backups (from environment / settings)
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
  DB_ID?: string;
}

// Session Payload in KV
export interface SessionPayload {
  member_id: string;
  email: string;
  username: string;
  role: Role;
  chapter_id: string | null;
  subscription_tier: Tier;
  issued_at: string;
  expires_at: string;
}

// --- D1 Table Rows ---

export interface ChapterRow {
  id: string;
  slug: string;
  name: string;
  type: 'university' | 'city' | 'country' | 'global';
  country_code: string | null;
  city: string | null;
  university: string | null;
  timezone: string;
  is_active: number; // 0 or 1
  founded_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberRow {
  id: string;
  email: string;
  username: string;
  display_name: string;
  password_hash: string | null;
  google_id: string | null;
  avatar_r2_key: string | null;
  bio: string | null;
  country_code: string | null;
  city: string | null;
  age: number | null;
  gender: 'male' | 'female' | 'non_binary' | 'prefer_not_to_say' | null;
  chapter_id: string | null;
  primary_house: House;
  role: Role;
  is_active: number;
  email_verified: number;
  push_token: string | null; // JSON string
  last_active_at: string | null;
  session_revoked_at?: string | null; // For invalidating sessions on password reset
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberHouseSelectionRow {
  id: string;
  member_id: string;
  house: House;
  is_primary: number;
  joined_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface MemberStatsRow {
  id: string;
  member_id: string;
  becoming_score: number;
  connection_score: number;
  wellness_score: number;
  play_score: number;
  humanity_score: number;
  total_score: number;
  impact_score: number;
  current_streak_days: number;
  longest_streak_days: number;
  total_points: number;
  volunteer_hours: number;
  challenges_completed: number;
  events_attended: number;
  posts_authored: number;
  rooms_joined: number;
  detectors_completed: number;
  last_activity_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface MemberChapterHistoryRow {
  id: string;
  member_id: string;
  from_chapter_id: string | null;
  to_chapter_id: string | null;
  reason: string | null;
  transferred_by: string | null;
  created_at: string;
}

export interface MemberContextSnapshotRow {
  id: string;
  member_id: string;
  snapshot_date: string; // YYYY-MM-DD
  snapshot_json: string; // JSON string
  model_version: string;
  created_at: string;
}

export interface HouseRow {
  id: string; // House slug
  name: string;
  tagline: string;
  description: string;
  icon_emoji: string;
  color_hex: string;
  weekly_theme: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface RoomRow {
  id: string;
  chapter_id: string | null;
  house: House;
  name: string;
  slug: string;
  description: string | null;
  cover_r2_key: string | null;
  is_private: number;
  min_tier: Tier;
  member_count: number;
  is_active: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface RoomMembershipRow {
  id: string;
  room_id: string;
  member_id: string;
  role: 'member' | 'moderator';
  joined_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PostRow {
  id: string;
  room_id: string;
  author_id: string;
  chapter_id: string | null;
  house: House;
  content: string;
  media_r2_keys: string | null; // JSON string array
  post_type: 'text' | 'media' | 'poll' | 'event_share' | 'challenge_share';
  is_pinned: number;
  reaction_count: number;
  comment_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CommentRow {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ReactionRow {
  id: string;
  target_type: 'post' | 'comment';
  target_id: string;
  member_id: string;
  emoji: string;
  created_at: string;
}

export interface PollRow {
  id: string;
  post_id: string;
  question: string;
  options_json: string; // JSON string
  ends_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface PollVoteRow {
  id: string;
  poll_id: string;
  member_id: string;
  option_id: string;
  created_at: string;
}

export interface EventRow {
  id: string;
  chapter_id: string | null;
  house: House | null;
  title: string;
  slug: string;
  description: string | null;
  cover_r2_key: string | null;
  event_type: 'alpha_circle' | 'beatlift' | 'humanity_day' | 'book_club' | 'workshop' | 'swimming' | 'games' | 'summit' | 'festival' | 'other';
  format: 'physical' | 'online' | 'hybrid';
  location_name: string | null;
  location_address: string | null;
  location_coords: string | null; // JSON string
  online_url: string | null;
  starts_at: string;
  ends_at: string;
  timezone: string;
  rsvp_limit: number | null;
  rsvp_count: number;
  min_tier: Tier;
  is_published: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface EventRsvpRow {
  id: string;
  event_id: string;
  member_id: string;
  status: 'going' | 'maybe' | 'not_going' | 'waitlist';
  created_at: string;
  updated_at: string;
}

export interface ChallengeRow {
  id: string;
  house: House | 'global';
  title: string;
  slug: string;
  description: string | null;
  instructions: string | null;
  challenge_type: 'daily' | 'weekly' | 'monthly' | 'event_based';
  metric_type: 'steps' | 'pages' | 'minutes' | 'entries' | 'custom' | null;
  target_value: number | null;
  duration_days: number | null;
  points_reward: number;
  min_tier: Tier;
  is_active: number;
  starts_at: string | null;
  ends_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface ChallengeParticipationRow {
  id: string;
  challenge_id: string;
  member_id: string;
  chapter_id: string | null;
  status: 'active' | 'completed' | 'abandoned';
  current_value: number;
  target_value: number | null;
  completion_pct: number;
  completed_at: string | null;
  last_logged_at: string | null;
  log_count: number;
  points_awarded: number;
  created_at: string;
  updated_at: string;
}

export interface ChallengeLogRow {
  id: string;
  participation_id: string;
  member_id: string;
  value: number;
  note: string | null;
  logged_date: string; // YYYY-MM-DD
  created_at: string;
}

export interface DailyContentRow {
  id: string;
  house: House | 'global';
  content_type: 'insight' | 'challenge' | 'question' | 'wellness_tip' | 'humanity_action';
  title: string;
  body: string;
  media_r2_key: string | null;
  scheduled_date: string | null; // YYYY-MM-DD
  day_of_week: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | null;
  week_number: number | null;
  is_published: number;
  authored_by: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface DailyContentDeliveryRow {
  id: string;
  member_id: string;
  content_id: string;
  delivery_date: string; // YYYY-MM-DD
  delivered_at: string;
  completed_at: string | null;
}

export interface SubscriptionRow {
  id: string;
  member_id: string;
  tier: Tier;
  status: 'active' | 'cancelled' | 'past_due' | 'grace_period' | 'expired';
  payment_provider: 'paystack' | 'stripe' | null;
  provider_sub_id: string | null;
  provider_cust_id: string | null;
  amount_cents: number | null;
  currency_code: string | null;
  billing_interval: 'monthly' | 'annual' | null;
  current_period_start: string | null;
  current_period_end: string | null;
  grace_period_days: number;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface SubscriptionEventRow {
  id: string;
  subscription_id: string;
  member_id: string;
  event_type: 'created' | 'upgraded' | 'downgraded' | 'cancelled' | 'payment_failed' | 'renewed';
  from_tier: Tier | null;
  to_tier: Tier | null;
  provider_event_id: string | null;
  payload_json: string | null; // JSON string
  created_at: string;
}

export interface BadgeRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon_r2_key: string | null;
  house: House | null;
  trigger_type: 'challenge_count' | 'streak' | 'event_count' | 'manual' | 'detector';
  trigger_value: number | null;
  points_value: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface MemberBadgeRow {
  id: string;
  member_id: string;
  badge_id: string;
  awarded_at: string;
  awarded_by: string | null;
}

export interface LeaderboardSnapshotRow {
  id: string;
  snapshot_at: string;
  period_type: 'daily' | 'weekly' | 'monthly' | 'all_time';
  scope_type: 'global' | 'chapter' | 'house';
  scope_id: string | null;
  house: House | null;
  rank: number;
  member_id: string;
  score: number;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  member_id: string;
  type: 'new_post' | 'new_comment' | 'new_event' | 'badge_awarded' | 'challenge_reminder' | 'daily_content';
  title: string;
  body: string | null;
  action_url: string | null;
  is_read: number;
  push_sent: number;
  push_sent_at: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface DetectorQuestionSetRow {
  id: string;
  detector_type: 'personality' | 'purpose' | 'health_index' | 'love_life';
  version: string;
  title: string;
  description: string | null;
  questions_json: string; // JSON string
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DetectorResponseRow {
  id: string;
  member_id: string;
  question_set_id: string;
  detector_type: 'personality' | 'purpose' | 'health_index' | 'love_life';
  status: 'in_progress' | 'completed' | 'abandoned';
  responses_json: string; // JSON string
  started_at: string;
  completed_at: string | null;
  last_question_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DetectorResultRow {
  id: string;
  member_id: string;
  response_id: string;
  detector_type: 'personality' | 'purpose' | 'health_index' | 'love_life';
  question_set_id: string;
  question_set_version: string;
  result_summary_json: string; // JSON string
  result_full_json: string | null; // JSON string
  pdf_r2_key: string | null;
  pdf_generated_at: string | null;
  retake_available_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookRow {
  id: string;
  title: string;
  author: string;
  cover_r2_key: string | null;
  description: string | null;
  month: string; // YYYY-MM
  discussion_room_id: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface BookReadingProgressRow {
  id: string;
  book_id: string;
  member_id: string;
  pages_read: number;
  total_pages: number | null;
  status: 'not_started' | 'reading' | 'completed';
  created_at: string;
  updated_at: string;
}

export interface PodcastRow {
  id: string;
  title: string;
  description: string | null;
  house: House | 'global' | null;
  cover_r2_key: string | null;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface PodcastEpisodeRow {
  id: string;
  podcast_id: string;
  title: string;
  description: string | null;
  audio_r2_key: string;
  duration_seconds: number | null;
  episode_number: number | null;
  published_at: string | null;
  min_tier: Tier;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

export interface CronExecutionLogRow {
  id: string;
  job_name: string;
  scheduled_at: string;
  started_at: string;
  completed_at: string | null;
  status: 'running' | 'success' | 'failed' | 'partial';
  records_processed: number | null;
  error_message: string | null;
  metadata_json: string | null; // JSON string
}

export interface RoomMessageRow {
  id: string;
  room_id: string;
  member_id: string;
  content: string;
  message_type: 'text' | 'media' | 'system';
  media_r2_key: string | null;
  reply_to_id: string | null;
  created_at: string;
  deleted_at: string | null;
}

export interface AdminAuditLogRow {
  id: string;
  admin_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  before_json: string | null; // JSON string
  after_json: string | null; // JSON string
  ip_address: string | null;
  created_at: string;
}
