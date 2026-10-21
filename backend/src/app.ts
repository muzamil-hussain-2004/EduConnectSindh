import express from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from './config/logger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';

export function createApp() {
  const app = express();

  app.use(pinoHttp({ logger }));
  app.use(express.json({ limit: '1mb' }));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Must stay last: unmatched routes -> 404, then every error -> one JSON shape.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
