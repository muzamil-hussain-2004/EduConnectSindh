import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { usersRoutes } from './modules/users/users.routes';

// Every module mounts here; the whole API lives under /api/v1.
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', usersRoutes);
