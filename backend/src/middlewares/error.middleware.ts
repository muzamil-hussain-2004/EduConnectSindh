import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { isProduction } from '../config/env';
import { logger } from '../config/logger';
import { AppError } from '../shared/errors/AppError';

export const notFoundHandler: RequestHandler = (req, _res, next) => {
  next(AppError.notFound(`Route not found: ${req.method} ${req.originalUrl}`));
};

// Express recognises an error handler by its 4 parameters, so `_next` must stay.
export const errorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  let statusCode = 500;
  let code = 'INTERNAL_ERROR';
  let message = 'Something went wrong';
  let details: unknown;

  if (err instanceof AppError) {
    ({ statusCode, code, message, details } = err);
  } else if (err instanceof ZodError) {
    statusCode = 400;
    code = 'VALIDATION_ERROR';
    message = 'Validation failed';
    details = err.issues.map((i) => ({ field: i.path.join('.'), message: i.message }));
  } else if (err?.type === 'entity.parse.failed') {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body is not valid JSON';
  } else if (err?.type === 'entity.too.large') {
    statusCode = 413;
    code = 'PAYLOAD_TOO_LARGE';
    message = 'Request body is too large';
  } else if (err?.name === 'MulterError') {
    const tooLarge = err.code === 'LIMIT_FILE_SIZE';
    statusCode = tooLarge ? 413 : 400;
    code = tooLarge ? 'FILE_TOO_LARGE' : 'UPLOAD_ERROR';
    message = tooLarge ? 'File is too large (max 5 MB)' : 'Invalid file upload';
  }

  if (statusCode >= 500) {
    (req.log ?? logger).error({ err }, 'Unhandled error');
    // Never leak internals in production.
    if (!isProduction) message = err?.message ?? message;
  }

  res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
};
