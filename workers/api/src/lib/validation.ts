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
  house: z.string(),
  content_type: z.string(),
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

export const MediaUploadSchema = z.object({
  file: z.instanceof(File),
});
export type MediaUploadInput = z.infer<typeof MediaUploadSchema>;

export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
