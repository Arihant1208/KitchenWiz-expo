import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { AuthProvider } from './types';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export interface VerifiedIdToken {
  provider: AuthProvider;
  sub: string;
  email?: string;
  emailVerified?: boolean;
  name?: string;
}

export async function verifyGoogleIdToken(idToken: string): Promise<VerifiedIdToken> {
  const clientId = requiredEnv('GOOGLE_CLIENT_ID');

  // Google OIDC JWKS
  const jwks = createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));

  const { payload } = await jwtVerify(idToken, jwks, {
    issuer: ['https://accounts.google.com', 'accounts.google.com'],
    audience: clientId,
  });

  return {
    provider: 'google',
    sub: String(payload.sub),
    email: payload.email ? String(payload.email) : undefined,
    emailVerified: typeof payload.email_verified === 'boolean' ? payload.email_verified : undefined,
    name: payload.name ? String(payload.name) : undefined,
  };
}

export async function verifyMicrosoftIdToken(idToken: string): Promise<VerifiedIdToken> {
  const clientId = requiredEnv('MICROSOFT_CLIENT_ID');
  const tenant = process.env.MICROSOFT_TENANT_ID || 'common';

  // Microsoft v2.0 OpenID Connect JWKS
  const jwksUrl = `https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`;
  const jwks = createRemoteJWKSet(new URL(jwksUrl));

  // Issuer is tenant-specific; we accept common patterns to avoid brittle failures.
  const acceptedIssuers = [
    `https://login.microsoftonline.com/${tenant}/v2.0`,
    `https://sts.windows.net/${tenant}/`,
  ];

  const { payload } = await jwtVerify(idToken, jwks, {
    audience: clientId,
    issuer: acceptedIssuers,
  });

  // Microsoft tokens often use 'preferred_username' for email-like value.
  const emailCandidate =
    (payload.email ? String(payload.email) : undefined) ||
    (payload.preferred_username ? String(payload.preferred_username) : undefined) ||
    undefined;

  return {
    provider: 'microsoft',
    sub: String(payload.sub),
    email: emailCandidate,
    emailVerified: undefined, // not reliably present in MS id tokens
    name: payload.name ? String(payload.name) : undefined,
  };
}
