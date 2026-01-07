import { Router, type Request, type Response } from 'express';
import { query } from '../db';
import { hashPassword, verifyPassword } from '../auth/password';
import { generateRefreshToken, hashRefreshToken, signAccessToken } from '../auth/tokens';
import { verifyGoogleIdToken, verifyMicrosoftIdToken } from '../auth/oauth';
import { requireAuth } from '../auth/middleware';
import type { AuthProvider } from '../auth/types';

const router = Router();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function getIp(req: Request): string | null {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length > 0) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || null;
}

async function issueTokens(userId: string, req: Request) {
  const { token: accessToken, expiresInSeconds: accessTokenExpiresInSeconds } = await signAccessToken(userId);
  const { token: refreshToken, expiresInSeconds: refreshTokenExpiresInSeconds } = generateRefreshToken();

  const refreshTokenHash = hashRefreshToken(refreshToken);
  const expiresAt = new Date(Date.now() + refreshTokenExpiresInSeconds * 1000);

  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
     VALUES ($1, $2, $3, $4, $5)`,
    [userId, refreshTokenHash, expiresAt, req.headers['user-agent'] || null, getIp(req)]
  );

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresInSeconds,
    refreshTokenExpiresInSeconds,
  };
}

async function findUserByEmail(email: string) {
  const result = await query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] || null;
}

router.post('/signup', async (req: any, res: Response) => {
  const { email, password, name } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  const normalizedEmail = normalizeEmail(String(email));
  const passwordStr = String(password);

  if (passwordStr.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters' });
  }

  try {
    const existing = await findUserByEmail(normalizedEmail);
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const userResult = await query(
      `INSERT INTO users (email, email_verified, name)
       VALUES ($1, FALSE, $2)
       RETURNING id, email, name`,
      [normalizedEmail, name ? String(name) : 'Chef']
    );

    const user = userResult.rows[0];
    const passwordHash = await hashPassword(passwordStr);

    await query(
      `INSERT INTO user_passwords (user_id, password_hash)
       VALUES ($1, $2)`,
      [user.id, passwordHash]
    );

    const tokens = await issueTokens(user.id, req);

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/login', async (req: any, res: Response) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password required' });
  }

  try {
    const normalizedEmail = normalizeEmail(String(email));
    const user = await findUserByEmail(normalizedEmail);
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const pwd = await query('SELECT password_hash FROM user_passwords WHERE user_id = $1', [user.id]);
    if (pwd.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await verifyPassword(String(password), String(pwd.rows[0].password_hash));
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const tokens = await issueTokens(user.id, req);

    return res.json({
      user: { id: user.id, email: user.email, name: user.name },
      ...tokens,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

async function verifyProviderToken(provider: AuthProvider, idToken: string) {
  if (provider === 'google') return verifyGoogleIdToken(idToken);
  if (provider === 'microsoft') return verifyMicrosoftIdToken(idToken);
  throw new Error('Unsupported provider');
}

router.post('/oauth/:provider', async (req: any, res: Response) => {
  const provider = String(req.params.provider) as AuthProvider;
  const { idToken } = req.body || {};

  if (!idToken) {
    return res.status(400).json({ message: 'idToken required' });
  }

  try {
    const verified = await verifyProviderToken(provider, String(idToken));

    // 1) Identity exists? -> log in
    const existingIdentity = await query(
      'SELECT user_id FROM user_identities WHERE provider = $1 AND provider_sub = $2',
      [verified.provider, verified.sub]
    );

    if (existingIdentity.rows.length > 0) {
      const userId = String(existingIdentity.rows[0].user_id);
      const user = await query('SELECT id, email, name FROM users WHERE id = $1', [userId]);
      const tokens = await issueTokens(userId, req);
      return res.json({ user: user.rows[0], ...tokens });
    }

    // 2) Email matches an existing user? -> explicit linking required
    if (verified.email) {
      const normalizedEmail = normalizeEmail(verified.email);
      const existingUser = await findUserByEmail(normalizedEmail);
      if (existingUser) {
        return res.status(409).json({
          code: 'LINK_REQUIRED',
          message: 'Account exists. Log in and link this provider in settings.',
          provider: verified.provider,
          email: normalizedEmail,
        });
      }

      // Create new user
      const userResult = await query(
        `INSERT INTO users (email, email_verified, name)
         VALUES ($1, $2, $3)
         RETURNING id, email, name`,
        [normalizedEmail, Boolean(verified.emailVerified), verified.name || 'Chef']
      );

      const user = userResult.rows[0];

      await query(
        `INSERT INTO user_identities (user_id, provider, provider_sub, email, email_verified)
         VALUES ($1, $2, $3, $4, $5)`,
        [user.id, verified.provider, verified.sub, normalizedEmail, Boolean(verified.emailVerified)]
      );

      const tokens = await issueTokens(user.id, req);
      return res.json({ user, ...tokens });
    }

    // 3) No email claim -> create user, attach identity
    const userResult = await query(
      `INSERT INTO users (email, email_verified, name)
       VALUES (NULL, FALSE, $1)
       RETURNING id, email, name`,
      [verified.name || 'Chef']
    );

    const user = userResult.rows[0];

    await query(
      `INSERT INTO user_identities (user_id, provider, provider_sub, email, email_verified)
       VALUES ($1, $2, $3, NULL, FALSE)`,
      [user.id, verified.provider, verified.sub]
    );

    const tokens = await issueTokens(user.id, req);
    return res.json({ user, ...tokens });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid idToken' });
  }
});

router.post('/link', requireAuth, async (req: any, res: Response) => {
  const { provider, idToken } = req.body || {};
  if (!provider || !idToken) {
    return res.status(400).json({ message: 'provider and idToken required' });
  }

  try {
    const verified = await verifyProviderToken(String(provider) as AuthProvider, String(idToken));

    // Identity already linked to someone?
    const existingIdentity = await query(
      'SELECT user_id FROM user_identities WHERE provider = $1 AND provider_sub = $2',
      [verified.provider, verified.sub]
    );

    if (existingIdentity.rows.length > 0 && String(existingIdentity.rows[0].user_id) !== String(req.user?.id)) {
      return res.status(409).json({ message: 'This provider is already linked to another account' });
    }

    // Upsert identity for this user
    await query(
      `INSERT INTO user_identities (user_id, provider, provider_sub, email, email_verified)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (provider, provider_sub)
       DO UPDATE SET user_id = EXCLUDED.user_id, email = EXCLUDED.email, email_verified = EXCLUDED.email_verified, updated_at = NOW()`,
      [
        req.user?.id,
        verified.provider,
        verified.sub,
        verified.email ? normalizeEmail(verified.email) : null,
        Boolean(verified.emailVerified),
      ]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(401).json({ message: 'Invalid idToken' });
  }
});

router.post('/refresh', async (req: any, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken required' });
  }

  try {
    const tokenHash = hashRefreshToken(String(refreshToken));

    const existing = await query(
      `SELECT id, user_id, expires_at, revoked_at, replaced_by
       FROM refresh_tokens
       WHERE token_hash = $1`,
      [tokenHash]
    );

    if (existing.rows.length === 0) {
      return res.status(401).json({ message: 'Invalid refreshToken' });
    }

    const row = existing.rows[0];
    if (row.revoked_at || row.replaced_by) {
      return res.status(401).json({ message: 'Refresh token revoked' });
    }

    if (new Date(row.expires_at).getTime() <= Date.now()) {
      return res.status(401).json({ message: 'Refresh token expired' });
    }

    // Rotate
    const userId = String(row.user_id);
    const { token: newRefreshToken, expiresInSeconds: refreshTokenExpiresInSeconds } = generateRefreshToken();
    const newRefreshTokenHash = hashRefreshToken(newRefreshToken);
    const expiresAt = new Date(Date.now() + refreshTokenExpiresInSeconds * 1000);

    const inserted = await query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent, ip)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id`,
      [userId, newRefreshTokenHash, expiresAt, req.headers['user-agent'] || null, getIp(req)]
    );

    await query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW(), replaced_by = $2
       WHERE id = $1`,
      [row.id, inserted.rows[0].id]
    );

    const { token: accessToken, expiresInSeconds: accessTokenExpiresInSeconds } = await signAccessToken(userId);

    return res.json({
      accessToken,
      refreshToken: newRefreshToken,
      accessTokenExpiresInSeconds,
      refreshTokenExpiresInSeconds,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

router.post('/logout', async (req: any, res: Response) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ message: 'refreshToken required' });
  }

  try {
    const tokenHash = hashRefreshToken(String(refreshToken));
    await query(
      `UPDATE refresh_tokens
       SET revoked_at = NOW()
       WHERE token_hash = $1 AND revoked_at IS NULL`,
      [tokenHash]
    );

    return res.json({ success: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
