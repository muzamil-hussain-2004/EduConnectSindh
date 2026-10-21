import crypto from 'node:crypto';
import type { SignOptions } from 'jsonwebtoken';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import type { Role } from '../../database/generated/prisma/client';
import { AppError } from '../errors/AppError';

export interface AccessTokenPayload {
  sub: string;
  role: Role;
}

export function signAccessToken(user: { id: string; role: Role }): string {
  return jwt.sign({ role: user.role }, env.JWT_ACCESS_SECRET, {
    subject: user.id,
    expiresIn: env.JWT_ACCESS_EXPIRES_IN as SignOptions['expiresIn'],
  });
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    if (typeof payload === 'string' || !payload.sub || !payload.role) {
      throw new Error('Malformed token');
    }
    return { sub: payload.sub, role: payload.role as Role };
  } catch {
    throw AppError.unauthorized('Invalid or expired access token');
  }
}

// Refresh tokens are random opaque strings, not JWTs, so they can be revoked server-side.
export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

// Only this hash is stored in the database; a DB leak cannot be used to log in.
export function hashToken(token: string): string {
  return crypto.createHmac('sha256', env.JWT_REFRESH_SECRET).update(token).digest('hex');
}

const UNIT_MS = { s: 1_000, m: 60_000, h: 3_600_000, d: 86_400_000 } as const;

export function parseDurationMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) throw new Error(`Invalid duration "${value}" (use e.g. 15m, 7d)`);
  return Number(match[1]) * UNIT_MS[match[2] as keyof typeof UNIT_MS];
}
