import type { HouseId } from "./constants";

export interface DailyContentItem {
  id: string;
  house: HouseId;
  content_type: string;
  title: string;
  body: string;
  day_of_week: string;
  scheduled_date?: string;
  media_r2_key?: string | null;
}

export interface DailyContentResponse {
  content: DailyContentItem | null;
  delivery: {
    delivered_at: string;
    completed_at: string | null;
  } | null;
}

export interface Badge {
  id: string;
  name: string;
  icon?: string;
  earned_at?: string;
  earnedAt?: string;
}

export interface MyProfileResponse {
  id: string;
  display_name: string;
  username: string;
  email: string;
  bio?: string;
  avatar_url?: string | null;
  cover_photo_url?: string | null;
  primary_house: HouseId;
  secondary_houses?: string[];
  chapter_id?: string | null;
  membership_level?: string;
  role?: string;
  subscription_tier?: string;
  email_verified?: boolean;
  created_at?: string;
  joined_at?: string;
  streak?: number;
  total_points?: number;
  challenges_completed?: number;
  events_attended?: number;
  scores?: Record<string, number>;
  chapter?: string;
  badges?: Badge[];
}

export interface HouseSummary {
  id: HouseId;
  name: string;
  description: string;
  emoji: string;
  color: string;
  room_count?: number;
  event_count?: number;
  challenge_count?: number;
  member_count?: number;
}

export interface HousesResponse {
  houses: HouseSummary[];
}

export interface HouseDetailResponse {
  house: HouseSummary;
  rooms: RoomItem[];
  events: EventItem[];
  challenges: ChallengeItem[];
}

export interface RoomItem {
  id: string;
  name: string;
  house: HouseId;
  description: string;
  member_count?: number;
  memberCount?: number;
  last_activity?: string;
  lastActivity?: string;
  last_post_preview?: string;
  lastPostPreview?: string;
  unread?: boolean;
  joined?: boolean;
  isMember?: boolean;
}

export interface RoomsResponse {
  data: RoomItem[];
  rooms?: RoomItem[];
}

export interface PostAuthor {
  id?: string;
  name: string;
  username?: string;
  display_name?: string;
  primaryHouse?: string;
  primary_house?: string;
  avatar?: string;
  avatar_url?: string | null;
}

export interface PostItem {
  id: string;
  room_id?: string;
  roomId?: string;
  author?: PostAuthor;
  content: string;
  title?: string;
  created_at?: string;
  timestamp?: string;
  reactions?: number;
  likes?: number;
  liked?: boolean;
  comment_count?: number;
  comments?: number;
  reply_count?: number;
  replyCount?: number;
  image?: string;
  poll?: {
    question: string;
    options: { label: string; votes: number }[];
  };
}

export interface PostsResponse {
  data: PostItem[];
  nextCursor?: string | null;
  next_cursor?: string | null;
}

export interface PostDetailResponse {
  id: string;
  room_id?: string;
  roomId?: string;
  author: PostAuthor;
  content: string;
  title?: string;
  created_at: string;
  timestamp?: string;
  likes?: number;
  liked?: boolean;
  reactions?: number;
  comment_count?: number;
  comments_count?: number;
  comments?: PostCommentItem[];
  image?: string;
  poll?: {
    question: string;
    options: { label: string; votes: number }[];
  };
}

export interface PostCommentItem {
  id: string;
  content: string;
  author?: PostAuthor;
  created_at?: string;
}

export interface PostCommentsResponse {
  data: PostCommentItem[];
  nextCursor?: string | null;
}

export interface EventItem {
  id: string;
  title: string;
  event_type?: string;
  type?: string;
  house: HouseId;
  starts_at: string;
  ends_at?: string;
  format?: string;
  location_name?: string;
  location_address?: string;
  location?: string;
  description?: string;
  host?: {
    id?: string;
    name?: string;
    display_name?: string;
    avatar?: string;
  };
  rsvp_count?: number;
  rsvpCount?: number;
  rsvp_limit?: number;
  rsvpLimit?: number;
  tags?: string[];
  capacity?: number;
  online_url?: string;
  registration_url?: string;
  is_rsvped?: string | null;
}

export interface EventsResponse {
  data: EventItem[];
}

export interface EventAttendee {
  status: string;
  rsvped_at: string;
  member_id: string;
  username: string;
  display_name: string;
  avatar_r2_key: string | null;
}

export interface EventDetailResponse extends EventItem {
  attendees?: EventAttendee[];
  is_rsvped?: string | null;
}

export interface ChallengeLogEntry {
  date: string;
  note: string;
  value: number;
}

export interface ChallengeItem {
  id: string;
  name: string;
  house: HouseId;
  description?: string;
  metric: string;
  type?: string;
  joined?: boolean;
  participant_count?: number;
  participants?: number;
  days_left?: number;
  daysLeft?: number;
  points?: number;
  pointsNum?: number;
  current?: number;
  target?: number;
  unit?: string;
  log?: ChallengeLogEntry[];
  leaderboard?: LeaderboardEntry[];
}

export interface ChallengesResponse {
  data: ChallengeItem[];
  challenges?: ChallengeItem[];
}

export interface ChallengeDetailResponse extends ChallengeItem {
  leaderboard: LeaderboardEntry[];
}

export interface MyChallengesResponse {
  active: ChallengeItem[];
  completed: ChallengeItem[];
}

export interface LeaderboardEntry {
  id: string;
  name?: string;
  display_name?: string;
  username: string;
  primary_house?: string;
  primaryHouse?: string;
  value?: number;
  score?: number;
  rank?: number;
}

export interface LeaderboardResponse {
  data: LeaderboardEntry[];
}

export interface NotificationItemAPI {
  id: string;
  type: string;
  title: string;
  body: string;
  created_at?: string;
  read?: boolean;
  group?: string;
  action_url?: string | null;
  actor?: {
    name?: string;
    display_name?: string;
    avatar?: string | null;
  };
}

export interface NotificationsResponse {
  data: NotificationItemAPI[];
  unread_count: number;
  pagination?: {
    next_cursor: string | null;
    has_more: boolean;
    limit: number;
  };
}

export interface SubscriptionResponse {
  tier: string;
  valid_until?: string;
  status?: string;
  updated_at?: string;
}

export interface MemberProfileResponse {
  id: string;
  display_name: string;
  name?: string;
  username: string;
  primary_house: HouseId;
  primaryHouse?: HouseId;
  bio?: string;
  avatar_url?: string | null;
  cover_photo_url?: string | null;
  chapter?: string;
  scores?: Record<string, number>;
  is_self?: boolean;
  is_following?: boolean;
  follower_count?: number;
  following_count?: number;
}

export interface EventRegistration {
  id: string;
  status: string;
  rsvped_at: string;
  member_id: string;
  username: string;
  display_name: string;
  avatar_r2_key: string | null;
  email?: string;
}

export interface JourneyActivity {
  id: string;
  title: string;
  description: string | null;
  type: string;
  instructions: string | null;
  content: string | null;
  position: number;
  is_required: boolean;
  status: "completed" | "active" | "locked";
  completed_at: string | null;
}

export interface JourneyData {
  level: string;
  next_level: string | null;
  completed_count: number;
  total_count: number;
  activities: JourneyActivity[];
}

