import type { RequestHandler } from 'express';
import type { ZodType } from 'zod';

// Validates and replaces req.body; a ZodError is turned into a 400 by the error handler.
export function validateBody(schema: ZodType): RequestHandler {
  return (req, _res, next) => {
    req.body = schema.parse(req.body);
    next();
  };
}
