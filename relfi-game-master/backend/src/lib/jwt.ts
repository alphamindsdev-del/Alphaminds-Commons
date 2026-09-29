import { SignJWT, jwtVerify, type JWTPayload } from 'jose'

export interface JwtPayload extends JWTPayload {
  user_id: string
  role: 'player' | 'admin'
}

function getSecret(env: { JWT_SECRET: string }): Uint8Array {
  return new TextEncoder().encode(env.JWT_SECRET)
}

export async function signToken(
  payload: JwtPayload,
  env: { JWT_SECRET: string }
): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret(env))
}

export async function verifyToken(
  token: string,
  env: { JWT_SECRET: string }
): Promise<JwtPayload> {
  const { payload } = await jwtVerify(token, getSecret(env))
  return payload as JwtPayload
}

export interface HandoffClaims {
  sub: string
  email?: string
  display_name?: string
  username?: string
  role?: string
}

// Verifies an AlphaMinds-issued handoff JWT (HMAC, shared RELFI_SERVICE_SECRET)
// so the embedded frontend can exchange it for a Rel-Fi token without exposing
// the AlphaMinds session or calling back to AlphaMinds.
export async function verifyHandoff(
  token: string,
  secret: string,
): Promise<HandoffClaims> {
  const { payload } = await jwtVerify(token, new TextEncoder().encode(secret))
  return payload as HandoffClaims
}
