import type { NextFunction, Request, Response } from 'express';
import { db, tokenHash } from './database.js';
import type { UserRow } from './domain.js';

export interface AuthenticatedRequest extends Request {
  user: UserRow;
}

export function authenticate(request: Request, response: Response, next: NextFunction) {
  const authorization = request.header('authorization');
  if (!authorization?.startsWith('Bearer ')) return response.status(401).json({ error: 'Authentication required' });
  const token = authorization.slice(7).trim();
  const user = db.prepare('SELECT * FROM users WHERE token_hash = ?').get(tokenHash(token)) as UserRow | undefined;
  if (!user) return response.status(401).json({ error: 'Invalid or expired session' });
  (request as AuthenticatedRequest).user = user;
  next();
}

export function userFromToken(token: string | null) {
  if (!token) return undefined;
  return db.prepare('SELECT * FROM users WHERE token_hash = ?').get(tokenHash(token)) as UserRow | undefined;
}
