import type { Request } from 'express';

export type AuthProvider = 'google' | 'microsoft';

export interface AuthenticatedUser {
  id: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
