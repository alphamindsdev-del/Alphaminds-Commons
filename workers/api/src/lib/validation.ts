import { z } from 'zod';
import { HOUSES, TIERS } from '../../../shared/constants.js';

export const GENDER_OPTIONS = ['male', 'female', 'non_binary', 'prefer_not_to_say'] as const;
export const POST_TYPE_OPTIONS = ['text', 'media', 'poll', 'event_share', 'challenge_share'] as const;
export const RSVP_STATUS_OPTIONS = ['going', 'maybe', 'not_going'] as const;

export const RegisterSchema = z.object({
  email: z.string().max(254).email(),
  username: z.string().min(3).max(30).regex(/^[a-z0-9_]+$/),
  display_name: z.string().min(1).max(60),
  password: z.string().min(8).max(128),
  country_code: z.string().length(2).optional(),
  age: z.number().int().min(13).max(120).optional(),
  gender: z.enum(GENDER_OPTIONS).optional(),
  primary_house: z.enum(HOUSES),
  secondary_houses: z.array(z.enum(HOUSES)).max(2).optional().default([]),
  chapter_id: z.string().optional(),
  timezone: z.string().optional().default('UTC'),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string(),
  password: z.string(),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const CreatePostSchema = z.object({
  content: z.string().min(1).max(10000),
  post_type: z.enum(POST_TYPE_OPTIONS).default('text'),
  media_r2_keys: z.array(z.string()).optional().default([]),
});
export type CreatePostInput = z.infer<typeof CreatePostSchema>;

export const CreateCommentSchema = z.object({
  content: z.string().min(1).max(5000),
  parent_id: z.string().optional(),
});
export type CreateCommentInput = z.infer<typeof CreateCommentSchema>;

export const UpdateProfileSchema = z.object({
  display_name: z.string().min(1).max(60).optional(),
  bio: z.string().max(500).optional(),
  country_code: z.string().length(2).optional(),
  city: z.string().max(100).optional(),
});
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export const UpdateHousesSchema = z.object({
  primary_house: z.enum(HOUSES),
  secondary_houses: z.array(z.enum(HOUSES)).max(2),
});
export type UpdateHousesInput = z.infer<typeof UpdateHousesSchema>;

export const RsvpSchema = z.object({
  status: z.enum(RSVP_STATUS_OPTIONS),
});
export type RsvpInput = z.infer<typeof RsvpSchema>;

export const CreateDailyContentSchema = z.object({
  house: z.string().optional(),
  content_type: z.enum(['insight', 'challenge', 'question', 'wellness_tip', 'humanity_action']).optional().default('insight'),
  title: z.string(),
  body: z.string(),
  scheduled_date: z.string().optional(),
  day_of_week: z.string().optional(),
  media_r2_key: z.string().optional(),
});
export type CreateDailyContentInput = z.infer<typeof CreateDailyContentSchema>;

export const UpdateMemberAdminSchema = z.object({
  role: z.string().optional(),
  is_active: z.boolean().optional(),
});
export type UpdateMemberAdminInput = z.infer<typeof UpdateMemberAdminSchema>;

export const LogProgressSchema = z.object({
  value: z.number(),
  note: z.string().max(500).optional(),
  logged_date: z.string(),
});
export type LogProgressInput = z.infer<typeof LogProgressSchema>;

export const CreateChapterSchema = z.object({
  slug: z.string(),
  name: z.string(),
  type: z.string(),
  country_code: z.string().optional(),
  city: z.string().optional(),
  timezone: z.string().optional().default('UTC'),
});
export type CreateChapterInput = z.infer<typeof CreateChapterSchema>;

export const UpdateChapterSchema = CreateChapterSchema.partial().extend({
  is_active: z.boolean().optional(),
});
export type UpdateChapterInput = z.infer<typeof UpdateChapterSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string(),
});
export type ForgotPasswordInput = z.infer<typeof ForgotPasswordSchema>;

export const VerifyOtpSchema = z.object({
  email: z.string(),
  otp: z.string(),
});
export type VerifyOtpInput = z.infer<typeof VerifyOtpSchema>;

export const ResetPasswordSchema = z.object({
  reset_token: z.string(),
  new_password: z.string().min(8).max(128),
});
export type ResetPasswordInput = z.infer<typeof ResetPasswordSchema>;

export const ChangeReactionSchema = z.object({
  emoji: z.string(),
});
export type ChangeReactionInput = z.infer<typeof ChangeReactionSchema>;

export const CreatePlanSchema = z.object({
  title: z.string().min(1).max(200),
  slug: z.string().min(1).max(200).regex(/^[a-z0-9-]+$/),
  description: z.string().default(''),
  cover_image_r2_key: z.string().optional(),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  estimated_duration: z.string().optional(),
  is_published: z.boolean().optional(),
});
export type CreatePlanInput = z.infer<typeof CreatePlanSchema>;

export const CreatePlanSectionSchema = z.object({
  plan_id: z.string(),
  title: z.string().min(1).max(200),
  description: z.string().default(''),
  sort_order: z.number().int().default(0),
});
export type CreatePlanSectionInput = z.infer<typeof CreatePlanSectionSchema>;

export const CreatePlanItemSchema = z.object({
  plan_id: z.string(),
  section_id: z.string().optional(),
  title: z.string().min(1).max(200),
  body: z.string().default(''),
  content_type: z.enum(['video', 'audio', 'article', 'image']),
  media_r2_key: z.string().optional(),
  sort_order: z.number().int().default(0),
});
export type CreatePlanItemInput = z.infer<typeof CreatePlanItemSchema>;

export const MediaUploadSchema = z.object({
  file: z.instanceof(File),
});
export type MediaUploadInput = z.infer<typeof MediaUploadSchema>;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;

export const CreateJourneyActivitySchema = z.object({
  level: z.enum(['SEEKER', 'EXAMINER', 'FACILITATOR', 'STEWARD', 'CHAPTER_LEADER', 'COORDINATOR']),
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  type: z.enum(['course', 'lesson', 'reading', 'assignment', 'quiz', 'assessment', 'rel_fi', 'claim_file', 'video', 'audio', 'article', 'resource', 'custom']),
  instructions: z.string().optional(),
  position: z.number().int().min(1),
  is_required: z.boolean().optional().default(true),
  is_published: z.boolean().optional().default(false),
  content: z.string().optional(),
  metadata_json: z.string().optional().default('{}'),
});
export type CreateJourneyActivityInput = z.infer<typeof CreateJourneyActivitySchema>;

export const UpdateJourneyActivitySchema = z.object({
  level: z.enum(['SEEKER', 'EXAMINER', 'FACILITATOR', 'STEWARD', 'CHAPTER_LEADER', 'COORDINATOR']).optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  type: z.enum(['course', 'lesson', 'reading', 'assignment', 'quiz', 'assessment', 'rel_fi', 'claim_file', 'video', 'audio', 'article', 'resource', 'custom']).optional(),
  instructions: z.string().optional(),
  position: z.number().int().optional(),
  is_required: z.boolean().optional(),
  is_published: z.boolean().optional(),
  content: z.string().optional(),
  metadata_json: z.string().optional(),
});
export type UpdateJourneyActivityInput = z.infer<typeof UpdateJourneyActivitySchema>;

export const CreateCodeSchema = z.object({
  title: z.string().min(1).max(200),
  passage: z.string(),
  scheduled_date: z.string().optional(),
  is_published: z.boolean().optional().default(true),
});
export type CreateCodeInput = z.infer<typeof CreateCodeSchema>;

export const UpdateCodeSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  passage: z.string().optional(),
  scheduled_date: z.string().optional(),
  is_published: z.boolean().optional(),
});
export type UpdateCodeInput = z.infer<typeof UpdateCodeSchema>;

export const SaveCodeSchema = z.object({
  member_id: z.string(),
  code_id: z.string(),
});
export type SaveCodeInput = z.infer<typeof SaveCodeSchema>;
