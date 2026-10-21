import { Router } from 'express';
import { authRoutes } from './modules/auth/auth.routes';
import { catalogRoutes } from './modules/locations/catalog.routes';
import { tutorsRoutes } from './modules/tutors/tutors.routes';
import { usersRoutes } from './modules/users/users.routes';

// Every module mounts here; the whole API lives under /api/v1.
export const apiRoutes = Router();

apiRoutes.use('/auth', authRoutes);
apiRoutes.use('/users', usersRoutes);
apiRoutes.use('/tutors', tutorsRoutes);
apiRoutes.use('/catalog', catalogRoutes);
