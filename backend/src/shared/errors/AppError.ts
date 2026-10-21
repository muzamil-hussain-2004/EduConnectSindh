export type ErrorDetails = Record<string, unknown> | unknown[];

// An error we expect and can explain to the client (wrong password, not found, ...).
export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code: string = 'ERROR',
    public readonly details?: ErrorDetails,
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message = 'Bad request', details?: ErrorDetails) {
    return new AppError(400, message, 'BAD_REQUEST', details);
  }

  static unauthorized(message = 'Authentication required') {
    return new AppError(401, message, 'UNAUTHORIZED');
  }

  static forbidden(message = 'You do not have permission to do this') {
    return new AppError(403, message, 'FORBIDDEN');
  }

  static notFound(message = 'Resource not found') {
    return new AppError(404, message, 'NOT_FOUND');
  }

  static conflict(message = 'Resource already exists') {
    return new AppError(409, message, 'CONFLICT');
  }
}
