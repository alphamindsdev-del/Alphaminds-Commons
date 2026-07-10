import { describe, it, expect } from 'vitest';
import app from '../../workers/api/src/index.js';

describe('GET /', () => {
  it('returns API info', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.name).toBe('AlphaMinds Commons API');
    expect(body.version).toBe('1.0');
  });
});
