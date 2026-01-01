import crypto from 'crypto';
import { SignJWT, jwtVerify, type JWTPayload } from 'jose';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function getJwtSecretKey(): Uint8Array {
  const secret = requiredEnv('JWT_SECRET');
  return new TextEncoder().encode(secret);
}

export interface AccessTokenClaims {
  sub: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresInSeconds: number;
  refreshTokenExpiresInSeconds: number;
}

export async function signAccessToken(userId: string): Promise<{ token: string; expiresInSeconds: number }> {
  const issuer = process.env.JWT_ISSUER || 'kitchenwiz';
  const audience = process.env.JWT_AUDIENCE || 'kitchenwiz-mobile';
  const expiresInSeconds = Number(process.env.ACCESS_TOKEN_TTL_SECONDS || 15 * 60);

  const now = Math.floor(Date.now() / 1000);
  const jwt = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(audience)
    .setSubject(userId)
    .setIssuedAt(now)
    .setExpirationTime(now + expiresInSeconds)
    .sign(getJwtSecretKey());

  return { token: jwt, expiresInSeconds };
}

export function generateRefreshToken(): { token: string; expiresInSeconds: number } {
  const expiresInSeconds = Number(process.env.REFRESH_TOKEN_TTL_SECONDS || 30 * 24 * 60 * 60);
  const token = crypto.randomBytes(48).toString('base64url');
  return { token, expiresInSeconds };
}

export function hashRefreshToken(refreshToken: string): string {
  return crypto.createHash('sha256').update(refreshToken).digest('hex');
}

export async function verifyAccessToken(accessToken: string): Promise<JWTPayload> {
  const issuer = process.env.JWT_ISSUER || 'kitchenwiz';
  const audience = process.env.JWT_AUDIENCE || 'kitchenwiz-mobile';

  const { payload } = await jwtVerify(accessToken, getJwtSecretKey(), {
    issuer,
    audience,
  });

  return payload;
}
