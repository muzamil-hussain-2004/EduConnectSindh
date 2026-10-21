import pino from 'pino';
import { env, isProduction } from './env';

// Pretty, colored logs in development; raw JSON in production (machine-readable).
export const logger = pino({
  level: env.NODE_ENV === 'test' ? 'silent' : isProduction ? 'info' : 'debug',
  redact: ['req.headers.authorization', 'req.headers.cookie'],
  transport: isProduction
    ? undefined
    : { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } },
});
