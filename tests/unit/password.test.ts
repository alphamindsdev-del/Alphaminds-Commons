import { describe, it, expect } from 'vitest';
import { hashPassword, verifyPassword } from '../../workers/api/src/lib/password.js';

describe('password utilities', () => {
  it('hashes and verifies a password', async () => {
    const password = 'securePassword123!';
    const hash = await hashPassword(password);
    expect(hash).toBeDefined();
    expect(hash).not.toBe(password);
    expect(hash.startsWith('$2a$')).toBe(true);

    const isValid = await verifyPassword(password, hash);
    expect(isValid).toBe(true);
  });

  it('rejects wrong password', async () => {
    const hash = await hashPassword('correctPassword');
    const isValid = await verifyPassword('wrongPassword', hash);
    expect(isValid).toBe(false);
  });

  it('generates different hashes for same password', async () => {
    const password = 'samePassword';
    const hash1 = await hashPassword(password);
    const hash2 = await hashPassword(password);
    expect(hash1).not.toBe(hash2);
  });
});
