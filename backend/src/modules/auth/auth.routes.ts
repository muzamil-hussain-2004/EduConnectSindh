import { Router } from 'express';
import { authenticate } from '../../middlewares/auth.middleware';
import { authLimiter } from '../../middlewares/rateLimit.middleware';
import { validateBody } from '../../middlewares/validate.middleware';
import { authController } from './auth.controller';
import { loginSchema, registerSchema } from './auth.schema';

export const authRoutes = Router();

authRoutes.post('/register', authLimiter, validateBody(registerSchema), authController.register);
authRoutes.post('/login', authLimiter, validateBody(loginSchema), authController.login);
authRoutes.post('/refresh', authLimiter, authController.refresh);
authRoutes.post('/logout', authController.logout);
authRoutes.get('/me', authenticate, authController.me);
