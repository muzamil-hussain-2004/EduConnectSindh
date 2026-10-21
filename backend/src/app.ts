import compression from 'compression';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import { env, isProduction } from './config/env';
import { prisma } from './config/database';
import { logger } from './config/logger';
import { openApiSpec } from './config/swagger';
import { errorHandler, notFoundHandler } from './middlewares/error.middleware';
import { apiLimiter } from './middlewares/rateLimit.middleware';

export function createApp() {
  const app = express();

  // Behind a proxy/load balancer in production, so rate limiting sees the real client IP.
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use(pinoHttp({ logger }));
  app.use(helmet());
  app.use(cors({ origin: env.CLIENT_URL, credentials: true }));
  app.use(compression());
  app.use(apiLimiter);
  app.use(express.json({ limit: '1mb' }));

  // Interactive API docs; hidden in production.
  if (!isProduction) {
    app.get('/api/docs.json', (_req, res) => res.json(openApiSpec));
    app.use(
      '/api/docs',
      swaggerUi.serve,
      swaggerUi.setup(openApiSpec, { customSiteTitle: 'EduConnect API' }),
    );
  }

  app.get('/health', async (_req, res) => {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      database: 'up',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    });
  });

  // Must stay last: unmatched routes -> 404, then every error -> one JSON shape.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
