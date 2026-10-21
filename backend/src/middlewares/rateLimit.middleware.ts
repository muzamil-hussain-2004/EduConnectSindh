import type { Options } from 'express-rate-limit';
import { rateLimit } from 'express-rate-limit';
import { env } from '../config/env';
import { AppError } from '../shared/errors/AppError';

function createLimiter(windowMs: number, limit: number, message: string) {
  const options: Partial<Options> = {
    windowMs,
    limit,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    skip: () => env.NODE_ENV === 'test',
    handler: (_req, _res, next) => next(new AppError(429, message, 'TOO_MANY_REQUESTS')),
  };
  return rateLimit(options);
}

// Applied to the whole API: 100 requests per minute per IP.
export const apiLimiter = createLimiter(60_000, 100, 'Too many requests, please slow down');

// For login / register / password reset: stops password guessing (10 per 15 minutes per IP).
export const authLimiter = createLimiter(
  15 * 60_000,
  10,
  'Too many attempts, please try again in 15 minutes',
);
