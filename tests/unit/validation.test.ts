import { describe, it, expect } from 'vitest';
import {
  RegisterSchema,
  LoginSchema,
  CreatePostSchema,
  CreateCommentSchema,
  UpdateProfileSchema,
  UpdateHousesSchema,
  RsvpSchema,
  ForgotPasswordSchema,
  VerifyOtpSchema,
  ResetPasswordSchema,
} from '../../workers/api/src/lib/validation.js';

describe('validation schemas', () => {
  describe('RegisterSchema', () => {
    it('validates a valid registration', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid email', () => {
      const result = RegisterSchema.safeParse({
        email: 'not-an-email',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short username', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'ab',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(false);
    });

    it('rejects username with special chars', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'test user!',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(false);
    });

    it('rejects short password', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: '1234567',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(false);
    });

    it('rejects invalid house', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'invalid_house',
      });
      expect(result.success).toBe(false);
    });

    it('accepts optional fields', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'wellness',
        country_code: 'US',
        age: 25,
        gender: 'male',
        secondary_houses: ['connection'],
      });
      expect(result.success).toBe(true);
    });

    it('defaults secondary_houses to empty array', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.secondary_houses).toEqual([]);
      }
    });

    it('rejects more than 2 secondary houses', () => {
      const result = RegisterSchema.safeParse({
        email: 'test@example.com',
        username: 'testuser',
        display_name: 'Test User',
        password: 'password123',
        primary_house: 'becoming',
        secondary_houses: ['connection', 'wellness', 'play'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('LoginSchema', () => {
    it('validates a valid login', () => {
      const result = LoginSchema.safeParse({
        email: 'test@example.com',
        password: 'password123',
      });
      expect(result.success).toBe(true);
    });

    it('accepts empty email (no .min() constraint on login)', () => {
      const result = LoginSchema.safeParse({ email: '', password: 'pass' });
      expect(result.success).toBe(true);
    });
  });

  describe('CreatePostSchema', () => {
    it('validates a valid post', () => {
      const result = CreatePostSchema.safeParse({ content: 'Hello world' });
      expect(result.success).toBe(true);
    });

    it('defaults post_type to text', () => {
      const result = CreatePostSchema.safeParse({ content: 'Hello' });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.post_type).toBe('text');
      }
    });

    it('rejects empty content', () => {
      const result = CreatePostSchema.safeParse({ content: '' });
      expect(result.success).toBe(false);
    });

    it('rejects content over 10000 chars', () => {
      const result = CreatePostSchema.safeParse({ content: 'a'.repeat(10001) });
      expect(result.success).toBe(false);
    });
  });

  describe('CreateCommentSchema', () => {
    it('validates a valid comment', () => {
      const result = CreateCommentSchema.safeParse({ content: 'Nice post!' });
      expect(result.success).toBe(true);
    });

    it('accepts optional parent_id', () => {
      const result = CreateCommentSchema.safeParse({ content: 'Reply', parent_id: 'abc-123' });
      expect(result.success).toBe(true);
    });
  });

  describe('UpdateProfileSchema', () => {
    it('validates partial updates', () => {
      const result = UpdateProfileSchema.safeParse({ display_name: 'New Name' });
      expect(result.success).toBe(true);
    });

    it('validates all fields', () => {
      const result = UpdateProfileSchema.safeParse({
        display_name: 'New Name',
        bio: 'A short bio',
        country_code: 'US',
        city: 'New York',
      });
      expect(result.success).toBe(true);
    });

    it('rejects long bio', () => {
      const result = UpdateProfileSchema.safeParse({ bio: 'x'.repeat(501) });
      expect(result.success).toBe(false);
    });
  });

  describe('UpdateHousesSchema', () => {
    it('validates valid house update', () => {
      const result = UpdateHousesSchema.safeParse({
        primary_house: 'connection',
        secondary_houses: ['wellness'],
      });
      expect(result.success).toBe(true);
    });

    it('rejects more than 2 secondary houses', () => {
      const result = UpdateHousesSchema.safeParse({
        primary_house: 'connection',
        secondary_houses: ['wellness', 'play', 'humanity'],
      });
      expect(result.success).toBe(false);
    });
  });

  describe('RsvpSchema', () => {
    it('validates going', () => {
      const result = RsvpSchema.safeParse({ status: 'going' });
      expect(result.success).toBe(true);
    });

    it('validates maybe', () => {
      const result = RsvpSchema.safeParse({ status: 'maybe' });
      expect(result.success).toBe(true);
    });

    it('validates not_going', () => {
      const result = RsvpSchema.safeParse({ status: 'not_going' });
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const result = RsvpSchema.safeParse({ status: 'unknown' });
      expect(result.success).toBe(false);
    });
  });

  describe('ForgotPasswordSchema', () => {
    it('validates email', () => {
      const result = ForgotPasswordSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(true);
    });
  });

  describe('VerifyOtpSchema', () => {
    it('validates email and otp', () => {
      const result = VerifyOtpSchema.safeParse({ email: 'user@example.com', otp: '123456' });
      expect(result.success).toBe(true);
    });
  });

  describe('ResetPasswordSchema', () => {
    it('validates reset token and new password', () => {
      const result = ResetPasswordSchema.safeParse({
        reset_token: 'token-123',
        new_password: 'newpassword123',
      });
      expect(result.success).toBe(true);
    });

    it('rejects short password', () => {
      const result = ResetPasswordSchema.safeParse({
        reset_token: 'token-123',
        new_password: 'short',
      });
      expect(result.success).toBe(false);
    });
  });
});
