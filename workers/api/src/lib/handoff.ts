import { Env } from '../../../shared/types.js';

export interface HandoffClaims {
  sub: string;
  email: string;
  display_name: string;
  username: string;
  role: string;
}

function b64url(input: Uint8Array): string {
  let str = '';
  for (const b of input) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function b64urlDecode(input: string): Uint8Array {
  const pad = input.length % 4 ? 4 - (input.length % 4) : 0;
  const b64 = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat(pad);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  );
}

export async function signHandoff(env: Env, claims: HandoffClaims): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const payload = { ...claims, iss: 'alphaminds', aud: 'relfi', iat: now, exp: now + 300 };
  const data = `${b64url(new TextEncoder().encode(JSON.stringify(header)))}.${b64url(
    new TextEncoder().encode(JSON.stringify(payload)),
  )}`;
  const key = await hmacKey(env.RELFI_SERVICE_SECRET);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(data)));
  return `${data}.${b64url(sig)}`;
}

export async function verifyHandoff(env: Env, token: string): Promise<HandoffClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('Malformed handoff token');
  const data = `${parts[0]}.${parts[1]}`;
  const key = await hmacKey(env.RELFI_SERVICE_SECRET);
  const valid = await crypto.subtle.verify('HMAC', key, b64urlDecode(parts[2]!) as BufferSource, new TextEncoder().encode(data));
  if (!valid) throw new Error('Invalid handoff signature');
  const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[1]!))) as HandoffClaims & {
    exp: number;
  };
  if (payload.exp * 1000 < Date.now()) throw new Error('Handoff expired');
  return payload;
}
