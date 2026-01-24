import { Router, type Request, type Response } from 'express';
import { query } from '../db';
import crypto from 'crypto';
import { requireAuth } from '../auth/middleware';

const router = Router();

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Request email verification
 * Generates a verification token and stores it in the database
 * In production, this should send an email with the verification link
 */
router.post('/request-verification', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Check if already verified
    const userResult = await query('SELECT email_verified, email FROM users WHERE id = $1', [userId]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    if (user.email_verified) {
      return res.json({ message: 'Email already verified' });
    }

    if (!user.email) {
      return res.status(400).json({ message: 'No email address on account' });
    }

    const token = generateVerificationToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    // Store verification token (in production, send via email service)
    await query(
      `INSERT INTO email_verification_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) 
       DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [userId, token, expiresAt]
    );

    // TODO: In production, send email with verification link
    // const verificationUrl = `${process.env.APP_URL}/verify-email?token=${token}`;
    // await sendEmail(user.email, 'Verify your email', verificationUrl);

    return res.json({
      message: 'Verification email sent',
      // In development, return the token so it can be tested
      ...(process.env.NODE_ENV === 'development' ? { token } : {}),
    });
  } catch (err) {
    req.log.error({ err }, 'Request email verification failed');
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * Verify email with token
 */
router.post('/verify-email', async (req: any, res: Response) => {
  const { token } = req.body || {};
  
  if (!token) {
    return res.status(400).json({ message: 'Token required' });
  }

  try {
    const tokenResult = await query(
      `SELECT user_id, expires_at FROM email_verification_tokens WHERE token = $1`,
      [String(token)]
    );

    if (tokenResult.rows.length === 0) {
      return res.status(404).json({ message: 'Invalid verification token' });
    }

    const tokenData = tokenResult.rows[0];

    if (new Date(tokenData.expires_at).getTime() <= Date.now()) {
      return res.status(400).json({ message: 'Verification token expired' });
    }

    // Mark email as verified
    await query(
      `UPDATE users SET email_verified = TRUE WHERE id = $1`,
      [tokenData.user_id]
    );

    // Delete used token
    await query(
      `DELETE FROM email_verification_tokens WHERE token = $1`,
      [String(token)]
    );

    return res.json({ success: true, message: 'Email verified successfully' });
  } catch (err) {
    req.log.error({ err }, 'Verify email failed');
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

/**
 * Check verification status
 */
router.get('/verification-status', requireAuth, async (req: any, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const userResult = await query(
      'SELECT email_verified, email FROM users WHERE id = $1',
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const user = userResult.rows[0];
    
    return res.json({
      emailVerified: user.email_verified,
      hasEmail: !!user.email,
    });
  } catch (err) {
    req.log.error({ err }, 'Check email verification status failed');
    return res.status(500).json({ message: 'Internal Server Error' });
  }
});

export default router;
