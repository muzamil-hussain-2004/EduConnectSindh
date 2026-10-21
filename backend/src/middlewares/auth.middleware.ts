import type { RequestHandler } from 'express';
import type { Role } from '../database/generated/prisma/client';
import { AppError } from '../shared/errors/AppError';
import { verifyAccessToken } from '../shared/utils/token';

// Requires `Authorization: Bearer <accessToken>`; sets req.user.
export const authenticate: RequestHandler = (req, _res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    throw AppError.unauthorized('Missing access token');
  }
  const payload = verifyAccessToken(header.slice(7));
  req.user = { id: payload.sub, role: payload.role };
  next();
};

// Use after `authenticate`: authorize('ADMIN') or authorize('TUTOR', 'ADMIN').
export function authorize(...roles: Role[]): RequestHandler {
  return (req, _res, next) => {
    if (!req.user) throw AppError.unauthorized();
    if (!roles.includes(req.user.role)) throw AppError.forbidden();
    next();
  };
}
