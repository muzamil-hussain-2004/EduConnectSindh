import type { CookieOptions, Request, Response } from 'express';
import { env, isProduction } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';
import { parseDurationMs } from '../../shared/utils/token';
import { authService } from './auth.service';

const REFRESH_COOKIE = 'refreshToken';

// httpOnly: JavaScript in the browser can never read it. Only sent to the auth routes.
const cookieOptions: CookieOptions = {
  httpOnly: true,
  // Browsers only accept SameSite=None cookies over HTTPS, so it forces `secure`.
  secure: isProduction || env.COOKIE_SAME_SITE === 'none',
  sameSite: env.COOKIE_SAME_SITE,
  path: '/api/v1/auth',
};

function sendSession(
  res: Response,
  status: number,
  session: { user: unknown; accessToken: string; refreshToken: string },
) {
  res.cookie(REFRESH_COOKIE, session.refreshToken, {
    ...cookieOptions,
    maxAge: parseDurationMs(env.JWT_REFRESH_EXPIRES_IN),
  });
  res.status(status).json({
    success: true,
    data: { user: session.user, accessToken: session.accessToken },
  });
}

const refreshTokenFrom = (req: Request): string | undefined => req.cookies?.[REFRESH_COOKIE];

export const authController = {
  async register(req: Request, res: Response) {
    sendSession(res, 201, await authService.register(req.body));
  },

  async login(req: Request, res: Response) {
    sendSession(res, 200, await authService.login(req.body));
  },

  async refresh(req: Request, res: Response) {
    sendSession(res, 200, await authService.refresh(refreshTokenFrom(req)));
  },

  async logout(req: Request, res: Response) {
    await authService.logout(refreshTokenFrom(req));
    res.clearCookie(REFRESH_COOKIE, cookieOptions);
    res.json({ success: true, data: null });
  },

  async me(req: Request, res: Response) {
    if (!req.user) throw AppError.unauthorized();
    res.json({ success: true, data: { user: await authService.me(req.user.id) } });
  },
};
