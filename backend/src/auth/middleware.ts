import type { RequestHandler } from 'express';
import { verifyAccessToken } from './tokens';

export const requireAuth: RequestHandler = async (req: any, res, next) => {
  try {
    const header = req.headers.authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }

    const token = header.slice('bearer '.length).trim();
    const payload = await verifyAccessToken(token);

    if (!payload.sub) {
      return res.status(401).json({ message: 'Invalid token subject' });
    }

    req.user = { id: String(payload.sub) };
    return next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
};
